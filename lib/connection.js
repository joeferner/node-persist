
var util = require('util');
var persistUtils = require('./persist_utils');
var Transaction = require('./transaction');

var Connection = persistUtils.Class.extend({
  init: function(driver) {
    this.driver = driver;
  },

  save: function(obj, callback) {
    var self = this;
    if(obj instanceof Array) {
      if(obj.length == 0) {
        callback(null);
      }
      else {
        this.save(obj[0], function(err) {
          if(err) { callback(err); return; }
          self.save(obj.slice(1), callback);
        });
      }
      return;
    }

    var sqlAndValues = this.driver.getInsertSql(obj);
    this.runSql(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) { callback(err); return; }
      if(data.lastId) {
        var idPropName = obj._model.getIdPropertyName();
        obj[idPropName] = data.lastId;
      }
      obj._connection = self;
      obj._persisted = true;
      callback(null, obj);
    });
  },

  update: function(obj, callback) {
    var sqlAndValues = this.driver.getUpdateSql(obj);
    this.runSql(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) { callback(err); return; }
      if(data.lastId) {
        var idPropName = obj._model.getIdPropertyName();
        obj[idPropName] = data.lastId;
      }
      obj._persisted = true;
      callback(null, obj);
    });
  },

  each: function(sqlTree, callback, doneCallback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this.runSqlEach(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) { callback(err); return; }
      var obj = sqlTree.toObject(data);
      obj._connection = self;

      callback(null, obj);
    }, function() {
      if(doneCallback) {
        doneCallback();
      }
    });
  },

  all: function(sqlTree, callback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this.runSqlAll(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) { callback(err); return; }
      var objs = sqlTree.toObjects(data);

      // add connections to all the objects
      for(var i=0; i<objs.length; i++) {
        objs[i]._connection = self;
      }

      callback(null, objs);
    });
  },

  count: function(sqlTree, callback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this.runSqlAll(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) { callback(err); return; }
      callback(null, data[0].count);
    });
  },

  // [sql, ...], values, callback
  // [sql, ...], callback
  // sql, values, callback
  // sql, callback
  runSql: function() {
    if(arguments[0] instanceof Array) {
      var args = arguments;
      var self = this;
      if(arguments[0].length == 0) {
        arguments[arguments.length-1]();
        return;
      }
      if(arguments[0].length > 1) {
        if(arguments.length == 2) { // [sql, ...], callback
          this.runSql(arguments[0][0], function(err, results) {
            if(err) { args[1](err); return; }
            self.runSql(args[0].slice(1), args[1]);
          });
        }
        if(arguments.length == 3) { // [sql, ...], values, callback
          this.runSql(arguments[0][0], function(err, results) {
            if(err) { args[2](err); return; }
            self.runSql(args[0].slice(1), args[1], args[2]);
          });
        }
        return;
      }
      if(arguments[0].length == 1) {
        arguments[0] = arguments[0][0];
      }
    }
    
    var stmt;
    if(arguments.length == 2) { // sql, callback
      this.runSql2(arguments[0], arguments[1]);
    } else if(arguments.length == 3) { // sql, values, callback
      this.runSql3(arguments[0], arguments[1], arguments[2]);
    }
  },
  
  runSql2: function(sql, callback) {
    throw new Error("Not Implemented");
  },

  runSql3: function(sql, callback) {
    throw new Error("Not Implemented");
  },

  runSqlAll: function(sql, params, callback) {
    throw new Error("Not Implemented");
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    throw new Error("Not Implemented");
  },

  close: function() {
    throw new Error("Not Implemented");
  },

  tx: function(callback) {
    var self = this;
    this.beginTransaction(function(err) {
      if(err) { callback(err); return; }
      callback(null, new Transaction(self));
    });
  },

  beginTransaction: function(callback) {
    throw new Error("Not Implemented");
  },

  commitTransaction: function(callback) {
    throw new Error("Not Implemented");
  },

  rollbackTransaction: function(callback) {
    throw new Error("Not Implemented");
  },
});

module.exports = Connection;
