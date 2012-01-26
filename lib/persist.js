'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var Model = require('./model');

exports.type = require('./type');
exports.Query = require('./query');

exports.Ascending = "asc";
exports.Descending = "desc";

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

  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
};

var loadDatabaseJson = exports.loadDatabaseJson = function (path) {
  var databaseJson = JSON.parse(fs.readFileSync(path).toString());
  setDefaultConnectOptions(databaseJson[databaseJson['default']]);
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
