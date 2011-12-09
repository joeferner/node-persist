var inflection = require('./inflection');
var Query = require('./query');
var util = require('util');

var Model = function() {

}

Model.normalizeType = function(typeName) {
  return typeName; // TODO: all lower case, verify string, etc.
}

Model.normalizeColumnDef = function(columnDef) {
  if(typeof(columnDef) == "string") {
    columnDef = {
      type: Model.normalizeType(columnDef)
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

  return columnDef;
}

function saveInstance(connection, callback) {
  if(this._persisted) {
    connection.update(this, callback);
  } else {
    connection.save(this, callback);
  }
}

function deleteInstance(connection, callback) {
  var query = new Query(connection, this._model);
  query.where("id = ?", this[this._model.getIdPropertyName()]);
  query.deleteAll(callback);
}

function getId() {
  return this[this._model.getIdPropertyName()];
}

function addHasManyAssociationMethod(obj, associationName, association) {
  obj.__defineGetter__(associationName, function() {
    if(!obj._connection) {
      return [];
    }
    var query = new Query(obj._connection, association.model);
    return query.where(association.foreignKey + " = ?", obj.getId());
  });
}

function addHasOneAssociationMethod(obj, associationName, association) {
  var foreignKeyName = inflection.propertyName(association.foreignKey);
  obj.__defineGetter__(foreignKeyName, function(){
    var result = null;
    if(obj['_' + foreignKeyName]) {
      result = obj['_' + foreignKeyName];
    }
    if(obj['_' + associationName] && obj['_' + associationName].getId) {
      result = obj['_' + associationName].getId();
    }
    return result;
  });
  obj.__defineSetter__(foreignKeyName, function(val){
    obj['_' + foreignKeyName] = val;
    obj['_' + associationName] = null;
  });
  obj.__defineGetter__(associationName, function() {
    var result = obj['_' + associationName] || null;
    return result;
  });
  obj.__defineSetter__(associationName, function(val) {
    obj['_' + foreignKeyName] = null;
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
  for(var associationName in obj._model.associations) {
    var association = obj._model.associations[associationName];
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
  for(var columnName in obj._model.columns) {
    var column = obj._model.columns[columnName];
    if(!obj[columnName]) {
      if(!column.foreignKey) {
        obj[columnName] = column.defaultValue();
      }
    }
  }
}

function addColumn(propertyName, columnDef) {
  var col = Model.normalizeColumnDef(columnDef);
  if(!col.dbColumnName) col.dbColumnName = propertyName;
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

function hasMany(model) {
  var name = inflection.propertyName(inflection.pluralize(model.modelName));
  this.associations[name] = { type: "hasMany", model: model, foreignKey: this.modelName + 'Id' };

  name = inflection.propertyName(this.modelName);
  if(!model.associations[name]) {
    model.associations[name] = { type: "hasOne", model: this, foreignKey: this.modelName + 'Id' };
  }
  var foreignKeyName = inflection.propertyName(this.modelName + 'Id');
  model.addColumn(foreignKeyName, { type: "int", foreignKey: true });

  return this;
};

function hasOne(model) {
  var name = inflection.propertyName(model.modelName);
  this.associations[name] = { type: "hasOne", model: model, foreignKey: this.modelName + 'Id' };

  name = inflection.propertyName(inflection.pluralize(this.modelName));
  if(!model.associations[name]) {
    model.associations[name] = { type: "hasMany", model: this, foreignKey: this.modelName + 'Id' };
  }

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

Model.define = function(name, columnDefs) {
  var model = function(values) {
    var self = this;
    this._model = model;
    this.save = saveInstance;
    this.delete = deleteInstance;
    this.getId = getId;

    addAssociationMethods(this);
    if(values) {
      copyValuesIntoObject(values, this);
    }
    createColumnPropertiesOnObject(this);

    return this;
  };

  model.modelName = name;
  model.associations = {};
  model.columns = {};

  model.addColumn = addColumn;
  model.getIdPropertyName = getIdPropertyName;
  model.hasMany = hasMany;
  model.hasOne = hasOne;
  model.using = using;

  addColumns(model, columnDefs);

  return model;
}

module.exports = Model;
