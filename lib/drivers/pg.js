
var Driver = require('../driver');
var Connection = require('../connection');
var pg = require('pg');
var util = require('util');

var PostgreSqlDriver = Driver.extend({
  init: function() {
    this._super();
  },

  connect: function(opts, callback) {
    var self = this;
    if(opts.db) {
      var connection = new PostgreSqlConnection(self, opts.db, false);
      callback(null, connection);
    } else {
      var client = new pg.Client(opts.connectionString || opts);
      client.connect(function(err) {
        if(err) { callback(err); return; }
        var connection = new PostgreSqlConnection(self, client, true);
        callback(null, connection);
      });
    }
  },

  getValuesSubstitutionString: function(index) {
    return '$' + index;
  },

  getInsertSql: function(obj) {
    var columnNamesSql = [];
    var valuesSql = [];
    var values = [];
    var valueSubstitutionIndex = 1;
    var autoIncrementColumnName;

    for(var columnKey in obj._model().columns) {
      var column = obj._model().columns[columnKey];
      columnNamesSql.push(column.dbColumnName);
      if(column.primaryKey && column.autoIncrement) {
        autoIncrementColumnName = column.dbColumnName;
        valuesSql.push('DEFAULT');
      } else {
        valuesSql.push(this.getValuesSubstitutionString(valueSubstitutionIndex++));
        values.push(obj[columnKey]);
      }
    }

    var returningSql = '';
    if(autoIncrementColumnName) {
      returningSql = 'RETURNING ' + autoIncrementColumnName;
    }

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s) %s;', obj._model().tableName, columnNamesSql.join(','), valuesSql.join(','), returningSql);
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  }
});

var PostgreSqlConnection = Connection.extend({
  init: function(driver, client, createdConnection) {
    this._super(driver);
    this.client = client;
    this.createdConnection = createdConnection;
  },

  close: function() {
    if(this.createdConnection) {
      this.client.end();
    }
  },

  beginTransaction: function(callback) {
    this.runSql("BEGIN", callback);
  },

  commitTransaction: function(callback) {
    this.runSql("COMMIT", callback);
  },

  rollbackTransaction: function(callback) {
    this.runSql("ROLLBACK", callback);
  },

  updateLastId: function(results) {
    //console.log(results);
    if(results && results.command == 'INSERT' && results.rows && results.rows.length == 1) {
      for(var key in results.rows[0]) {
        results.lastId = results.rows[0][key];
        break;
      }
    }
  },

  runSql2: function(sql, callback) {
    //console.log(sql);
    var self = this;
    this.client.query(sql, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      if(results.command == 'SELECT') {
        results = results.rows;
      }
      callback(null, results);
    });
  },

  runSql3: function(sql, values, callback) {
    //console.log(sql);
    var self = this;
    this.client.query(sql, values, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      if(results.command == 'SELECT') {
        results = results.rows;
      }
      callback(null, results);
    });
  },

  runSqlAll: function(sql, params, callback) {
    this.runSql(sql, params, callback);
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    // todo: check with the pg project to see if there is a way to do "each" as opposed to getting all the results back
    this.runSql(sql, params, function(err, rows) {
      if(err) { callback(err); return; }
      for(var i=0; i<rows.length; i++) {
        callback(null, rows[i]);
      }
      doneCallback();
    });
  }
});

module.exports = PostgreSqlDriver;
