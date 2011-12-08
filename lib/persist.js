
var util = require('util');
var Model = require('./model');

exports.define = function(name, columnDefs) {
  return Model.define(name, columnDefs);
}

exports.connect = function(opts, callback) {
  var driverName = opts.driver;
  var Driver = require('./drivers/' + driverName + '.js');
  var driver = new Driver();
  driver.connect(opts, callback);
}
