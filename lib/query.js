
var Query = function(connection, model) {
  this.connection = connection;
  this.model = model;
  this.columnIndex = 0;

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

Query.prototype.limit = function(count, offset) {
  this.sqlTree.limitCount = count;
  this.sqlTree.limitOffset = offset;
  return this;
}

Query.prototype.all = function(callback) {
  if(!this.connection) {
    throw new Error("connection is null or undefined");
  }
  this.connection.all(this.sqlTree, callback);
}

Query.prototype.first = function(callback) {
  this.limit(1).all(function(err, rows) {
    if(err) { callback(err); return; }
    callback(null, rows[0]);
  });
}

Query.prototype.deleteAll = function(callback) {
  this.sqlTree.action = 'delete';
  this.sqlTree.columns = [];
  this.all(callback);
}

module.exports = Query;
