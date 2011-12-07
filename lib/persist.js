

exports.define = function() {
  var result = function() {
  };

  result.hasMany = function() { return this; };
  result.hasOne = function() { return this; };

  return result;
}