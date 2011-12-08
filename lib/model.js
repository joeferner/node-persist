
var persistUtils = require('./persist_utils');
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
  return columnDef;
}

Model.define = function(name, columnDefs) {
  var result = function(values) {
    var self = this;
    this._model = result;

    this.save = function(connection, callback) {
      if(self._persisted) {
        connection.update(self, callback);
      } else {
        connection.save(self, callback);
      }
    };

    this.delete = function(connection, callback) {
      var query = new Query(connection, result);
      query.where("id = ?", this[result.getIdPropertyName()]);
      query.deleteAll(callback);
    }

    this.getId = function() {
      return this[result.getIdPropertyName()];
    }

    for(var associationName in result.associations) {
      var association = result.associations[associationName];
      switch(association.type) {
        case "hasMany":
          this.__defineGetter__(associationName, function() {
            if(!self._connection) {
              return [];
            }
            var query = new Query(self._connection, association.model);
            return query.where(association.foreignKey + " = ?", self.getId());
          });
          break;
        case "hasOne":
          var foreignKeyName = persistUtils.toPropertyName(association.foreignKey);
          this.__defineGetter__(foreignKeyName, function(){
            var result = null;
            if(self['_' + foreignKeyName]) {
              result = self['_' + foreignKeyName];
            }
            if(self['_' + associationName] && self['_' + associationName].getId) {
              result = self['_' + associationName].getId();
            }
            return result;
          });
          this.__defineSetter__(foreignKeyName, function(val){
            self['_' + foreignKeyName] = val;
            self['_' + associationName] = null;
          });
          this.__defineGetter__(associationName, function() {
            var result = self['_' + associationName] || null;
            return result;
          });
          this.__defineSetter__(associationName, function(val) {
            self['_' + foreignKeyName] = null;
            self['_' + associationName] = val;
          });
          break;
        default:
          throw new Error("Invalid association type '" + association.type + "'");
      }
    }

    // copy values into object
    for(var valKey in values) {
      var setter = this.__lookupSetter__(valKey);
      if(setter) {
        setter(values[valKey]);
      } else {
        this[valKey] = values[valKey];
      }
    }

    // create remaining empty columns
    for(var column in result.columns) {
      var setter = this.__lookupSetter__(column);
      if(!this[column]) {
        if(setter) {
          if(!result.columns[column].foreignKey) {
            setter(null);
          }
        } else {
          this[column] = null;
        }
      }
    }

    return this;
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
    result.associations[name] = { type: "hasMany", model: model, foreignKey: result.modelName + 'Id' };

    name = persistUtils.toPropertyName(this.modelName);
    if(!model.associations[name]) {
      model.associations[name] = { type: "hasOne", model: this, foreignKey: result.modelName + 'Id' };
    }
    var foreignKeyName = persistUtils.toPropertyName(result.modelName + 'Id');
    model.addColumn(foreignKeyName, { type: "int", foreignKey: true });

    return result;
  };

  result.hasOne = function(model) {
    var name = persistUtils.toPropertyName(model.modelName);
    result.associations[name] = { type: "hasOne", model: model, foreignKey: result.modelName + 'Id' };

    name = persistUtils.toPropertyName(persistUtils.pluralize(this.modelName));
    if(!model.associations[name]) {
      model.associations[name] = { type: "hasMany", model: this, foreignKey: result.modelName + 'Id' };
    }

    return result;
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
