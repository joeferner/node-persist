
var fs = require("fs");

exports.connect = function(persist, callback) {
  fs.unlink('test.db', function() {
    persist.connect({
      driver: 'sqlite3',
      filename: ':memory:',
      //filename: 'test.db',
      trace: true
    }, callback);
  });
}