
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
  this._sqlTree().columns = [ field ];
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
  this._sqlTree().columns = [ field ];
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
  this._connection = function() { return connection; }; // hide from JSON.stringify
  this.model = model;
  var columnIndex = 0;
  this._getNextColumnIndex = function() { return columnIndex++; };
  this.count = persistUtil.bind('count', count, this);
  this.all = persistUtil.bind('all', all, this);
  this.first = persistUtil.bind('first', first, this);
  this.deleteAll = persistUtil.bind('deleteAll', deleteAll, this);
  this.min = persistUtil.bind('min', min, this);
  this.max = persistUtil.bind('max', max, this);

  var columns = [];
  if(model.columns) {
    for(var propertyName in model.columns) {
      columns.push({
        model: model,
        propertyName: propertyName,
        dbColumnName: model.columns[propertyName].dbColumnName,
        modelColumn: model.columns[propertyName],
        alias: 'c' + this._getNextColumnIndex()
      });
    }
  }

  var sqlTree = {
    action: "select",
    tableName: model.modelName || model,
    columns: columns,
    orderBy: [],
    orderByDirection: [],
    where: [],
    joins: [],

    getColumnFromAlias: function(alias) {
      for(var i=0; i<this.columns.length; i++) {
        if(this.columns[i].alias == alias) {
          return this.columns[i];
        }
      }
      return null;
    },

    toObjects: function(rows) {
      var results = [];
      for(var i=0; i<rows.length; i++) {
        results.push(this.toObject(rows[i]));
      }
      return results;
    },

    toObject: function(row) {
      var result = null;
      for(var key in row) {
        var column = this.getColumnFromAlias(key);
        if(!result) {
          result = new column.model();
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

Query.prototype.join = function(otherTable, otherTableId, thisTableId) {
  this._sqlTree().joins.push({
    type: 'join',
    otherTable: otherTable,
    otherTableId: otherTableId,
    thisTableId: thisTableId
  });
  return this;
}

Query.prototype.orderBy = function(name, orderByDirection) {
  this._sqlTree().orderBy.push(name);
  this._sqlTree().orderByDirection.push(orderByDirection);
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

  connection.each(this._sqlTree(), callback, doneCallback);
}

module.exports = Query;
