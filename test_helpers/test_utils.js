
var fs = require("fs");

var driver = "sqlite3";

exports.personCreateStmt = "CREATE TABLE IF NOT EXISTS Person (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", name text, age INTEGER, txt TEXT, last_updated text, created_date text) " + (driver=='mysql'?'engine=innodb':'') + ";";
exports.phoneCreateStmt = "CREATE TABLE IF NOT EXISTS Phone (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", number text, person_id INTEGER) " + (driver=='mysql'?'engine=innodb':'') + ";";

exports.connect = function(persist, callback) {
  if(driver == 'sqlite3') {
    fs.unlink('test.db', function() {
      persist.connect({
        driver: 'sqlite3',
        //trace: true
        filename: ':memory:'
        //filename: 'test.db'
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