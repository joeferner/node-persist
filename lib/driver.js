'use strict';

var persistUtils = require('./persist_utils');
var persist = require('./persist');
var util = require('util');
var Class = require('./class');

var Driver = Class.extend({
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

    var columnKey;
    for (columnKey in obj._getModel().columns) {
      var column = obj._getModel().columns[columnKey];
      if (column.primaryKey && column.autoIncrement) {
        continue;
      }
      columnNamesSql.push(this.escapeColumnName(column.dbColumnName));
      valuesSql.push(this.getValuesSubstitutionString(valueSubstitutionIndex++));
      values.push(obj[columnKey]);
    }

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s)', obj._getModel().tableName, columnNamesSql.join(','), valuesSql.join(','));
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  getManyToManyInsertSql: function(association, obj, relatedObj) {
    var valueSubstitutionIndex = 1;
    var columnNamesSql = [ this.escapeColumnName(association.foreignKey), this.escapeColumnName(association.manyToManyForeignKey) ];
    var valuesSql = [
      this.getValuesSubstitutionString(valueSubstitutionIndex++),
      this.getValuesSubstitutionString(valueSubstitutionIndex++)];
    if (!relatedObj.getId) {
      throw new Error('a related object "' + util.inspect(relatedObj, false, 1) + '" from a many-to-many appears to not have come from the database. You must save related objects first before calling save on the parent object.');
    }
    var values = [ obj.getId(), relatedObj.getId() ];

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s)', association.through, columnNamesSql.join(','), valuesSql.join(','));
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  getUpdateSql: function(obj) {
    var valueSubstitutionIndex = 1;
    var columnNamesSql = [];
    var values = [];

    var columnKey;
    for (columnKey in obj._getModel().columns) {
      var column = obj._getModel().columns[columnKey];
      if (column.primaryKey && column.autoIncrement) {
        continue;
      }
      columnNamesSql.push(this.escapeColumnName(column.dbColumnName) + ' = ' + this.getValuesSubstitutionString(valueSubstitutionIndex++));
      values.push(obj[columnKey]);
    }

    var idColumnName = obj._getModel().getIdColumn().dbColumnName;
    values.push(obj.getId());

    var sql = util.format('UPDATE %s SET %s WHERE %s = %s', obj._getModel().tableName, columnNamesSql.join(','), idColumnName, this.getValuesSubstitutionString(valueSubstitutionIndex++));
    //console.log(sql);
    return { sql: sql, values: values };
  },

  getUpdatePartialSql: function(model, id, data) {
    var valueSubstitutionIndex = 1;
    var columnNamesSql = [];
    var values = [];

    var prop;
    for (prop in data) {
      var column = model.columns[prop];
      if (column) {
        if (column.primaryKey && column.autoIncrement) {
          throw new Error("Invalid column to update '" + prop + "', cannot be a primary or autoincrementing column.");
        }
        columnNamesSql.push(this.escapeColumnName(column.dbColumnName) + ' = ' + this.getValuesSubstitutionString(valueSubstitutionIndex++));
        values.push(data[prop]);
      } else {
        var association = model.associations[prop];
        if (association) {
          if (association.type === 'hasOne') {
            columnNamesSql.push(this.escapeColumnName(association.foreignKey) + ' = ' + this.getValuesSubstitutionString(valueSubstitutionIndex++));
            values.push(data[prop].getId());
          } else {
            throw new Error("Invalid association '" + prop + "' for update, must be a hasOne.");
          }
        } else {
          throw new Error("Could not find column or association to update '" + prop + "'.");
        }
      }
    }

    if (columnNamesSql.length === 0) {
      throw new Error("No columns to update.");
    }

    var idColumndName = model.getIdPropertyName();
    values.push(id);

    var sql = util.format('UPDATE %s SET %s WHERE %s = %s', model.tableName, columnNamesSql.join(','), idColumndName, this.getValuesSubstitutionString(valueSubstitutionIndex++));
    var results = { sql: sql, values: values };
    //console.log(results);
    return results;
  },

  escapeColumnName: function(columnName) {
    throw new Error("Not Implemented");
  },

  getColumnName: function(column, aliasTables) {
    var name = this.escapeColumnName(column.dbColumnName);
    if (aliasTables) {
      name = column.tableAlias + '.' + name;
    }
    return name;
  },

  propertyNamesToColumnNames: function(sqlTree, expr, aliasTables) {
    return expr.replace(/([a-zA-Z_\.]+)/g, function(m) {
      var parts = m.split('.');
      var partIndex = 0;
      if (sqlTree.model && sqlTree.model.columns) {
        var model = sqlTree.model;

        for (partIndex; partIndex < parts.length - 1; partIndex++) {
          var association = model.associations[parts[partIndex]];
          model = association.model;
        }

        var column = sqlTree.findColumnByModelNameAndColumnName(model.modelName, parts[partIndex]);
        if (column) {
          if (aliasTables) {
            return column.tableAlias + '.' + column.dbColumnName;
          } else {
            return column.dbColumnName;
          }
        }

        // fall back and try to lookup by name
        column = sqlTree.model.columns[m];
        if (column) {
          if (aliasTables) {
            return sqlTree.tableAlias + '.' + column.dbColumnName;
          } else {
            return column.dbColumnName;
          }
        }
      }

      // give up and just return the input
      return m;
    });
  },

  getTableAliasSql: function(tableName, alias) {
    return tableName + " AS " + alias;
  },

  _updateSubstitutes: function(sql, params) {
    var self = this;
    var index = 1;
    sql = sql.replace(/\?/g, function() {
      return self.getValuesSubstitutionString(index++);
    });
    return sql;
  },

  getSqlFromSqlTree: function(sqlTree) {
    var self = this;
    var sql = '';
    var values = [];
    var aliasTables = true;
    var valueSubstitutionIndex = 1;
    var i;

    if ((sqlTree.action === 'delete') || (sqlTree.action === 'update')) {
      aliasTables = false;
    }

    if (sqlTree.action === 'update') {
      sql += 'UPDATE ' + sqlTree.tableName + ' SET ';
      var sets = [];
      for (var k in sqlTree.updateHash) {
        var column = sqlTree.getColumnByPropertyName(k);
        sets.push(this.getColumnName(column, aliasTables) + ' = ' + self.getValuesSubstitutionString(valueSubstitutionIndex++));
        values.push(sqlTree.updateHash[k]);
      }
      sql += sets.join(', ') + ' ';
    } else {
      if (sqlTree.action === 'min') {
        sql += 'SELECT min(' + this.getColumnName(sqlTree.columns[0], aliasTables) + ') as min ';
      } else if (sqlTree.action === 'max') {
        sql += 'SELECT max(' + this.getColumnName(sqlTree.columns[0], aliasTables) + ') as max ';
      } else if (sqlTree.action === 'count') {
        sql += 'SELECT count(*) as count ';
      } else if (sqlTree.action === 'sum') {
        sql += 'SELECT sum(' + this.getColumnName(sqlTree.columns[0], aliasTables) + ') as sum ';
      } else {
        sql += sqlTree.action + ' ';

        sql = this.addColumnsSql(sql, sqlTree, aliasTables);
      }

      if (aliasTables) {
        sql += util.format('FROM %s ', this.getTableAliasSql(sqlTree.tableName, sqlTree.tableAlias));
      } else {
        sql += util.format('FROM %s ', sqlTree.tableName);
      }
    }

    if (sqlTree.joins) {
      for (i = 0; i < sqlTree.joins.length; i++) {
        var join = sqlTree.joins[i];
        var joinSql;
        switch (join.type) {
        case 'join':
          joinSql = "INNER JOIN";
          break;
        case 'left join':
          joinSql = "LEFT JOIN";
          break;
        default:
          throw new Error("unhandled join type '" + join.type + "'");
        }
        sql += util.format("%s %s ON %s.%s=%s ", joinSql, this.getTableAliasSql(join.otherTable, join.tableAlias), join.tableAlias, join.otherTableId, join.thisTableId);
      }
    }

    // process where
    var expressions = [];
    var getValuesSubstitutionStringFunc = function(match) {
      return self.getValuesSubstitutionString(valueSubstitutionIndex++);
    };
    for (i = 0; i < sqlTree.where.length; i++) {
      var item = sqlTree.where[i];
      var expr = item.expr;
      expr = this.propertyNamesToColumnNames(sqlTree, item.expr, aliasTables);
      expr = expr.replace(/\?/, getValuesSubstitutionStringFunc);
      expressions.push(expr);
      values = values.concat(item.params);
    }
    if (expressions.length > 0) {
      sql += 'WHERE ' + expressions.join(' AND ') + ' ';
    }

    if (sqlTree.orderBy && sqlTree.orderBy.length > 0) {
      sql += 'ORDER BY ';
      var orderBys = [];

      for (i = 0; i < sqlTree.orderBy.length; i++) {
        var orderBy = sqlTree.orderBy[i];
        var orderByClause = this.escapeColumnName(orderBy.column.alias) + ' ';
        if (orderBy.direction) {
          switch (orderBy.direction) {
          case persist.Ascending:
            orderByClause += 'ASC';
            break;
          case persist.Descending:
            orderByClause += 'DESC';
            break;
          default:
            throw new Error("Invalid order by direction " + orderBy.direction);
          }
        }
        orderBys.push(orderByClause);
      }

      sql += orderBys.join(',') + ' ';
    }

    sql = this.addLimitClause(sql, sqlTree);

    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  addColumnsSql: function(sql, sqlTree, aliasTables) {
    var columns = [];
    var i;
    for (i = 0; i < sqlTree.columns.length; i++) {
      var column = sqlTree.columns[i];
      columns.push(this.getColumnName(column, aliasTables) + ' AS ' + column.alias);
    }
    sql += columns.join(', ') + ' ';
    return sql;
  },

  addLimitClause: function(sql, sqlTree) {
    if (sqlTree.limitCount) {
      sql += 'LIMIT ' + sqlTree.limitCount;
      if (sqlTree.limitOffset) {
        sql += ' OFFSET ' + sqlTree.limitOffset;
      }
      sql += ' ';
    }
    return sql;
  }
});

module.exports = Driver;
