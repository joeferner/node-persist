
var persistUtils = require('./persist_utils');

var Driver = persistUtils.Class.extend({
  init: function() {
  },

  connect: function(opts, callback) {
    throw new Error("Not Implemented");
  },

  getInsertSql: function(obj) {
    var columnNamesSql = [];
    var valuesSql = [];
    var values = [];

    for(var columnKey in obj._model.columns) {
      var column = obj._model.columns[columnKey];
      if(column.primaryKey && column.autoIncrement) continue;
      columnNamesSql.push(column.dbColumnName);
      valuesSql.push('?');
      values.push(obj[columnKey]);
    }

    var sql = 'INSERT INTO ' + obj._model.modelName + '(' + columnNamesSql.join(',') + ') VALUES (' + valuesSql.join(',') + ');';
    return { sql: sql, values: values };
  },

  getSqlFromSqlTree: function(sqlTree) {
    var sql = sqlTree.action + ' ';
    var values = [];

    var columns = [];
    for(var i=0; i<sqlTree.columns.length; i++) {
      var column = sqlTree.columns[i];
      columns.push(column.dbColumnName + ' AS ' + column.alias);
    }
    sql += columns.join(', ') + ' ';
    sql += 'FROM ' + sqlTree.tableName + ' ';

    if(sqlTree.where) {
      sql += 'WHERE ' + sqlTree.where;
      for(var i=0; i<sqlTree.whereParams.length; i++) {
        values.push(sqlTree.whereParams[i]);
      }
    }

    sql += ';';

    return { sql: sql, values: values };
  }
});

module.exports = Driver;
