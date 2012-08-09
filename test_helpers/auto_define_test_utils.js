
var fs = require("fs");

var driver = "sqlite3";

/* oracle
  CREATE SEQUENCE phone_seq start with 1 increment by 1 nomaxvalue;
  CREATE SEQUENCE person_seq start with 1 increment by 1 nomaxvalue;
  CREATE SEQUENCE company_seq start with 1 increment by 1 nomaxvalue;
  CREATE TABLE  Phones (id INTEGER PRIMARY KEY, numbr VARCHAR2(255), person_id INTEGER, modified_by_person_id INTEGER);
  CREATE TRIGGER phone_pk_trigger BEFORE INSERT ON Phones FOR EACH row
    BEGIN
      select phone_seq.nextval into :new.id from dual;
    END;
  /
  CREATE TABLE People (id INTEGER PRIMARY KEY , name VARCHAR2(255), age INTEGER, txt VARCHAR2(255), last_updated VARCHAR2(255), created_date VARCHAR2(255));
  CREATE TRIGGER person_pk_trigger BEFORE INSERT ON People FOR EACH row
    BEGIN
      select person_seq.nextval into :new.id from dual;
    END;
  /
  CREATE TABLE Companies (id INTEGER PRIMARY KEY , name VARCHAR2(255));
  CREATE TRIGGER company_pk_trigger BEFORE INSERT ON Companies FOR EACH row
    BEGIN
      select company_seq.nextval into :new.id from dual;
    END;
  /
  CREATE TABLE CompanyPerson ( company_id INTEGER, person_id INTEGER, PRIMARY KEY(company_id, person_id));
*/

var ifNotExistsSql = 'IF NOT EXISTS';
var textDateType = 'TEXT';
if(driver == 'oracle') {
  ifNotExistsSql = '';
  textDateType = 'VARCHAR2(255)';
}
exports.personCreateStmt = personCreateStmt = "CREATE TABLE "+ifNotExistsSql+" People (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", name "+textDateType+", age INTEGER, txt "+textDateType+", last_updated "+textDateType+", created_date "+textDateType+") "
  + (driver=='mysql'?'engine=innodb':'');
exports.phoneCreateStmt = phoneCreateStmt = "CREATE TABLE "+ifNotExistsSql+" Phones (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", numbr "+textDateType+", person_id INTEGER, modified_by_person_id INTEGER) "
  + (driver=='mysql'?'engine=innodb':'');
exports.companyCreateStmt = companyCreateStmt = "CREATE TABLE "+ifNotExistsSql+" Companies (id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", name "+textDateType+") "
  + (driver=='mysql'?'engine=innodb':'');
exports.companyPersonCreateStmt = companyPersonCreateStmt = "CREATE TABLE "+ifNotExistsSql+" CompanyPerson ( company_id INTEGER, person_id INTEGER PRIMARY KEY) " + (driver=='mysql'?'engine=innodb':'');
exports.primaryKeyTestCreateStmt = primaryKeyTestCreateStmt = "CREATE TABLE "+ifNotExistsSql+" PrimaryKeyTests (my_pk_id INTEGER PRIMARY KEY "
  + (driver=='mysql'?'auto_increment':'')
  + ", name "+textDateType+") "
  + (driver=='mysql'?'engine=innodb':'');

if(driver == "oracle") {
  exports.doNothingSql = "SELECT * FROM People";
} else {
  exports.doNothingSql = exports.personCreateStmt;
}

exports.connect = function(persist, callback) {
  var mycallback = function(err, connection) {
    if(err) { callback(err); return; }
    var stmts = [
      personCreateStmt,
      phoneCreateStmt,
      companyPersonCreateStmt,
      companyCreateStmt,
      primaryKeyTestCreateStmt
    ];
    if(driver == 'oracle') {
      stmts = [];
    }
    stmts = stmts.concat([
      "DELETE FROM Phones",
      "DELETE FROM People",
      "DELETE FROM CompanyPerson",
      "DELETE FROM Companies",
      "DELETE FROM PrimaryKeyTests"
    ]);
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
  } else if(driver == 'oracle') {
    persist.connect({
      driver: "oracle",
      hostname: "localhost",
      user: "test",
      password: "test"
    }, mycallback);
  } else {
    persist.connect({
      driver: 'mysql',
      user: 'root',
      password: 'root',
      database: 'test'
    }, mycallback);
  }
};