
var persist = require("../../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../../test_helpers/test_utils");

exports['Select'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("phone", {
      "number": type.STRING
    });

    this.Person = persist.define("person", {
      "name": type.STRING
    }).hasMany(this.Phone, { through: 'person_phone' });

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      self.connection.runSql([
        "CREATE TABLE IF NOT EXISTS person (id INTEGER PRIMARY KEY AUTOINCREMENT, name text);",
        "CREATE TABLE IF NOT EXISTS phone (id INTEGER PRIMARY KEY AUTOINCREMENT, number text);",
        "CREATE TABLE IF NOT EXISTS person_phone (person_id INTEGER, phone_id INTEGER, PRIMARY KEY(person_id, phone_id));",
        "DELETE FROM person_phone;",
        "DELETE FROM phone;",
        "DELETE FROM person;"
      ], function(err) {
        if(err) { console.log(err); return; }
        self.person1 = new self.Person({ name: "bob" });
        self.person2 = new self.Person({ name: "john" });
        self.phone1 = new self.Phone({ people: [self.person1], number: '111-2222' });
        self.phone2 = new self.Phone({ people: [self.person1, self.person2], number: '222-3333' });
        self.phone3 = new self.Phone({ people: [self.person2], number: '333-4444' });
        self.connection.save([self.person1, self.person2, self.phone1, self.phone2, self.phone3], function(err) {
          if(err) { console.log(err); return; }
          callback();
        });
      });
    });
  },

  tearDown: function(callback) {
    if(this.connection) {
      this.connection.close();
    }
    callback();
  },

  "all": function(test) {
    var self = this;

    this.Person.using(this.connection).orderBy("name").all(function(err, people) {
      if(err) { console.error(err); return; }
      test.equals(people.length, 2);

      test.equals(people[0].name, "bob");
      test.equals(people[1].name, 'john');
      self.connection.chain([
        people[0].phones.all,
        people[1].phones.all,
      ], function(err, results) {
        if(err) { console.error(err); return; }

        test.equals(results[0].length, 2);
        test.equals(results[0][0].number, '111-2222');
        test.equals(results[0][1].number, '222-3333');

        test.equals(results[1].length, 2);
        test.equals(results[1][0].number, '222-3333');
        test.equals(results[1][1].number, '333-4444');

        test.done();
      });
    });
  },

  "get, change, and save again": function(test) {
    var self = this;

    this.Person.using(this.connection).orderBy("name").first(function(err, person) {
      if(err) { console.error(err); return; }
      test.equals(person.name, "bob");

      person.phones.all(function(err, phones) {
        if(err) { console.error(err); return; }
        test.equals(phones.length, 2);
        test.equals(phones[0].number, '111-2222');
        test.equals(phones[1].number, '222-3333');

        person.phones = [self.phone1];
        person.save(self.connection, function(err) {
          if(err) { console.error(err); return; }

          person.phones.all(function(err, phones) {
            test.equals(phones.length, 1);
            test.equals(phones[0].number, '111-2222');
            test.done();
          });
        });
      });
    });
  }

});
