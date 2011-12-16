
var util = require('util');
var fs = require('fs');
var path = require('path');
var Model = require('./model');
exports.type = require('./type');

exports.Ascending = "asc";
exports.Descending = "desc";

var defaultConnectOptions = null;

exports.define = function(name, columnDefs) {
  return Model.define(name, columnDefs);
}

// opts, callback
// callback        - use database.json for connection information
exports.connect = function() {
  var callback = arguments[arguments.length - 1];
  if(arguments.length == 1) {
    opts = getDefaultConnectOptions();
  } else {
    opts = arguments[0];
  }

  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
}

setDefaultConnectOptions = exports.setDefaultConnectOptions = function(options) {
  defaultConnectOptions = options;
}

getDefaultConnectOptions = exports.getDefaultConnectOptions = function() {
  return defaultConnectOptions;
}

loadDatabaseJson = exports.loadDatabaseJson = function(path) {
  var databaseJson = JSON.parse(fs.readFileSync(path).toString());
  setDefaultConnectOptions(databaseJson[databaseJson['default']]);
}

tryLoadDatabaseJson = exports.tryLoadDatabaseJson = function(path) {
  try {
    var stats = fs.statSync(path);
    if(stats) {
      loadDatabaseJson(path);
    }
  } catch(e) {
    // fail silently this is only a tryLoad.
  }
}

tryLoadDatabaseJson(path.join(process.cwd(), "database.json"));
