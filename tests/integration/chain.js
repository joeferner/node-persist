
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../../test_helpers/test_utils");

exports['Chain'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": persist.String
    });

    this.Person = persist.define("Person", {
      "name": persist.String,
      "age": persist.Integer
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
        self.person1 = new self.Person({ name: "Bob O'Neill", age: 21 });
        self.person2 = new self.Person({ name: "john", age: 23 });
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

  "chain": function(test) {
    var self = this;
    var person3 = new self.Person({ name: "fred", age: 25 });

    this.connection.chain([
      person3.save,
      self.Person.min('age'),
      self.Person.max('age'),
      self.phone3.delete,
      self.person2.delete,
      self.Person.orderBy('name').all,
      self.Phone.orderBy('number').first,
      self.Phone.count,
      self.Phone.deleteAll,
      self.Phone.all
    ], function(err, results) {
      if(err) { console.error(err); return; }

      // person3.save
      test.equal(results[0].name, 'fred');

      // Person.min
      test.equal(results[1], 21);

      // Person.max
      test.equal(results[2], 25);

      // phone3.delete
      test.ok(results[3]);

      // person2.delete
      test.ok(results[4]);

      // person select all
      test.equal(results[5].length, 2);
      test.equal(results[5][0].name, "Bob O'Neill");
      test.equal(results[5][1].name, "fred");

      // phone select first
      test.equal(results[6].number, "111-2222");

      // phone select count
      test.equal(results[7], 2);

      // phone.deleteAll
      test.ok(results[8]);

      // phone.all
      test.equal(results[9].length, 0);

      test.done();
    });
  }

});