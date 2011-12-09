
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../../test_helpers/test_utils");

exports['Select'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": persist.String
    });

    this.Person = persist.define("Person", {
      "name": persist.String
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      self.connection.runSql([
        testUtils.personCreateStmt,
        testUtils.phoneCreateStmt,
        "DELETE FROM Phone;",
        "DELETE FROM Person;"
      ], function(err) {
        if(err) { console.log(err); return; }
        self.person1 = new self.Person({ name: "Bob O'Neill" });
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
      test.equals(people[0].name, "Bob O'Neill");
      test.equals(people[1].name, 'john');

      test.done();
    });
  },

  "count": function(test) {
    this.Person.using(this.connection).count(function(err, count) {
      test.ifError(err);
      test.equals(count, 2);
      test.done();
    });
  },

  "order by desc": function(test) {
    this.Person.using(this.connection).orderBy("name", persist.Descending).all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 2);
      test.equals(people[0].name, 'john');
      test.equals(people[1].name, "Bob O'Neill");

      test.done();
    });
  },

  "each": function(test) {
    var count = 0;
    this.Person.using(this.connection).orderBy("name").each(function(err, person) {
      test.ifError(err);
      if(count == 0) {
        test.equals(person.name, "Bob O'Neill");
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
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 1);
      test.equals(people[0].name, "Bob O'Neill");

      test.done();
    });
  },

  "first": function(test) {
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").first(function(err, person) {
      test.ifError(err);
      test.ok(person);
      test.equals(person.name, "Bob O'Neill");
      test.done();
    });
  },

  "first that doesn't match anything": function(test) {
    this.Person.using(this.connection).where("name = ?", "Bad Name").first(function(err, person) {
      test.ifError(err);
      test.equals(person, null);
      test.done();
    });
  },

  "associated data": function(test) {
    var self = this;
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").first(function(err, person) {
      test.ifError(err);
      person.phones.all(function(err, phones) {
        if(err) { console.log(err); return; }
        test.equals(phones.length, 2);
        test.equals(phones[0].number, '111-2222');
        test.equals(phones[0].personId, person.id);
        test.equals(phones[1].number, '222-3333');
        test.equals(phones[1].personId, person.id);
        test.done();
      });
    });
  }

});
