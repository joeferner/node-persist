
var util = require('util');
var Model = require('./model');
exports.type = require('./type');

exports.Ascending = "asc";
exports.Descending = "desc";

exports.define = function(name, columnDefs) {
  return Model.define(name, columnDefs);
}

exports.connect = function(opts, callback) {
  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
}
