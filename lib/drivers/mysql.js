'use strict';

var Driver = require('../driver');
var Connection = require('../connection');
var mysql = require('mysql');

var MySqlConnection = Connection.extend({
  init: function (driver, db, createdConnection, opts) {
    this._super(driver, opts);
    this.db = db;
    this.createdConnection = createdConnection;
  },

  close: function () {
    if (this.createdConnection) {
      this.db.end();
    }
  },

  beginTransaction: function (callback) {
    this._runSql(["SET autocommit=0", "START TRANSACTION"], callback);
  },

  commitTransaction: function (callback) {
    this._runSql("COMMIT", callback);
  },

  rollbackTransaction: function (callback) {
    this._runSql("ROLLBACK", callback);
  },

  updateLastId: function (results) {
    if (results.insertId) {
      results.lastId = results.insertId;
    }
    if (results.affectedRows) {
      results.changes = results.affectedRows;
    }
  },

  _runSql2: function (sql, callback) {
    var self = this;
    this.db.query(sql, function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      self.updateLastId(results);
      callback(null, results);
    });
  },

  _runSql3: function (sql, values, callback) {
    var self = this;
    this.db.query(sql, values, function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      self.updateLastId(results);
      callback(null, results);
    });
  },

  _runSqlAll: function (sql, params, callback) {
    this._runSql(sql, params, callback);
  },

  _runSqlEach: function (sql, params, callback, doneCallback) {
    // todo: check with the mysql project to see if there is a way to do "each" as opposed to getting all the results back
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

var MySqlDriver = Driver.extend({
  init: function () {
    this._super();
  },

  connect: function (opts, callback) {
    var conn;
    if (opts.db) {
      conn = new MySqlConnection(this, opts.db, false, opts);
      callback(null, conn);
    } else {
      var db;
      if (typeof(mysql.createConnection) === 'undefined') {
        db = new mysql.createClient(opts);
      } else {
        db = new mysql.createConnection(opts);
        db.connect(function(err) {
          if (err) {
            console.log(err);
          }
        });
      }
      conn = new MySqlConnection(this, db, true, opts);
      callback(null, conn);
    }
  },

  escapeColumnName: function (columnName) {
    return '`' + columnName + '`';
  }
});

module.exports = MySqlDriver;
