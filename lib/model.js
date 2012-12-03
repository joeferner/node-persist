'use strict';

var inflection = require('./inflection');
var Query = require('./query');
var util = require('util');
var persistUtil = require('./persist_utils');
var events = require("events");
var Connection = require('./connection');

function copyValuesIntoObject (values, obj) {
  var valKey;
  for (valKey in values) {
    var setter = obj.__lookupSetter__(valKey);
    if (setter) {
      setter(values[valKey]);
    } else {
      obj[valKey] = values[valKey];
    }
  }
}

function normalizeType (typeName) {
  return typeName; // TODO: all lower case, verify string, etc.
}

function doesObjectHaveAConnection (obj) {
  if (!obj._getConnection) {
    return false;
  }
  if (obj._getConnection && !obj._getConnection()) {
    return false;
  }
  return true;
}

function addHasManyAssociationMethod (obj, associationName, association) {
  // create getter to allow this... person1.phones.all(function() {});
  //   where model == 'Person' and associationName == 'phone'
  // if phone has a single person and person has many phones the sql would be something like:
  //   SELECT * FROM phones WHERE person_id = 5
  // if phone has many person and person has many phones the sql would be something like:
  //   SELECT * FROM phones
  //     INNER JOIN person_phone ON person_phone.phone_id = phones.id
  //     WHERE person_phone.person_id = 5
  obj.__defineGetter__(associationName, function () {
    if (!doesObjectHaveAConnection(obj)) {
      return [];
    }
    var query = new Query(obj._getConnection(), association.model);
    if (association.through) {
      query = query.join(association.through, association.manyToManyForeignKey, association.model.getIdColumn().dbColumnName);
    }
    return query.where(association.foreignKey + " = ?", obj.getId());
  });
  obj.__defineSetter__(associationName, function (val) {
    obj['_' + associationName] = val;
  });
}

function addHasOneAssociationMethod (obj, associationName, association) {
  var foreignKeyPropertyName = inflection.camelize(association.foreignKey, true);

  // foreignKeyPropertyName = personId
  // associationName = person

  obj.__defineGetter__(foreignKeyPropertyName, function () {
    var result = null;
    if (obj['_' + foreignKeyPropertyName]) {
      result = obj['_' + foreignKeyPropertyName];
    }
    if (obj['_' + associationName] && obj['_' + associationName].getId) {
      result = obj['_' + associationName].getId();
    }
    return result;
  });
  obj.__defineSetter__(foreignKeyPropertyName, function (val) {
    obj['_' + foreignKeyPropertyName] = val;
    obj['_' + associationName] = null;
  });

  obj.__defineGetter__(associationName, function () {
    // value was set on the object so treat it as a normal property
    if (obj['_' + associationName]) {
      return obj['_' + associationName];
    }

    // object didn't come from the database so we can't fetch the query.
    if (!doesObjectHaveAConnection(obj)) {
      return null;
    }

    // value was not set on the object so we need to query for it.
    var query = new Query(obj._getConnection(), association.model);
    var foreignKey = obj['_' + foreignKeyPropertyName];
    var idColumn = association.model.getIdColumn().dbColumnName;
    var result = query.where(idColumn + " = ?", foreignKey);
    return result;
  });
  obj.__defineSetter__(associationName, function (val) {
    obj['_' + foreignKeyPropertyName] = null;
    obj['_' + associationName] = val;
  });
}

function addAssociationMethod (obj, associationName, association) {
  switch (association.type) {
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

function addAssociationMethods (obj) {
  var associationName;
  for (associationName in obj._getModel().associations) {
    var association = obj._getModel().associations[associationName];
    addAssociationMethod(obj, associationName, association);
  }
}

function createColumnPropertiesOnObject (obj) {
  var columnName;
  for (columnName in obj._getModel().columns) {
    var column = obj._getModel().columns[columnName];
    if (!obj.hasOwnProperty(columnName)) {
      if (!column.foreignKey) {
        obj[columnName] = column.defaultValue();
      }
    }
  }
}

function ensurePrimaryKeyColumn (model) {
  if (model.getIdColumn()) {
    return;
  }
  var coldef = model.columns['id'] || {};
  coldef.type = coldef.type || "integer";
  coldef.primaryKey = coldef.primaryKey || true;
  coldef.autoIncrement = coldef.autoIncrement || true;
  model.addColumn("id", coldef);
}

function addColumns (model, columnDefs) {
  var propertyName;
  for (propertyName in columnDefs) {
    model.addColumn(propertyName, columnDefs[propertyName]);
  }
  ensurePrimaryKeyColumn(model);
}

exports.define = function (name, columnDefs, opts) {
  opts = opts || {};

  var Model = function (values) {
    this._getModel = function () { return Model; }; // hide from JSON.stringify

    this.save = function (connection, callback) {
      if (!connection) {
        throw new Error("connection is null or undefined");
      }
      if (!connection.update) {
        throw new Error("argument 1 to save does not appear to be a connection");
      }

      if (this._isPersisted()) {
        connection.update(this, callback);
      } else {
        connection.save(this, callback);
      }
    };
    this.save = persistUtil.bind('save', this.save, this);

    this.update = function (connection, props, callback) {
      copyValuesIntoObject(props, this);
      this.save(connection, callback);
    };
    this.update = persistUtil.bind('update', this.update, this);

    this.delete = function (connection, callback) {
      var self = this;
      this._getModel().emit("beforeDelete", this);
      var query = new Query(connection, this._getModel());
      query.where(this._getModel().getIdColumn().dbColumnName + " = ?", this[this._getModel().getIdPropertyName()]);
      query.deleteAll(function () {
        self._getModel().emit("afterDelete", self);
        callback.apply(self, arguments);
      });
    };
    this.delete = persistUtil.bind('delete', this.delete, this);

    this.getId = function () {
      return this[this._getModel().getIdPropertyName()];
    };
    this.getId = persistUtil.bind('getId', this.getId, this);

    this._isPersisted = function () { return false; };

    addAssociationMethods(this);
    if (values) {
      copyValuesIntoObject(values, this);
    }
    createColumnPropertiesOnObject(this);

    return this;
  };

  Model.modelName = name;
  Model.tableName = opts.tableName || inflection.pluralize(name);
  Model.associations = {};
  Model.columns = {};

  Model.eventEmmiter = new events.EventEmitter();
  var n;
  for (n in events.EventEmitter.prototype) {
    Model[n] = events.EventEmitter.prototype[n];
    /*
     Model[n] = function() {
     Model.eventEmmiter.apply(Model.eventEmmiter, arguments);
     }*/
  }

  Model.normalizeColumnDef = function (propertyName, columnDef) {
    if (!columnDef) {
      throw new Error(util.format('Invalid column definition for property "%s" of model "%s"', propertyName, this.modelName));
    }
    if (typeof (columnDef) === "string") {
      columnDef = {
        type: normalizeType(columnDef)
      };
    }

    if (!columnDef.hasOwnProperty('defaultValue')) {
      columnDef.defaultValue = function () { return null; };
    } else {
      if (typeof (columnDef.defaultValue) !== "function") {
        var val = columnDef.defaultValue;
        columnDef.defaultValue = function () { return val; };
      }
    }

    if (!columnDef.dbColumnName) {
      columnDef.dbColumnName = inflection.underscore(propertyName);
    }

    return columnDef;
  };

  Model.addColumn = function (propertyName, columnDef) {
    var col = this.normalizeColumnDef(propertyName, columnDef);
    this.columns[propertyName] = col;
  };

  Model.getIdColumn = function () {
    var name;
    for (name in this.columns) {
      if (this.columns[name].primaryKey) {
        return this.columns[name];
      }
    }
    return null;
  };

  Model.getIdPropertyName = function () {
    var name;
    for (name in this.columns) {
      if (this.columns[name].primaryKey) {
        return name;
      }
    }
    return null;
  };

  Model.normalizeHasManyOptions = function (associatedModel, opts) {
    var foreignKey = inflection.foreignKey(this.modelName);
    opts = opts || {};
    opts.type = "hasMany";
    opts.model = associatedModel;
    opts.foreignKey = opts.foreignKey || foreignKey;
    return opts;
  };

  Model.hasMany = function (associatedModel, opts) {
    opts = this.normalizeHasManyOptions(associatedModel, opts);
    if(!associatedModel || !associatedModel.modelName) {
      throw new Error("Could not find associated model");
    }
    var name = opts.name || inflection.camelize(inflection.pluralize(associatedModel.modelName), true);
    if (this.associations[name]) {
      return this;
    }
    this.associations[name] = opts;

    if (opts.through) {
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

  Model.normalizeHasOneOptions = function (associatedModel, opts) {
    var foreignKey = inflection.foreignKey(inflection.singularize(associatedModel.modelName));
    opts = opts || {};
    opts.type = "hasOne";
    opts.model = associatedModel;
    opts.foreignKey = opts.foreignKey || foreignKey;
    return opts;
  };

  Model.hasOne = function (associatedModel, opts) {
    opts = this.normalizeHasOneOptions(associatedModel, opts);
    var name = opts.name || inflection.camelize(inflection.singularize(associatedModel.modelName), true);
    if (this.associations[name]) {
      return this;
    }
    this.associations[name] = opts;

    var foreignKeyPropertyName = inflection.camelize(opts.foreignKey, true);
    this.addColumn(foreignKeyPropertyName, { type: "int", foreignKey: true });

    if(!opts.hasOwnProperty('createHasMany') || opts.createHasMany) {
      var associatedOpts = persistUtil.shallowCopy(opts);
      delete associatedOpts.foreignKey;
      associatedModel.hasMany(this, associatedOpts);
    }

    return this;
  };

  Model.using = function (connection) {
    return new Query(connection, this);
  };

  // connection, id, data, callback
  // id, data (chaining)
  Model.update = function () {
    var id;
    var data;

    // id, data (chaining)
    if (arguments.length === 2) {
      id = arguments[0];
      data = arguments[1];
      var self = this;
      return persistUtil.bind('update', function (conn, callback) {
        self.update(conn, id, data, callback);
      }, this);
    }

    // non-chaining
    if (!(arguments[0] instanceof Connection)) {
      throw new Error("argument 1 to update does not appear to be a connection");
    }
    var connection = arguments[0];
    if (!connection) { throw new Error("connection is null or undefined"); }
    id = arguments[1];
    data = arguments[2];
    var callback = arguments[3];

    connection.updatePartial(this, id, data, callback);
    return null;
  };

  // connection, data, callback
  // data, callback (chaining)
  Model.updateAll = function () {
    var id;
    var data;

    // data, callback (chaining)
    if (arguments.length === 2) {
      data = arguments[0];
      var self = this;
      return persistUtil.bind('update', function (conn, callback) {
        self.update(conn, data, callback);
      }, this);
    }

    // non-chaining
    if (!(arguments[0] instanceof Connection)) {
      throw new Error("argument 1 to update does not appear to be a connection");
    }
    var connection = arguments[0];
    if (!connection) { throw new Error("connection is null or undefined"); }
    data = arguments[1];
    var callback = arguments[2];

    this.using(connection).updateAll(data, callback);
    return null;
  };

  // connection, id, callback
  // id (chaining)
  Model.getById = function () {
    var self = this;
    var id;
    if (arguments.length === 1) {
      id = arguments[0];
      return function (connection, callback) {
        var query = self.using(connection);
        return query.getById(id, callback);
      };
    } else {
      var connection = arguments[0];
      id = arguments[1];
      var callback = arguments[2];
      var query = self.using(connection);
      return query.getById(id, callback);
    }
  };

  Model.count = function (connection, callback) {
    return this.using(connection).count(callback);
  };
  Model.count = persistUtil.bind('count', Model.count, Model);

  Model.orderBy = function () {
    var query = this.using(null);
    return query.orderBy.apply(query, arguments);
  };
  Model.orderBy = persistUtil.bind('orderBy', Model.orderBy, Model);

  Model.limit = function () {
    var query = this.using(null);
    return query.limit.apply(query, arguments);
  };
  Model.limit = persistUtil.bind('limit', Model.limit, Model);

  Model.where = function () {
    var query = this.using(null);
    return query.where.apply(query, arguments);
  };
  Model.where = persistUtil.bind('where', Model.where, Model);

  Model.whereIn = function () {
    var query = this.using(null);
    return query.whereIn.apply(query, arguments);
  };
  Model.whereIn = persistUtil.bind('whereIn', Model.whereIn, Model);

  Model.include = function () {
    var query = this.using(null);
    return query.include.apply(query, arguments);
  };
  Model.include = persistUtil.bind('include', Model.include, Model);

  Model.all = function (connection, callback) {
    var query = this.using(connection);
    return query.all.apply(query, arguments);
  };
  Model.all = persistUtil.bind('all', Model.all, Model);

  Model.each = function (connection, callback) {
    var query = this.using(connection);
    return query.each.apply(query, arguments);
  };
  Model.each = persistUtil.bind('each', Model.each, Model);

  Model.first = function (connection, callback) {
    var query = this.using(connection);
    return query.first.apply(query, arguments);
  };
  Model.first = persistUtil.bind('first', Model.first, Model);

  Model.last = function (connection, callback) {
    var query = this.using(connection);
    return query.last.apply(query, arguments);
  };
  Model.last = persistUtil.bind('last', Model.last, Model);

  Model.deleteAll = function (connection, callback) {
    var query = this.using(connection);
    return query.deleteAll.apply(query, arguments);
  };
  Model.deleteAll = persistUtil.bind('deleteAll', Model.deleteAll, Model);

  Model.min = function (fieldName) {
    var query = this.using(null);
    return query.min.apply(query, arguments);
  };
  Model.min = persistUtil.bind('min', Model.min, Model);

  Model.max = function (fieldName) {
    var query = this.using(null);
    return query.max.apply(query, arguments);
  };
  Model.max = persistUtil.bind('max', Model.max, Model);

  Model.sum = function (fieldName) {
    var query = this.using(null);
    return query.sum.apply(query, arguments);
  };
  Model.sum = persistUtil.bind('sum', Model.sum, Model);

  addColumns(Model, columnDefs);

  return Model;
};
