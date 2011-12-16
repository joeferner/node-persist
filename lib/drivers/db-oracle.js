
var Driver = require('../driver');
var Connection = require('../connection');
var oracle = require('db-oracle');
var util = require('util');

var OracleDriver = Driver.extend({
  init: function() {
    this._super();
  },

  connect: function(opts, callback) {
    var self = this;
    var client = new oracle.Database(opts);
    client.connect(function(err) {
      if(err) { callback(err); return; }
      var connection = new OracleConnection(self, client);
      callback(null, connection);
    });
  },

  getInsertSql: function(obj) {
    var columnNamesSql = [];
    var valuesSql = [];
    var values = [];
    var valueSubstitutionIndex = 1;
    var autoIncrementColumnName;

    for(var columnKey in obj._model().columns) {
      var column = obj._model().columns[columnKey];
      if(column.primaryKey && column.autoIncrement) {
        autoIncrementColumnName = column.dbColumnName;
      } else {
        columnNamesSql.push(column.dbColumnName);
        valuesSql.push(this.getValuesSubstitutionString(valueSubstitutionIndex++));
        values.push(obj[columnKey]);
      }
    }

    var returningSql = '';
    if(autoIncrementColumnName) {
      returningSql = 'RETURNING ' + autoIncrementColumnName + ' INTO ?';
      values.push('');
    }

    var sql = util.format('INSERT INTO %s (%s) VALUES (%s) %s', obj._model().modelName, columnNamesSql.join(','), valuesSql.join(','), returningSql);
    var result = { sql: sql, values: values };
    //console.log(result);
    return result;
  },
});

var OracleConnection = Connection.extend({
  init: function(driver, client) {
    this._super(driver);
    this.client = client;
  },

  close: function() {
    this.client.end();
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
    console.log(results);
    results.lastId = results.id;
  },

  runSql2: function(sql, callback) {
    //console.log('2', sql);
    var self = this;
    this.client.query().execute(sql, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      if(results.command == 'SELECT') {
        results = results.rows;
      }
      callback(null, results);
    });
  },

  runSql3: function(sql, values, callback) {
    // TODO: temporary fix
    if(values) {
      for(var i=0; i<values.length; i++) {
        if(typeof(values[i]) == 'string') {
          values[i] = values[i].replace(/'/, "");
        }
      }
    }

    console.log('3', sql, values);
    var self = this;
    this.client.query().execute(sql, values, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      callback(null, results);
    });
  },

  runSqlAll: function(sql, params, callback) {
    this.runSql(sql, params, callback);
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    // todo: check with the db-oracle project to see if there is a way to do "each" as opposed to getting all the results back
    this.runSql(sql, params, function(err, rows) {
      if(err) { callback(err); return; }
      for(var i=0; i<rows.length; i++) {
        callback(null, rows[i]);
      }
      doneCallback();
    });
  }
});

module.exports = OracleDriver;
