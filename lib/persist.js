

exports.define = function() {
  var result = function() {
    this.save = function(conn, callback) { callback(null, {}); };
  };

  result.all = function(callback) { callback(null, []); };
  result.hasMany = function() { return this; };
  result.hasOne = function() { return this; };

  return result;
}

exports.connect = function(opts, callback) {
  callback({
    tx: function(callback) {
      callback(null, {
        commit: function(callback) { callback(); },
        rollback: function(callback) { callback(); }
      });
    }
  });
}