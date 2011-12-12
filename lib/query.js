
var persistUtil = require('./persist_utils');
var Connection = require('./connection');

function count() {
  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this.sqlTree.action = 'count';
  this.sqlTree.columns = [];
  connection.single(this.sqlTree, 'count', callback);
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

  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this.sqlTree.action = 'min';
  this.sqlTree.columns = [ field ];
  connection.single(this.sqlTree, 'min', callback);
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

  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this.sqlTree.action = 'max';
  this.sqlTree.columns = [ field ];
  connection.single(this.sqlTree, 'max', callback);
  return null;
}

function all() {
  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  connection.all(this.sqlTree, callback);
}

function first() {
  var connection = this.connection;
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
  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  var callback = arguments[arguments.length - 1];

  this.sqlTree.action = 'delete';
  this.sqlTree.columns = [];
  this.all(callback);
}

var Query = function(connection, model) {
  this.connection = connection;
  this.model = model;
  this.columnIndex = 0;
  this.count = persistUtil.bind('count', count, this);
  this.all = persistUtil.bind('all', all, this);
  this.first = persistUtil.bind('first', first, this);
  this.deleteAll = persistUtil.bind('deleteAll', deleteAll, this);
  this.min = persistUtil.bind('min', min, this);
  this.max = persistUtil.bind('max', max, this);

  var columns = [];
  for(var propertyName in model.columns) {
    columns.push({
      model: model,
      propertyName: propertyName,
      dbColumnName: model.columns[propertyName].dbColumnName,
      alias: 'c' + this.columnIndex++
    });
  }

  this.sqlTree = {
    action: "select",
    tableName: model.modelName,
    columns: columns,
    orderBy: [],
    orderByDirection: [],
    where: null,
    whereParams: [],

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
        result[column.propertyName] = row[key];
      }
      return result;
    }
  };
}

Query.prototype.where = function(expr, params) {
  this.sqlTree.where = expr;
  if(params instanceof Array) {
    for(var i=0; i<params.length; i++) {
      this.sqlTree.whereParams.push(params[i]);
    }
  } else {
    this.sqlTree.whereParams.push(params);
  }
  return this;
}

Query.prototype.orderBy = function(name, orderByDirection) {
  this.sqlTree.orderBy.push(name);
  this.sqlTree.orderByDirection.push(orderByDirection);
  return this;
}

Query.prototype.limit = function(count, offset) {
  this.sqlTree.limitCount = count;
  this.sqlTree.limitOffset = offset;
  return this;
}

// connection, callback, doneCallback
// callback, doneCallback
Query.prototype.each = function() {
  var connection = this.connection;
  if(arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if(!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 2];
  var doneCallback = arguments[arguments.length - 1];

  connection.each(this.sqlTree, callback, doneCallback);
}

module.exports = Query;
