'use strict';

var Driver = require('../driver');
var Connection = require('../connection');
var oracle = require('oracle');
var util = require('util');
var persistUtil = require('../persist_utils');

var OracleConnection = Connection.extend({
  init: function (driver, client, opts) {
    this._super(driver, opts);
    this.client = client;
    this.client.setAutoCommit(true);
  },

  close: function () {
    this.client.close();
  },

  beginTransaction: function (callback) {
    this.client.setAutoCommit(false);
    callback();
  },

  commitTransaction: function (callback) {
    var self = this;
    this.client.commit(function (err) {
      self.client.setAutoCommit(true);
      callback(err);
    });
  },

  rollbackTransaction: function (callback) {
    var self = this;
    this.client.rollback(function (err) {
      self.client.setAutoCommit(true);
      callback(err);
    });
  },

  updateLastId: function (results) {
    //console.log(results);
    if (results.returnParam) {
      results.lastId = results.returnParam;
    }
  },

  postProcessResults: function (results) {
    if (results instanceof Array) {
      var fixKeyFunc = function (key, val) {
        if (key.toLowerCase() === 'persist_rnum') {
          return null;
        }
        if (key && typeof (key) === "string") {
          return key.toLowerCase();
        }
        return key;
      };
      var i;
      for (i = 0; i < results.length; i++) {
        var result = results[i];
        persistUtil.alterHashKeys(result, fixKeyFunc);
      }
    }
  },

  _runSql2: function (sql, callback) {
    var self = this;
    this.client.execute(sql, [], function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      self.updateLastId(results);
      if (results.command === 'SELECT') {
        results = results.rows;
      }
      self.postProcessResults(results);
      callback(null, results);
    });
  },

  _runSql3: function (sql, values, callback) {
    var self = this;
    this.client.execute(sql, values, function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      self.updateLastId(results);
      self.postProcessResults(results);
      callback(null, results);
    });
  },

  _runSqlAll: function (sql, params, callback) {
    this._runSql(sql, params, callback);
  },

  _runSqlEach: function (sql, params, callback, doneCallback) {
    // todo: check with the db-oracle project to see if there is a way to do "each" as opposed to getting all the results back
    this._runSql(sql, params, function (err, rows) {
      if (err) {
        callback(err);
        return;
      }
      var i;
      for (i = 0; i < rows.length; i++) {
        callback(null, rows[i]);
      }
      doneCallback();
    });
  }
});

var OracleDriver = Driver.extend({
  init: function () {
    this._super();
  },

  connect: function (opts, callback) {
    var self = this;
    oracle.connect(opts, function (err, conn) {
      if (err) {
        callback(err);
        return;
      }
      var connection = new OracleConnection(self, conn, opts);
      callback(null, connection);
    });
  },

  getValuesSubstitutionString: function (index) {
    return ':' + index;
  },

  getTableAliasSql: function (tableName, alias) {
    return tableName + " " + alias;
  },

  getInsertSql: function (obj) {
    var columnNamesSql = [];
    var valuesSql = [];
    var values = [];
    var valueSubstitutionIndex = 1;
    var autoIncrementColumnName;

    var columnKey;
    for (columnKey in obj._getModel().columns) {
      var column = obj._getModel().columns[columnKey];
      if (column.primaryKey && column.autoIncrement) {
        autoIncrementColumnName = column.dbColumnName;
      } else {
        columnNamesSql.push(column.dbColumnName);
        valuesSql.push(this.getValuesSubstitutionString(valueSubstitutionIndex++));
        values.push(obj[columnKey]);
      }
    }

    var returningSql = '';
    if (autoIncrementColumnName) {
      returningSql = 'RETURNING ' + autoIncrementColumnName + ' INTO ' + this.getValuesSubstitutionString(valueSubstitutionIndex++);
      values.push(new oracle.OutParam());
    }

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s) %s', obj._getModel().tableName, columnNamesSql.join(','), valuesSql.join(','), returningSql);
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },

  addLimitClause: function (sql, sqlTree) {
    if (sqlTree.limitCount || sqlTree.limitOffset) {
      if (!sqlTree.limitCount) {
        sqlTree.limitCount = 99999999;
      }
      if (!sqlTree.limitOffset) {
        sqlTree.limitOffset = 0;
      }
      sql = util.format("SELECT * FROM (SELECT rnumalias.*, ROWNUM persist_rnum FROM (%s) rnumalias WHERE ROWNUM <= %s) WHERE persist_rnum > %s", sql, sqlTree.limitOffset + sqlTree.limitCount, sqlTree.limitOffset);
    }
    return sql;
  },

  escapeColumnName: function (columnName) {
    return '"' + columnName + '"';
  }
});

module.exports = OracleDriver;
