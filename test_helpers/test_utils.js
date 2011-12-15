
var fs = require("fs");

var driver = "sqlite3";

exports.personCreateStmt = personCreateStmt = "CREATE TABLE IF NOT EXISTS Person (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", name text, age INTEGER, txt TEXT, last_updated text, created_date text) " + (driver=='mysql'?'engine=innodb':'') + ";";
exports.phoneCreateStmt = phoneCreateStmt = "CREATE TABLE IF NOT EXISTS Phone (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", number text, person_id INTEGER) " + (driver=='mysql'?'engine=innodb':'') + ";";
exports.companyCreateStmt = companyCreateStmt = "CREATE TABLE IF NOT EXISTS Company (id INTEGER PRIMARY KEY " + (driver=='mysql'?'auto_increment':'') + ", name text) " + (driver=='mysql'?'engine=innodb':'') + ";";
exports.companyPersonCreateStmt = companyPersonCreateStmt = "CREATE TABLE IF NOT EXISTS CompanyPerson ( company_id INTEGER, person_id INTEGER, PRIMARY KEY(company_id, person_id)) " + (driver=='mysql'?'engine=innodb':'') + ";";

exports.connect = function(persist, callback) {
  var mycallback = function(err, connection) {
    if(err) { callback(err); return; }
    connection.runSql([
      personCreateStmt,
      phoneCreateStmt,
      companyPersonCreateStmt,
      companyCreateStmt,
      "DELETE FROM Phone;",
      "DELETE FROM Person;",
      "DELETE FROM CompanyPerson;",
      "DELETE FROM Company;"
    ], function(err, results) {
      callback(err, connection);
    });
  };

  if(driver == 'sqlite3') {
    fs.unlink('test.db', function() {
      persist.connect({
        driver: 'sqlite3',
        //trace: true,
        filename: ':memory:'
        //filename: 'test.db'
      }, mycallback);
    });
  } else {
    persist.connect({
      driver: 'mysql',
      user: 'root',
      password: 'root',
      database: 'test'
    }, mycallback);

  }
}