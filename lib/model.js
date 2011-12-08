
var persistUtils = require('./persist_utils');
var Query = require('./query');

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
  return columnDef;
}

Model.define = function(name, columnDefs) {
  var result = function(values) {
    var self = this;
    this._model = result;

    this.save = function(connection, callback) {
      connection.save(self, callback);
    };

    this.delete = function(callback) {
      callback(null, self); // todo: write me
    }

    for(var column in result.columns) {
      if(values[column]) {
        this[column] = values[column];
      } else {
        this[column] = null;
      }
    }
    for(var associationName in result.associations) {
      var association = result.associations[associationName];
      switch(association.type) {
        case "hasMany":
          this[associationName] = []; // todo: define getter setters
          break;
        case "hasOne":
          this[associationName] = null; // todo: define getter setters
          break;
        default:
          throw new Error("Invalid association type '" + association.type + "'");
      }
    }
  };

  result.addColumn = function(propertyName, columnDef) {
    var col = Model.normalizeColumnDef(columnDef);
    if(!col.dbColumnName) col.dbColumnName = propertyName;
    this.columns[propertyName] = col;
  };

  result.getIdPropertyName = function() {
    for(var name in this.columns) {
      if(this.columns[name].primaryKey) {
        return name;
      }
    }
    return null;
  }

  result.hasMany = function(model) {
    var name = persistUtils.toPropertyName(persistUtils.pluralize(model.modelName));
    this.associations[name] = { type: "hasMany", model: model };

    name = persistUtils.toPropertyName(this.modelName);
    if(!model.associations[name]) {
      model.associations[name] = { type: "hasOne", model: this };
    }

    return this;
  };

  result.hasOne = function(model) {
    var name = persistUtils.toPropertyName(model.modelName);
    this.associations[name] = { type: "hasOne", model: model };

    name = persistUtils.toPropertyName(persistUtils.pluralize(this.modelName));
    if(!model.associations[name]) {
      model.associations[name] = { type: "hasMany", model: this };
    }

    return this;
  };

  result.using = function(connection) {
    return new Query(connection, result);
  };

  result.modelName = name;
  result.associations = {};
  result.columns = {};
  for(var propertyName in columnDefs) {
    result.addColumn(propertyName, columnDefs[propertyName]);
  }

  // todo: only add if they haven't defined one yet
  result.addColumn("id", { type: "integer", primaryKey: true, autoIncrement: true });

  return result;
}

module.exports = Model;
