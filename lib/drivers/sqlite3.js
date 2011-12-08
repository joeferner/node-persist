
var Driver = require('../driver');
var Connection = require('../connection');
var sqlite3 = require('sqlite3').verbose();

var Sqlite3Driver = Driver.extend({
  init: function() {
    this._super();
  },

  connect: function(opts, callback) {
    var filename = opts.filename;
    if(!filename) throw new Error("Sqlite3 driver requires 'filename'");
    var trace = opts.trace;

    var db = new sqlite3.Database(filename);
    if(trace) {
      db.on('trace', function(sql) {
        console.log(sql);
      });
    }
    var connection = new Sqlite3Connection(this, db);
    callback(null, connection);
  }
});

var Sqlite3Connection = Connection.extend({
  init: function(driver, db) {
    this._super(driver);
    this.db = db;
  },

  close: function() {
    this.db.close();
  },

  beginTransaction: function(callback) {
    this.runSql("BEGIN TRANSACTION", callback);
  },

  commitTransaction: function(callback) {
    this.runSql("COMMIT TRANSACTION", callback);
  },

  rollbackTransaction: function(callback) {
    this.runSql("ROLLBACK TRANSACTION", callback);
  },

  runSql: function() {
    var stmt;
    if(arguments.length == 2) { // sql, callback
      var callback = arguments[1];
      this.db.run(arguments[0], function(err) {
        if(err) { callback(err); return; }
        callback(null, {});
      });
    } else if(arguments.length == 3) { // sql, values, callback
      var callback = arguments[2];
      stmt = this.db.prepare(arguments[0], function(err) {
        if(err) callback(err);
      });
      stmt.run(arguments[1], function(err) {
        if(err) { callback(err); return; }
        callback(null, {
          lastId: stmt.lastID,
          changes: stmt.changes
        });
      });
      stmt.finalize();
    }
  },

  runSqlAll: function(sql, params, callback) {
    this.db.all(sql, params, callback);
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    this.db.each(sql, params, callback, doneCallback);
  }
});

module.exports = Sqlite3Driver;
