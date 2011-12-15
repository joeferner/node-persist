
var persistUtil = require('./persist_utils');
var Connection = require('./connection');
var type = require('./type');

function count() {
  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'count';
  this._sqlTree().columns = [];
  connection.single(this._sqlTree(), 'count', callback);
}

// field (chaining)
// connection, field, callback
// field, callback
function min() {
  var self = this;
  if(arguments.length == 1) {
    var fieldName = arguments[0];
    return function(connection, callback) {
      self.min(connection, fieldName, callback);
    };
  }

  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'min';
  this._sqlTree().columns = [ this._sqlTree().getColumnByPropertyName(field) ];
  connection.single(this._sqlTree(), 'min', callback);
  return null;
}

// field (chaining)
// connection, field, callback
// field, callback
function max() {
  var self = this;
  if(arguments.length == 1) {
    var fieldName = arguments[0];
    return function(connection, callback) {
      self.max(connection, fieldName, callback);
    };
  }

  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'max';
  this._sqlTree().columns = [ this._sqlTree().getColumnByPropertyName(field) ];
  connection.single(this._sqlTree(), 'max', callback);
  return null;
}

function all() {
  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  connection.all(this._sqlTree(), callback);
}

function first() {
  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this.limit(1).all(connection, function(err, rows) {
    if(err) { callback(err); return; }
    if(rows.length == 0) {
      callback(null, null);
    } else {
      callback(null, rows[0]);
    }
  });
}

function deleteAll() {
  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'delete';
  this._sqlTree().columns = [];
  this.all(callback);
}

var Query = function(connection, model) {
  var self = this;
  this._connection = function() { return connection; }; // hide from JSON.stringify
  this.model = model;
  var columnIndex = 0;
  var tableIndex = 0;
  this._getNextColumnAlias = function() { return 'c' + (columnIndex++); };
  this._getNextTableAlias = function() { return 't' + (tableIndex++); };
  this.count = persistUtil.bind('count', count, this);
  this.all = persistUtil.bind('all', all, this);
  this.first = persistUtil.bind('first', first, this);
  this.deleteAll = persistUtil.bind('deleteAll', deleteAll, this);
  this.min = persistUtil.bind('min', min, this);
  this.max = persistUtil.bind('max', max, this);

  var sqlTree = {
    action: "select",
    model: model,
    tableName: model.modelName || model,
    tableAlias: null,
    columns: [],
    primaryKeyColumn: null,
    orderBy: [],
    where: [],
    joins: [],
    includes: [],

    addColumn: function(model, propertyName, tableAlias) {
      var colDef = {
        model: model,
        propertyName: propertyName,
        tableAlias: tableAlias,
        dbColumnName: model.columns[propertyName].dbColumnName,
        modelColumn: model.columns[propertyName],
        alias: self._getNextColumnAlias()
      };
      this.columns.push(colDef);
      return colDef;
    },

    getColumnByPropertyName: function(propertyName) {
      for(var i=0; i<this.columns.length; i++) {
        if(this.columns[i].propertyName == propertyName) {
          return this.columns[i];
        }
      }
      return null;
    },

    getColumnByAlias: function(alias) {
      for(var i=0; i<this.columns.length; i++) {
        if(this.columns[i].alias == alias) {
          return this.columns[i];
        }
      }
      return null;
    },

    populateInclude: function(result, item, include) {
      var includeItems = [];
      for(var i=0; i<item.length; i++) {
        var includeItem = item[i];
        var includeItemInstance = new include.association.model()
        includeItemInstance = this.toObject(includeItem, includeItemInstance);
        includeItems.push(includeItemInstance);
      }
      delete result[include.propertyName];
      result[include.propertyName] = includeItems;
    },

    populateIncludes: function(result, item) {
      for(var i=0; i<this.includes.length; i++) {
        var include = this.includes[i];
        this.populateInclude(result, item, include)
      }
    },

    toObjects: function(rows) {
      if(this.primaryKeyColumn) {
        // group the results by the primary key. this handles the case where we might have done a left join and
        // we need to only return one record per grouping
        var items = persistUtil.groupBy(rows, this.primaryKeyColumn.alias);
        var results = [];
        for(var i=0; i<items.length; i++) {
          var item = items[i];
          var result = new this.primaryKeyColumn.model();
          result = this.toObject(item[0], result);
          results.push(result);

          this.populateIncludes(result, item);
        }

        return results;
      }

      var results = [];
      for(var i=0; i<rows.length; i++) {
        results.push(this.toObject(rows[i]));
      }
      return results;
    },

    toObject: function(row, result) {
      for(var key in row) {
        var column = this.getColumnByAlias(key);
        if(!result) {
          result = new column.model();
        }
        if(column.model !== result._model()) {
          continue;
        }
        var val = row[key];
        if(column.modelColumn.type == type.JSON && val) {
          try {
            val = JSON.parse(val);
          } catch(e) {
            // could not parse json so we will leave it as a string
          }
        }
        result[column.propertyName] = val;
      }
      return result;
    }
  };

  this._sqlTree = function() { return sqlTree; }; // hide from JSON.stringify

  sqlTree.tableAlias = this._getNextTableAlias();
  if(model.columns) {
    for(var propertyName in model.columns) {
      var colDef = sqlTree.addColumn(model, propertyName, sqlTree.tableAlias);
      if(model.columns[propertyName].primaryKey) {
        sqlTree.primaryKeyColumn = colDef;
      }
    }
  }
}

// "name = ?", "bob"
// "name = ? AND age = ?", ["bob", 6]
// "name = 'bob'"
// { "name": "bob", "age", 6 }
Query.prototype.where = function() {
  if(typeof(arguments[0]) == 'string') {
    var expr = arguments[0];
    var params = arguments[1] || [];
    if(!(params instanceof Array)) {
      params = [ params ];
    }
    this._sqlTree().where.push({expr: expr, params: params});
  } else {
    var hash = arguments[0];
    for(var key in hash) {
      this.where(key + ' = ?', [ hash[key] ]);
    }
  }
  return this;
}

// "people"
// ["people", "phones"]
Query.prototype.include = function() {
  if(typeof(arguments[0]) == 'string') {
    var associationPropertyName = arguments[0];
    var association = this.model.associations[associationPropertyName];

    // join to table
    this.leftJoin(associationPropertyName);

    // add the columns from the new table
    var join = this._sqlTree().joins[this._sqlTree().joins.length - 1];
    var primaryKeyColumn;
    for(var propertyName in association.model.columns) {
      var col = association.model.columns[propertyName];
      var colDef = this._sqlTree().addColumn(association.model, propertyName, join.tableAlias);
      if(col.primaryKey) {
        primaryKeyColumn = colDef;
      }
    }

    // add the include
    this._sqlTree().includes.push({ propertyName: arguments[0], association: association, primaryKeyColumn: primaryKeyColumn });

  } else {
    var arr = arguments[0];
    for(var i=0; i<arr.length; i++) {
      this.include(arr[i]);
    }
  }
  return this;
}

Query.prototype.join = function(otherTable, otherTableId, thisTableId) {
  return this._join.apply(this, ['join'].concat(persistUtil.toArray(arguments)));
}

Query.prototype.leftJoin = function(otherTable, otherTableId, thisTableId) {
  return this._join.apply(this, ['left join'].concat(persistUtil.toArray(arguments)));
}

// type, otherTable, otherTableId, thisTableId
// type, associationPropertyName
Query.prototype._join = function(type, otherTable, otherTableId, thisTableId) {
  if(arguments.length == 2) {
    var association = this.model.associations[arguments[1]];
    otherTable = association.model.modelName;
    otherTableId = association.foreignKey;
    thisTableId = this.model.getIdColumn().dbColumnName;
  }
  this._sqlTree().joins.push({
    type: type,
    otherTable: otherTable,
    otherTableId: otherTableId,
    thisTableId: this._sqlTree().tableAlias + '.' + thisTableId,
    tableAlias: this._getNextTableAlias()
  });
  return this;
}

Query.prototype.orderBy = function(name, orderByDirection) {
  var column = this._sqlTree().getColumnByPropertyName(name);
  this._sqlTree().orderBy.push({ column: column, direction: orderByDirection });
  return this;
}

Query.prototype.limit = function(count, offset) {
  this._sqlTree().limitCount = count;
  this._sqlTree().limitOffset = offset;
  return this;
}

// connection, callback, doneCallback
// callback, doneCallback
Query.prototype.each = function() {
  var connection = this._connection();
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 2];
  var doneCallback = arguments[arguments.length - 1];

  if(this._sqlTree().includes.length > 0) {
    throw new Error("includes are not support with 'each' method.");
  }

  connection.each(this._sqlTree(), callback, doneCallback);
}

module.exports = Query;
