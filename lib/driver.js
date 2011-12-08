
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
  }
});

module.exports = Driver;
