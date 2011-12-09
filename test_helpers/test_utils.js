
var fs = require("fs");

var driver = "sqlite3";

exports.personCreateStmt = "CREATE TABLE IF NOT EXISTS Person (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", name text, lastUpdated text) " + (driver=='mysql'?'engine=innodb':'') + ";";
exports.phoneCreateStmt = "CREATE TABLE IF NOT EXISTS Phone (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", number text, personId INTEGER) " + (driver=='mysql'?'engine=innodb':'') + ";";

exports.connect = function(persist, callback) {
  if(driver == 'sqlite3') {
    fs.unlink('test.db', function() {
      persist.connect({
        driver: 'sqlite3',
        filename: ':memory:',
        //filename: 'test.db',
        trace: true
      }, callback);
    });
  } else {
    persist.connect({
      driver: 'mysql',
      user: 'root',
      password: 'root',
      database: 'test'
    }, callback);
    
  }
}