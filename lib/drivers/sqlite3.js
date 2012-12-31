'use strict';

var Driver = require('../driver');
var Connection = require('../connection');
var sqlite3 = require('sqlite3').verbose();

var Sqlite3Connection = Connection.extend({
  init: function (driver, db, createdConnection, opts) {
    this._super(driver, opts);
    this.db = db;
    this.createdConnection = createdConnection;
  },

  close: function () {
    if (this.createdConnection) {
      this.db.close();
    }
  },

  beginTransaction: function (callback) {
    this._runSql("BEGIN TRANSACTION", callback);
  },

  commitTransaction: function (callback) {
    this._runSql("COMMIT TRANSACTION", callback);
  },

  rollbackTransaction: function (callback) {
    this._runSql("ROLLBACK TRANSACTION", callback);
  },

  _runSql2: function (sql, callback) {
    this.db.run(sql, function (err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, {});
    });
  },

  _runSql3: function (sql, values, callback) {
    var stmt = this.db.prepare(sql, function (err) {
      if (err) {
        callback(err);
        return;
      }
    });
    stmt.run(values, function (err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, {
        lastId: stmt.lastID,
        changes: stmt.changes
      });
    });
    stmt.finalize();
  },

  _runSqlAll: function (sql, params, callback) {
    this.db.all(sql, params, callback);
  },

  _runSqlEach: function (sql, params, callback, doneCallback) {
    this.db.each(sql, params, callback, doneCallback);
  }
});

var Sqlite3Driver = Driver.extend({
  init: function () {
    this._super();
  },

  connect: function (opts, callback) {
    var conn;
    if (opts.db) {
      conn = new Sqlite3Connection(this, opts.db, false);
      callback(null, conn);
    } else {
      var filename = opts.filename;
      if (!filename) { throw new Error("Sqlite3 driver requires 'filename'"); }
      var trace = opts.trace;

      var db = new sqlite3.Database(filename);
      if (trace) {
        db.on('trace', function (sql) {
          console.log(sql);
        });
      }
      conn = new Sqlite3Connection(this, db, true, opts);
      callback(null, conn);
    }
  },

  escapeColumnName: function (columnName) {
    return '"' + columnName + '"';
  }
});

module.exports = Sqlite3Driver;
