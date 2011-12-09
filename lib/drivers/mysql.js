
var Driver = require('../driver');
var Connection = require('../connection');
var mysql = require('mysql')

var MySqlDriver = Driver.extend({
  init: function() {
    this._super();
  },

  connect: function(opts, callback) {
    var db = new mysql.createClient(opts);
    var connection = new MySqlConnection(this, db);
    callback(null, connection);
  }
});

var MySqlConnection = Connection.extend({
  init: function(driver, db) {
    this._super(driver);
    this.db = db;
  },

  close: function() {
    this.db.end();
  },

  beginTransaction: function(callback) {
    this.runSql(["SET autocommit=0", "START TRANSACTION"], callback);
  },

  commitTransaction: function(callback) {
    this.runSql("COMMIT", callback);
  },

  rollbackTransaction: function(callback) {
    this.runSql("ROLLBACK", callback);
  },

  updateLastId: function(results) {
    if(results.insertId) {
      results.lastId = results.insertId;
    }
    if(results.affectedRows) {
      results.changes = results.affectedRows;
    }
  },

  runSql2: function(sql, callback) {
    var self = this;
    this.db.query(sql, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      callback(null, results);
    });
  },

  runSql3: function(sql, values, callback) {
    var self = this;
    this.db.query(sql, values, function(err, results) {
      if(err) { callback(err); return; }
      self.updateLastId(results);
      callback(null, results);
    });
  },

  runSqlAll: function(sql, params, callback) {
    this.runSql(sql, params, callback);
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    // todo: check with the mysql project to see if there is a way to do "each" as opposed to getting all the results back
    this.runSql(sql, params, function(err, rows) {
      if(err) { callback(err); return; }
      for(var i=0; i<rows.length; i++) {
        callback(null, rows[i]);
      }
      doneCallback();
    });
  }
});

module.exports = MySqlDriver;
