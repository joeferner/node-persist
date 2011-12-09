
var persistUtils = require('./persist_utils');
var persist = require('./persist');

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
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  getUpdateSql: function(obj) {
    var columnNamesSql = [];
    var values = [];

    for(var columnKey in obj._model.columns) {
      var column = obj._model.columns[columnKey];
      if(column.primaryKey && column.autoIncrement) continue;
      columnNamesSql.push(column.dbColumnName + ' = ?');
      values.push(obj[columnKey]);
    }

    var idColumndName = obj._model.getIdPropertyName();
    values.push(obj.getId());

    var sql = 'UPDATE ' + obj._model.modelName + ' SET ' + columnNamesSql.join(',') + ' WHERE ' + idColumndName + ' = ?;';
    console.log(sql);
    return { sql: sql, values: values };
  },

  getSqlFromSqlTree: function(sqlTree) {
    var sql = '';
    var values = [];

    if(sqlTree.action == 'count') {
      sql += 'SELECT count(*) as count ';
    } else {
      sql += sqlTree.action + ' ';

      var columns = [];
      for(var i=0; i<sqlTree.columns.length; i++) {
        var column = sqlTree.columns[i];
        columns.push(column.dbColumnName + ' AS ' + column.alias);
      }
      sql += columns.join(', ') + ' ';
    }

    sql += 'FROM ' + sqlTree.tableName + ' ';

    if(sqlTree.where) {
      sql += 'WHERE ' + sqlTree.where;
      for(var i=0; i<sqlTree.whereParams.length; i++) {
        values.push(sqlTree.whereParams[i]);
      }
      sql += ' ';
    }

    if(sqlTree.orderBy && sqlTree.orderBy.length > 0) {
      sql += 'ORDER BY ';
      var orderBys = [];

      for(var i=0; i<sqlTree.orderBy.length; i++) {
        var orderByClause = sqlTree.orderBy[i] + ' ';
        if(sqlTree.orderByDirection[i]) {
          if(sqlTree.orderByDirection[i] == persist.Ascending) {
            orderByClause += 'ASC';
          } else if(sqlTree.orderByDirection[i] == persist.Descending) {
            orderByClause += 'DESC';
          } else {
            throw new Error("Invalid order by direction " + sqlTree.orderByDirection[i]);
          }
        }
        orderBys.push(orderByClause);
      }

      sql += orderBys.join(',') + ' ';
    }

    if(sqlTree.limitCount) {
      sql += 'LIMIT ' + sqlTree.limitCount;
      if(sqlTree.limitOffset) {
        sql += ' OFFSET ' + sqlTree.limitOffset;
      }
      sql += ' ';
    }

    sql += ';';

    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  }
});

module.exports = Driver;
