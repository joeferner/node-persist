
var util = require('util');
var persistUtils = require('./persist_utils');
var Transaction = require('./transaction');
var async = require('async');

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

  chain: function(tasks, chainCallback) {
    var self = this;
    async.mapSeries(tasks, function(item, callback){
      if(typeof(item) == 'function') {
        if(item._name == 'save' || item._name == 'delete') {
          item.call(item, self, callback);
        } else if(item._name == 'all' || item._name == 'first' || item._name == 'count' || item._name == 'deleteAll') {
          item.call(item, callback);
        } else {
          var e = item._name ? item._name : item;
          callback(new Error('Invalid function for chaining "' + e + '".'));
        }
      } else {
        callback(new Error('Invalid item for chaining.'));
      }
    }, chainCallback);
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
    var self = this;
    var args = arguments;
    // todo: there has to be a better way to handle this mess.
    // todo: when it's an array the results to callback should be an array of results.
    if(arguments[0] instanceof Array) {
      runSqlCallback = args[arguments.length-1];
      if(typeof(runSqlCallback) != "function") runSqlCallback = function(){};

      async.mapSeries(arguments[0], function(item, callback) {
        if(args.length == 2) {
          self.runSql(item, callback);
        } else if(args.length == 3) {
          self.runSql(item, args[1], callback);
        } else {
          throw new Error("invalid number of arguments");
        }
      }, runSqlCallback);
      return;
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

  runSql3: function(sql, values, callback) {
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
