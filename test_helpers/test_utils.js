
var fs = require("fs");

var driver = "sqlite3";

exports.personCreateStmt = personCreateStmt = "CREATE TABLE IF NOT EXISTS People (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", name text, age INTEGER, txt TEXT, last_updated text, created_date text) "
  + (driver=='mysql'?'engine=innodb':'') + ";";
exports.phoneCreateStmt = phoneCreateStmt = "CREATE TABLE IF NOT EXISTS Phones (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", number text, person_id INTEGER) "
  + (driver=='mysql'?'engine=innodb':'') + ";";
exports.companyCreateStmt = companyCreateStmt = "CREATE TABLE IF NOT EXISTS Companies (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", name text) "
  + (driver=='mysql'?'engine=innodb':'') + ";";
exports.companyPersonCreateStmt = companyPersonCreateStmt = "CREATE TABLE IF NOT EXISTS CompanyPerson ( company_id INTEGER, person_id INTEGER, PRIMARY KEY(company_id, person_id)) " + (driver=='mysql'?'engine=innodb':'') + ";";

exports.connect = function(persist, callback) {
  var mycallback = function(err, connection) {
    if(err) { callback(err); return; }
    var stmts = [
      personCreateStmt,
      phoneCreateStmt,
      companyPersonCreateStmt,
      companyCreateStmt,
      "DELETE FROM Phones;",
      "DELETE FROM People;",
      "DELETE FROM CompanyPerson;",
      "DELETE FROM Companies;"
    ];
    connection.runSql(stmts, function(err, results) {
      if(err) { callback(err); return; }

      if(driver == 'postgresql') {
        stmts = [
          'CREATE SEQUENCE phone_seq',
          'CREATE SEQUENCE person_seq',
          'CREATE SEQUENCE company_seq',
          "ALTER TABLE Phones ALTER COLUMN id SET DEFAULT NEXTVAL('phone_seq')",
          "ALTER TABLE People ALTER COLUMN id SET DEFAULT NEXTVAL('person_seq')",
          "ALTER TABLE Companies ALTER COLUMN id SET DEFAULT NEXTVAL('company_seq')"
        ];
        connection.runSql(stmts, function(err, results) {
          callback(null, connection); // CREATE SEQUENCE may have already ran so throw away the errors
        });
      } else {
        callback(null, connection);
      }
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
  } else if(driver == 'postgresql') {
    persist.connect({
      driver: 'pg',
      "connectionString": "tcp://test:test@localhost/test"
    }, mycallback);
  } else {
    persist.connect({
      driver: 'mysql',
      user: 'root',
      password: 'root',
      database: 'test'
    }, mycallback);

  }
}