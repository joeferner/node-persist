
var util = require('util');
var persistUtils = require('./persist_utils');
var Transaction = require('./transaction');

var Connection = persistUtils.Class.extend({
  init: function(driver) {
    this.driver = driver;
  },

  save: function(obj, callback) {
    var sqlAndValues = this.driver.getInsertSql(obj);
    this.runSql(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) callback(err);
      if(data.lastId) {
        var idPropName = obj._model.getIdPropertyName();
        obj[idPropName] = data.lastId;
      }
      callback(null, obj);
    });
  },

  all: function(sqlTree, callback) {
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this.runSqlAll(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if(err) callback(err);
      var objs = sqlTree.toObjects(data);
      callback(null, objs);
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

  close: function() {
    throw new Error("Not Implemented");
  },

  tx: function(callback) {
    callback(null, new Transaction(this));
  }
});

module.exports = Connection;
