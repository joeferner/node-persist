'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var Model = require('./model');

exports.type = require('./type');
exports.Query = require('./query');

exports.Ascending = "asc";
exports.Descending = "desc";
exports.env = null;

var defaultConnectOptions = null;

exports.define = function (name, columnDefs) {
  return Model.define(name, columnDefs);
};

var setDefaultConnectOptions = exports.setDefaultConnectOptions = function (options) {
  defaultConnectOptions = options;
};

var getDefaultConnectOptions = exports.getDefaultConnectOptions = function () {
  return defaultConnectOptions;
};

// opts, callback
// callback        - use database.json for connection information
exports.connect = function () {
  var callback = arguments[arguments.length - 1];
  var opts;
  if (arguments.length === 1) {
    opts = getDefaultConnectOptions();
  } else {
    opts = arguments[0];
  }

  if (!opts || !opts.driver) {
    throw new Error("Invalid options. Have you configured your database.json file?");
  }
  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
};

function createConnectionDelegate(fnName) {
  return function () {
    var conn = arguments[0];
    if (conn && conn.driver && conn.db) {
      return conn[fnName].apply(conn, Array.prototype.slice.call(arguments, 1));
    } else {
      var args = Array.prototype.slice.call(arguments);
      var fn = function (connection, callback) {
        var newArgs = args.concat(callback);
        return connection[fnName].apply(connection, newArgs);
      };
      fn._name = fnName;
      return fn;
    }
  }
}

exports.runSql = createConnectionDelegate('runSql');
exports.runSqlAll = createConnectionDelegate('runSqlAll');
exports.runSqlEach = createConnectionDelegate('runSqlEach');
exports.runSqlFromFile = createConnectionDelegate('runSqlFromFile');
exports.runSqlAllFromFile = createConnectionDelegate('runSqlAllFromFile');
exports.runSqlEachFromFile = createConnectionDelegate('runSqlEachFromFile');

var loadDatabaseJson = exports.loadDatabaseJson = function (pathStr) {
  var databaseJson = JSON.parse(fs.readFileSync(pathStr).toString());
  var env = exports.env || databaseJson['default'];
  var opts = databaseJson[env];
  opts.sqlDir = path.join(path.dirname(pathStr), opts.sqlDir || 'sql');
  setDefaultConnectOptions(opts);
};

var tryLoadDatabaseJson = exports.tryLoadDatabaseJson = function (path) {
  try {
    var stats = fs.statSync(path);
    if (stats) {
      loadDatabaseJson(path);
    }
  } catch (e) {
    // fail silently this is only a tryLoad.
  }
};

tryLoadDatabaseJson(path.join(process.cwd(), "database.json"));
