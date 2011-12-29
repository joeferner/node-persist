var inflection = require('./inflection');
var Query = require('./query');
var util = require('util');
var persistUtil = require('./persist_utils');
var events = require("events");

function normalizeType(typeName) {
  return typeName; // TODO: all lower case, verify string, etc.
}

function normalizeColumnDef(propertyName, columnDef) {
  if(!columnDef) {
    throw new Error(util.format('Invalid column definition for property "%s" of model "%s"', propertyName, this.modelName));
  }
  if(typeof(columnDef) == "string") {
    columnDef = {
      type: normalizeType(columnDef)
    };
  }

  if(!columnDef.defaultValue) {
    columnDef.defaultValue = function() { return null; };
  } else {
    if(typeof(columnDef.defaultValue) != "function") {
      var val = columnDef.defaultValue;
      columnDef.defaultValue = function() { return val; };
    }
  }

  if(!columnDef.dbColumnName) {
    columnDef.dbColumnName = inflection.underscore(propertyName);
  }

  return columnDef;
}

function saveInstance(connection, callback) {
  if(!connection) throw new Error("connection is null or undefined");
  if(!connection.update) throw new Error("argument 1 to save does not appear to be a connection");

  var self = this;
  this._model().emit("beforeSave", this);
  if(this._persisted && this._persisted()) {
    self._model().emit("beforeUpdate", self);
    connection.update(this, function() {
      self._model().emit("afterUpdate", self);
      self._model().emit("afterSave", self);
      callback.apply(self, arguments);
    });
  } else {
    this._model().emit("beforeCreate", this);
    connection.save(this, function() {
      self._model().emit("afterCreate", self);
      self._model().emit("afterSave", self);
      callback.apply(self, arguments);
    });
  }
}

function updateInstance(connection, props, callback) {
  copyValuesIntoObject(props, this);
  this.save(connection, callback);
}

function deleteInstance(connection, callback) {
  var self = this;
  this._model().emit("beforeDelete", this);
  var query = new Query(connection, this._model());
  query.where("id = ?", this[this._model().getIdPropertyName()]);
  query.deleteAll(function() {
    self._model().emit("afterDelete", self);
    callback.apply(self, arguments);
  });
}

function doesObjectHaveAConnection(obj) {
  if(!obj._connection) {
    return false;
  }
  if(obj._connection && !obj._connection()) {
    return false;
  }
  return true;
}

function addHasManyAssociationMethod(obj, associationName, association) {
  // create getter to allow this... person1.phones.all(function() {});
  //   where model == 'Person' and associationName == 'phone'
  // if phone has a single person and person has many phones the sql would be something like:
  //   SELECT * FROM phones WHERE person_id = 5
  // if phone has many person and person has many phones the sql would be something like:
  //   SELECT * FROM phones
  //     INNER JOIN person_phone ON person_phone.phone_id = phones.id
  //     WHERE person_phone.person_id = 5
  obj.__defineGetter__(associationName, function() {
    if(!doesObjectHaveAConnection(obj)) {
      return [];
    }
    var query = new Query(obj._connection(), association.model);
    if(association.through) {
      query = query.join(association.through, association.manyToManyForeignKey, association.model.getIdColumn().dbColumnName)
    }
    return query.where(association.foreignKey + " = ?", obj.getId());
  });
  obj.__defineSetter__(associationName, function(val){
    obj['_' + associationName] = val;
  });
}

function addHasOneAssociationMethod(obj, associationName, association) {
  var self = this;
  var foreignKeyPropertyName = inflection.camelize(association.foreignKey, true);

  // foreignKeyPropertyName = personId
  // associationName = person

  obj.__defineGetter__(foreignKeyPropertyName, function(){
    var result = null;
    if(obj['_' + foreignKeyPropertyName]) {
      result = obj['_' + foreignKeyPropertyName];
    }
    if(obj['_' + associationName] && obj['_' + associationName].getId) {
      result = obj['_' + associationName].getId();
    }
    return result;
  });
  obj.__defineSetter__(foreignKeyPropertyName, function(val){
    obj['_' + foreignKeyPropertyName] = val;
    obj['_' + associationName] = null;
  });

  obj.__defineGetter__(associationName, function() {
    // value was set on the object so treat it as a normal property
    if(obj['_' + associationName]) {
      return obj['_' + associationName];
    }

    // object didn't come from the database so we can't fetch the query.
    if(!doesObjectHaveAConnection(obj)) {
      return null;
    }

    // value was not set on the object so we need to query for it.
    var query = new Query(obj._connection(), association.model);
    var foreignKey = obj['_' + foreignKeyPropertyName];
    var idColumn = association.model.getIdColumn().dbColumnName;
    var result = query.where(idColumn + " = ?", foreignKey);
    return result;
  });
  obj.__defineSetter__(associationName, function(val) {
    obj['_' + foreignKeyPropertyName] = null;
    obj['_' + associationName] = val;
  });
}

function addAssociationMethod(obj, associationName, association) {
  switch(association.type) {
    case "hasMany":
      addHasManyAssociationMethod(obj, associationName, association);
      break;
    case "hasOne":
      addHasOneAssociationMethod(obj, associationName, association);
      break;
    default:
      throw new Error("Invalid association type '" + association.type + "'");
  }
}

function addAssociationMethods(obj) {
  for(var associationName in obj._model().associations) {
    var association = obj._model().associations[associationName];
    addAssociationMethod(obj, associationName, association);
  }
}

function copyValuesIntoObject(values, obj) {
  for(var valKey in values) {
    var setter = obj.__lookupSetter__(valKey);
    if(setter) {
      setter(values[valKey]);
    } else {
      obj[valKey] = values[valKey];
    }
  }
}

function createColumnPropertiesOnObject(obj) {
  for(var columnName in obj._model().columns) {
    var column = obj._model().columns[columnName];
    if(!obj[columnName]) {
      if(!column.foreignKey) {
        obj[columnName] = column.defaultValue();
      }
    }
  }
}

function addColumn(propertyName, columnDef) {
  var col = this.normalizeColumnDef(propertyName, columnDef);
  this.columns[propertyName] = col;
};

function getIdPropertyName() {
  for(var name in this.columns) {
    if(this.columns[name].primaryKey) {
      return name;
    }
  }
  return null;
}

function getIdColumn() {
  for(var name in this.columns) {
    if(this.columns[name].primaryKey) {
      return this.columns[name];
    }
  }
  return null;
}

function getId() {
  return this[this._model().getIdPropertyName()];
}

function normalizeHasManyOptions(associatedModel, opts) {
  var foreignKey = inflection.foreignKey(this.modelName);
  opts = opts || {};
  opts.type = "hasMany";
  opts.model = associatedModel;
  opts.foreignKey = opts.foreignKey || foreignKey;
  return opts;
}

function hasMany(associatedModel, opts) {
  opts = this.normalizeHasManyOptions(associatedModel, opts);
  var name = inflection.camelize(inflection.pluralize(associatedModel.modelName), true);
  if(this.associations[name]) {
    return this;
  }
  this.associations[name] = opts;

  if(opts.through) {
    opts.manyToManyForeignKey = opts.manyToManyForeignKey || inflection.foreignKey(associatedModel.modelName);
    var associatedOpts = persistUtil.shallowCopy(opts);
    delete associatedOpts.manyToManyForeignKey;
    delete associatedOpts.foreignKey;
    associatedModel.hasMany(this, associatedOpts);
  } else {
    associatedModel.hasOne(this);
  }

  return this;
};

function normalizeHasOneOptions(associatedModel, opts) {
  var foreignKey = inflection.foreignKey(associatedModel.modelName);
  opts = opts || {};
  opts.type = "hasOne";
  opts.model = associatedModel;
  opts.foreignKey = opts.foreignKey || foreignKey;
  return opts;
}

function hasOne(associatedModel, opts) {
  opts = this.normalizeHasOneOptions(associatedModel, opts);
  var name = inflection.camelize(associatedModel.modelName, true);
  if(this.associations[name]) {
    return this;
  }
  this.associations[name] = opts;

  var foreignKeyPropertyName = inflection.camelize(opts.foreignKey, true);
  this.addColumn(foreignKeyPropertyName, { type: "int", foreignKey: true });

  var associatedOpts = persistUtil.shallowCopy(opts);
  delete associatedOpts.foreignKey;
  associatedModel.hasMany(this, associatedOpts);

  return this;
};

function using(connection) {
  return new Query(connection, this);
};

function ensurePrimaryKeyColumn(model) {
  // todo: only add if they haven't defined one yet
  model.addColumn("id", { type: "integer", primaryKey: true, autoIncrement: true });
}

function addColumns(model, columnDefs) {
  for(var propertyName in columnDefs) {
    model.addColumn(propertyName, columnDefs[propertyName]);
  }
  ensurePrimaryKeyColumn(model);
}

function count(connection, callback) {
  return this.using(connection).count(callback);
}

function orderBy() {
  var query = this.using(null);
  return query.orderBy.apply(query, arguments);
}

function where() {
  var query = this.using(null);
  return query.where.apply(query, arguments);
}

function include() {
  var query = this.using(null);
  return query.include.apply(query, arguments);
}

function all(connection, callback) {
  var query = this.using(connection);
  return query.all.apply(query, arguments);
}

function first(connection, callback) {
  var query = this.using(connection);
  return query.first.apply(query, arguments);
}

function deleteAll(connection, callback) {
  var query = this.using(connection);
  return query.deleteAll.apply(query, arguments);
}

function min(fieldName) {
  var query = this.using(null);
  return query.min.apply(query, arguments);
}

function max(fieldName) {
  var query = this.using(null);
  return query.max.apply(query, arguments);
}

function update(connection, id, data, callback) {
  if(!connection) throw new Error("connection is null or undefined");
  if(!connection.update) throw new Error("argument 1 to save does not appear to be a connection");

  connection.updatePartial(this, id, data, callback);
}

exports.define = function(name, columnDefs) {
  var Model = function(values) {
    this._model = function() { return Model; } // hide from JSON.stringify
    this.save = persistUtil.bind('save', saveInstance, this);
    this.update = persistUtil.bind('update', updateInstance, this);
    this.delete = persistUtil.bind('delete', deleteInstance, this);
    this.getId = persistUtil.bind('getId', getId, this);

    addAssociationMethods(this);
    if(values) {
      copyValuesIntoObject(values, this);
    }
    createColumnPropertiesOnObject(this);

    return this;
  };

  Model.modelName = name;
  Model.tableName = inflection.pluralize(name);
  Model.associations = {};
  Model.columns = {};

  Model.eventEmmiter = new events.EventEmitter();
  for(var n in events.EventEmitter.prototype) {
    Model[n] = events.EventEmitter.prototype[n];
    /*
    Model[n] = function() {
      Model.eventEmmiter.apply(Model.eventEmmiter, arguments);
    }*/
  }

  Model.normalizeColumnDef = normalizeColumnDef;
  Model.addColumn = addColumn;
  Model.getIdColumn = getIdColumn;
  Model.getIdPropertyName = getIdPropertyName;
  Model.normalizeHasManyOptions = normalizeHasManyOptions;
  Model.hasMany = hasMany;
  Model.normalizeHasOneOptions = normalizeHasOneOptions;
  Model.hasOne = hasOne;
  Model.using = using;
  Model.update = update;

  Model.include = persistUtil.bind('include', include, Model);
  Model.count = persistUtil.bind('count', count, Model);
  Model.where = persistUtil.bind('where', where, Model);
  Model.orderBy = persistUtil.bind('orderBy', orderBy, Model);
  Model.all = persistUtil.bind('all', all, Model);
  Model.first = persistUtil.bind('first', first, Model);
  Model.deleteAll = persistUtil.bind('deleteAll', deleteAll, Model);
  Model.min = persistUtil.bind('min', min, Model);
  Model.max = persistUtil.bind('max', max, Model);

  addColumns(Model, columnDefs);

  return Model;
}
