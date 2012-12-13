'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var Transaction = require('./transaction');
var async = require('async');
var Class = require('./class');
var over = require('over');

var Connection = Class.extend({
  init: function(driver, opts) {
    this.driver = driver;
    this.opts = opts || {};
  },

  save: function(obj, callback) {
    var self = this;
    if (obj instanceof Array) {
      if (obj.length === 0) {
        callback(null);
      } else {
        this.save(obj[0], function(err) {
          if (err) {
            callback(err);
            return;
          }
          self.save(obj.slice(1), callback);
        });
      }
      return;
    }

    this._save(true, obj, callback);
  },

  update: function(obj, callback) {
    var self = this;
    if (obj instanceof Array) {
      if (obj.length === 0) {
        callback(null);
      } else {
        this.update(obj[0], function(err) {
          if (err) {
            callback(err);
            return;
          }
          self.update(obj.slice(1), callback);
        });
      }
      return;
    }

    this._save(false, obj, callback);
  },

  _save: function(isNew, obj, callback) {
    var self = this;

    if (obj.validate && typeof(obj.validate) === 'function') {
      return obj.validate(function(success, message) {
        if (success) {
          return doModelValidation();
        }
        return callback(new Error("Validation failed: " + message));
      });
    } else {
      return doModelValidation();
    }

    function doModelValidation() {
      if (obj._getModel().validate) {
        return obj._getModel().validate(obj, function(success, message) {
          if (success) {
            return doSave();
          }
          return callback(new Error("Validation failed: " + message));
        });
      } else {
        return doSave();
      }
    }

    function doOnSave(callback) {
      if (obj._getModel().onSave) {
        return obj._getModel().onSave(obj, self, callback);
      }

      callback();
    }

    function doSave() {
      doOnSave(function() {
        obj._getModel().emit("beforeSave", obj);

        if (isNew) {
          obj._getModel().emit("beforeCreate", obj);
        } else {
          obj._getModel().emit("beforeUpdate", obj);
        }

        var sqlAndValues;
        if (isNew) {
          sqlAndValues = self.driver.getInsertSql(obj);
        } else {
          sqlAndValues = self.driver.getUpdateSql(obj);
        }
        self._runSql(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
          if (err) {
            callback(err);
            return;
          }
          if (isNew && data.lastId) {
            var idPropName = obj._getModel().getIdPropertyName();
            obj[idPropName] = data.lastId;
          }
          obj._getConnection = function() { return self; }; // hide from JSON.stringify
          obj._isPersisted = function() { return true; };
          self.saveAssociations(obj, function(err, obj) {
            if (isNew) {
              obj._getModel().emit("afterCreate", obj);
              obj._getModel().emit("afterSave", obj);
            } else {
              obj._getModel().emit("afterUpdate", obj);
              obj._getModel().emit("afterSave", obj);
            }

            callback.apply(self, arguments);
          });
        });
      });
    }
  },

  updatePartial: function(model, id, data, callback) {
    function doOnSave(callback) {
      if (model.onSave) {
        return model.onSave(data, self, callback);
      }

      callback();
    }

    var self = this;

    doOnSave(function() {
      var sqlAndValues = self.driver.getUpdatePartialSql(model, id, data);
      self._runSql(sqlAndValues.sql, sqlAndValues.values, callback);
    });
  },

  chain: function(tasks, chainCallback) {
    var self = this;
    if (tasks instanceof Array) {
      async.mapSeries(tasks, function(item, callback) {
        if (typeof (item) === 'function') {
          item.call(item, self, callback);
        } else {
          callback(new Error('Invalid item for chaining.'));
        }
      }, chainCallback);
    } else {
      var items = [];
      var key;
      for (key in tasks) {
        items.push({ key: key, task: tasks[key] });
      }
      async.mapSeries(items, function(item, callback) {
        item.task.call(item.task, self, function(err, value) {
          if (err) {
            callback(err);
            return;
          }
          var v = { key: item.key, value: value };
          callback(null, v);
        });
      }, function(err, items) {
        if (err) {
          chainCallback(err);
          return;
        }
        var results = {};
        var i;
        for (i = 0; i < items.length; i++) {
          results[items[i].key] = items[i].value;
        }
        chainCallback(null, results);
      });
    }
  },

  saveAssociation: function(obj, name, association, callback) {
    var self = this;
    if (association.type === 'hasMany' && obj['_' + name] && association.through) {
      var relatedObjs = obj['_' + name];
      var Query = require('./query'); // late bind query because it causes a circular reference
      new Query(this, association.through)
        .where(association.foreignKey + " = ?", obj.getId())
        .deleteAll(function(err, deleteCallback) {
          async.forEachSeries(relatedObjs, function(relatedObj, saveRelatedObjCallback) {
            var sqlAndValues = self.driver.getManyToManyInsertSql(association, obj, relatedObj);
            self._runSql(sqlAndValues.sql, sqlAndValues.values, saveRelatedObjCallback);
          }, callback);
        });
    } else {
      callback(null);
    }
  },

  saveAssociations: function(obj, callback) {
    var self = this;
    var associations = [];
    var name;
    for (name in obj._getModel().associations) {
      associations.push({
        name: name,
        association: obj._getModel().associations[name]
      });
    }

    async.forEachSeries(associations, function(association, saveAssociationCallback) {
      self.saveAssociation(obj, association.name, association.association, saveAssociationCallback);
    }, function(err) {
      callback(err, obj);
    });
  },

  each: function(sqlTree, callback, doneCallback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this._runSqlEach(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      var obj = sqlTree.toObject(data);
      obj._getConnection = function() { return self; }; // hide from JSON.stringify

      callback(null, obj);
    }, function() {
      if (doneCallback) {
        doneCallback();
      }
    });
  },

  _resultsArrayGetById: function(model, array, id) {
    var i;
    for (i = 0; i < array.length; i++) {
      var itemId = array[i].getId();
      if (itemId === id) {
        return array[i];
      }
    }
    return null;
  },

  _augmentResultsArrayWithHelpers: function(model, array) {
    array.getById = this._resultsArrayGetById.bind(this, model, array);
  },

  all: function(sqlTree, callback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    if (self.opts.trace) {
      console.log(sqlAndValues.sql, sqlAndValues.values);
    }
    this._runSqlAll(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      var objs = sqlTree.toObjects(data);

      // add connections to all the objects
      var i;
      var selfFunc = function() { return self; };
      for (i = 0; i < objs.length; i++) {
        objs[i]._getConnection = selfFunc; // hide from JSON.stringify
      }

      if (typeof (sqlTree.model) === "function") {
        self._augmentResultsArrayWithHelpers(sqlTree.model(), objs);
      }

      callback(null, objs);
    });
  },

  single: function(sqlTree, fieldName, callback) {
    var self = this;
    var sqlAndValues = this.driver.getSqlFromSqlTree(sqlTree);
    this._runSqlAll(sqlAndValues.sql, sqlAndValues.values, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, data[0][fieldName]);
    });
  },

  // filename, values, callback
  // filename, callback
  runSqlFromFile: over([
    [over.string, over.arrayOptionalWithDefault(null), over.callbackOptional, function(filename, params, callback) {
      this._readSqlFile(filename, function(err, sql) {
        if (err) {
          return callback(err);
        }
        self.runSql(sql, params, callback);
      });
    }]
  ]),

  runSqlAllFromFile: function(filename, params, callback) {
    var self = this;
    if (arguments.length === 2) {
      return this.runSqlAllFromFile(filename, null, arguments[1]);
    }
    this._readSqlFile(filename, function(err, sql) {
      if (err) {
        return callback(err);
      }
      self.runSqlAll(sql, params, callback);
    });
  },

  runSqlEachFromFile: function(filename, params, rowCallback, doneCallback) {
    var self = this;
    if (arguments.length === 3) {
      return this.runSqlEachFromFile(filename, null, arguments[1], arguments[2]);
    }
    this._readSqlFile(filename, function(err, sql) {
      if (err) {
        return callback(err);
      }
      self.runSqlEach(sql, params, callback);
    });
  },

  _readSqlFile: function(filename, callback) {
    async.detect([
      filename,
      filename + '.sql',
      path.join(this.opts.sqlDir, filename),
      path.join(this.opts.sqlDir, filename) + '.sql'
    ], fs.exists, function(fname) {
      if (!fname) {
        return callback(new Error("Could not find SQL file. " + filename));
      }
      fs.readFile(fname, 'utf8', function(err, sql) {
        if (err) {
          return callback(new Error('Could not read SQL file. ' + filename + '. ' + err));
        }
        return callback(null, sql);
      });
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
    if (arguments[0] instanceof Array) {
      var runSqlCallback = args[arguments.length - 1];
      if (typeof (runSqlCallback) !== "function") { runSqlCallback = function() {}; }

      async.mapSeries(arguments[0], function(item, callback) {
        if (args.length === 2) {
          self._runSql(item, callback);
        } else if (args.length === 3) {
          self._runSql(item, args[1], callback);
        } else {
          throw new Error("invalid number of arguments");
        }
      }, runSqlCallback);
      return;
    }

    var sql = arguments[0];
    var callback;
    sql = this.driver._updateSubstitutes(sql);
    if (arguments.length === 2) { // sql, callback
      callback = arguments[1];
      return this._runSql(sql, callback);
    } else if (arguments.length === 3) { // sql, values, callback
      var values = arguments[1];
      callback = arguments[2];
      return this._runSql(sql, values, callback);
    }
  },

  // [sql, ...], values, callback
  // [sql, ...], callback
  // sql, values, callback
  // sql, callback
  _runSql: function() {
    var self = this;
    var args = arguments;
    // todo: there has to be a better way to handle this mess.
    // todo: when it's an array the results to callback should be an array of results.
    if (arguments[0] instanceof Array) {
      var runSqlCallback = args[arguments.length - 1];
      if (typeof (runSqlCallback) !== "function") { runSqlCallback = function() {}; }

      async.mapSeries(arguments[0], function(item, callback) {
        if (args.length === 2) {
          self._runSql(item, callback);
        } else if (args.length === 3) {
          self._runSql(item, args[1], callback);
        } else {
          throw new Error("invalid number of arguments");
        }
      }, runSqlCallback);
      return;
    }

    var sql = arguments[0];
    var callback;
    if (arguments.length === 2) { // sql, callback
      callback = arguments[arguments.length - 1];
      try {
        if (self.opts.trace) {
          console.log(sql);
        }
        this._runSql2(sql, callback);
      } catch (ex1) {
        ex1.sql = sql;
        ex1.values = null;
        throw ex1;
      }
    } else if (arguments.length === 3) { // sql, values, callback
      var values = arguments[1];
      callback = arguments[2];
      try {
        if (self.opts.trace) {
          console.log(sql, values);
        }
        if (values) {
          this._runSql3(sql, values, callback);
        } else {
          this._runSql2(sql, callback);
        }
      } catch (ex2) {
        ex2.sql = sql;
        ex2.values = values;
        callback(ex2);
      }
    } else {
      throw new Error("Invalid number of arguments");
    }
  },

  _runSql2: function(sql, callback) {
    throw new Error("Not Implemented");
  },

  _runSql3: function(sql, values, callback) {
    throw new Error("Not Implemented");
  },

  _runSqlAll: function(sql, params, callback) {
    throw new Error("Not Implemented");
  },

  // sql, [callback]
  // sql, params, [callback]
  runSqlAll: over([
    [over.string, over.arrayOptional, over.callbackOptional, function(sql, params, callback) {
      sql = this.driver._updateSubstitutes(sql, params);
      return this._runSqlAll(sql, params, callback);
    }]
  ]),

  _runSqlEach: function(sql, params, callback, doneCallback) {
    throw new Error("Not Implemented");
  },

  runSqlEach: function(sql, params, callback, doneCallback) {
    sql = this.driver._updateSubstitutes(sql, params);
    return this._runSqlEach(sql, params, callback, doneCallback);
  },

  close: function() {
    throw new Error("Not Implemented");
  },

  tx: function(callback) {
    var self = this;
    this.beginTransaction(function(err) {
      if (err) {
        callback(err);
        return;
      }
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
  }
});

module.exports = Connection;
