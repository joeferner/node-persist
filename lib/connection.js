
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

  // sql, values, callback
  // sql, callback
  runSql: function() {
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
