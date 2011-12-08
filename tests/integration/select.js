
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../../test_helpers/test_utils");

exports['Select'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": "string"
    });

    this.Person = persist.define("Person", {
      "name": "string"
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      self.connection.runSql("CREATE TABLE Person (id INTEGER PRIMARY KEY, name string);", function() {
        self.connection.runSql("CREATE TABLE Phone (id INTEGER PRIMARY KEY, number string, personId INTEGER);", function() {
          self.person1 = new self.Person({ name: "bob" });
          self.person2 = new self.Person({ name: "john" });
          self.phone1 = new self.Phone({ person: self.person1, number: '111-2222' });
          self.phone2 = new self.Phone({ person: self.person1, number: '222-3333' });
          self.phone3 = new self.Phone({ person: self.person2, number: '333-4444' });

          self.connection.save([self.person1, self.person2, self.phone1, self.phone2, self.phone3], function(err) {
            if(err) { console.log(err); return; }
            callback();
          });
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
    this.Person.using(this.connection).all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 2);
      test.equals(people[0].name, 'bob');
      test.equals(people[1].name, 'john');

      test.done();
    });
  },

  "each": function(test) {
    var count = 0;
    this.Person.using(this.connection).orderBy("name").each(function(err, person) {
      test.ifError(err);
      if(count == 0) {
        test.equals(person.name, 'bob');
        count++;
      } else if(count == 1) {
        test.equals(person.name, 'john');
        count++;
      } else {
        throw new Error("Invalid count");
      }
    }, function() { test.done(); });
  },

  "where": function(test) {
    this.Person.using(this.connection).where("name = ?", "bob").all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 1);
      test.equals(people[0].name, 'bob');

      test.done();
    });
  },

  "associated data": function(test) {
    var self = this;
    this.Person.using(this.connection).where("name = ?", "bob").first(function(err, person) {
      test.ifError(err);
      person.phones.all(function(err, phones) {
        if(err) { console.log(err); return; }
        test.equals(phones.length, 2);
        test.equals(phones[0].number, '111-2222');
        test.equals(phones[1].number, '222-3333');
        test.done();
      });
    });
  }

});
