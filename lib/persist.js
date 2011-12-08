
var util = require('util');
var Model = require('./model');

exports.Ascending = "asc";
exports.Descending = "desc";

exports.String = "string";
exports.Integer = "int";
exports.DateTime = "datetime";

exports.define = function(name, columnDefs) {
  return Model.define(name, columnDefs);
}

exports.connect = function(opts, callback) {
  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
}
