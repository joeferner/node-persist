
var persistUtils = require('./persist_utils');
var persist = require('./persist');
var util = require('util');

var Driver = persistUtils.Class.extend({
  init: function() {
  },

  connect: function(opts, callback) {
    throw new Error("Not Implemented");
  },

  getValuesSubstitutionString: function(index) {
    return '?';
  },

  getInsertSql: function(obj) {
    var columnNamesSql = [];
    var valuesSql = [];
    var values = [];
    var valueSubstitutionIndex = 1;

    for(var columnKey in obj._model().columns) {
      var column = obj._model().columns[columnKey];
      if(column.primaryKey && column.autoIncrement) continue;
      columnNamesSql.push(column.dbColumnName);
      valuesSql.push(this.getValuesSubstitutionString(valueSubstitutionIndex++));
      values.push(obj[columnKey]);
    }

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s);', obj._model().modelName, columnNamesSql.join(','), valuesSql.join(','));
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  getManyToManyInsertSql: function(association, obj, relatedObj) {
    var valueSubstitutionIndex = 1;
    var columnNamesSql = [ association.foreignKey, association.manyToManyForeignKey ];
    var valuesSql = [
      this.getValuesSubstitutionString(valueSubstitutionIndex++),
      this.getValuesSubstitutionString(valueSubstitutionIndex++)];
    var values = [ obj.getId(), relatedObj.getId() ];

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s);', association.through, columnNamesSql.join(','), valuesSql.join(','));
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  getUpdateSql: function(obj) {
    var valueSubstitutionIndex = 1;
    var columnNamesSql = [];
    var values = [];

    for(var columnKey in obj._model().columns) {
      var column = obj._model().columns[columnKey];
      if(column.primaryKey && column.autoIncrement) continue;
      columnNamesSql.push(column.dbColumnName + ' = ' + this.getValuesSubstitutionString(valueSubstitutionIndex++));
      values.push(obj[columnKey]);
    }

    var idColumndName = obj._model().getIdPropertyName();
    values.push(obj.getId());

    var sql = util.format('UPDATE %s SET %s WHERE %s = %s;', obj._model().modelName, columnNamesSql.join(','), idColumndName, this.getValuesSubstitutionString(valueSubstitutionIndex++));
    //console.log(sql);
    return { sql: sql, values: values };
  },

  getColumnName: function(column, aliasTables) {
    var name = column.dbColumnName;
    if(aliasTables) {
      name = column.tableAlias + '.' + name;
    }
    return name;
  },

  getSqlFromSqlTree: function(sqlTree) {
    var self = this;
    var sql = '';
    var values = [];
    var aliasTables = (sqlTree.joins && sqlTree.joins.length > 0) ? true : false;
    var valueSubstitutionIndex = 1;

    if(sqlTree.action == 'min') {
      sql += 'SELECT min(' + this.getColumnName(sqlTree.columns[0], aliasTables) + ') as min ';
    } else if(sqlTree.action == 'max') {
      sql += 'SELECT max(' + this.getColumnName(sqlTree.columns[0], aliasTables) + ') as max ';
    } else if(sqlTree.action == 'count') {
      sql += 'SELECT count(*) as count ';
    } else {
      sql += sqlTree.action + ' ';

      var columns = [];
      for(var i=0; i<sqlTree.columns.length; i++) {
        var column = sqlTree.columns[i];
        columns.push(this.getColumnName(column, aliasTables) + ' AS ' + column.alias);
      }
      sql += columns.join(', ') + ' ';
    }

    if(aliasTables) {
      sql += util.format('FROM %s AS %s ', sqlTree.tableName, sqlTree.tableAlias);
    } else {
      sql += util.format('FROM %s ', sqlTree.tableName);
    }

    if(sqlTree.joins) {
      for(var i=0; i<sqlTree.joins.length; i++) {
        var join = sqlTree.joins[i];
        var joinSql;
        switch(join.type) {
          case 'join': joinSql = "INNER JOIN"; break;
          case 'left join': joinSql = "LEFT JOIN"; break;
          default: throw new Error("unhandled join type '" + join.type + "'");
        }
        sql += util.format("%s %s AS %s ON %s.%s=%s ", joinSql, join.otherTable, join.tableAlias, join.tableAlias, join.otherTableId, join.thisTableId);
      }
    }

    // process where
    var expressions = [];
    for(var i = 0; i<sqlTree.where.length; i++) {
      var item = sqlTree.where[i];
      var expr = item.expr.replace(/\?/, function(match) {
        return self.getValuesSubstitutionString(valueSubstitutionIndex++);
      });
      expressions.push(expr);
      values = values.concat(item.params);
    }
    if(expressions.length > 0) {
      sql += 'WHERE ' + expressions.join(' AND ') + ' ';
    }

    if(sqlTree.orderBy && sqlTree.orderBy.length > 0) {
      sql += 'ORDER BY ';
      var orderBys = [];

      for(var i=0; i<sqlTree.orderBy.length; i++) {
        var orderBy = sqlTree.orderBy[i];
        var orderByClause = orderBy.column.dbColumnName + ' ';
        if(orderBy.direction) {
          switch(orderBy.direction) {
            case persist.Ascending: orderByClause += 'ASC'; break;
            case persist.Descending: orderByClause += 'DESC'; break;
            default: throw new Error("Invalid order by direction " + orderBy.direction);
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
