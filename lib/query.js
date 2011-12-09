
var persistUtil = require('./persist_utils');

function count(callback) {
  this.sqlTree.action = 'count';
  this.sqlTree.columns = [];
  if(!this.connection) {
    throw new Error("connection is null or undefined");
  }
  this.connection.count(this.sqlTree, callback);
}

function all(callback) {
  if(!this.connection) {
    throw new Error("connection is null or undefined");
  }
  this.connection.all(this.sqlTree, callback);
}

function first(callback) {
  this.limit(1).all(function(err, rows) {
    if(err) { callback(err); return; }
    if(rows.length == 0) {
      callback(null, null);
    } else {
      callback(null, rows[0]);
    }
  });
}

function deleteAll(callback) {
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

Query.prototype.each = function(callback, doneCallback) {
  if(!this.connection) {
    throw new Error("connection is null or undefined");
  }
  this.connection.each(this.sqlTree, callback, doneCallback);
}

module.exports = Query;
