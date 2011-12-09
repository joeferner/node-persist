
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

  "chain": function(test) {
    var self = this;
    var person3 = new self.Person({ name: "fred" });

    this.connection.chain([
      person3.save,
      self.phone3.delete,
      self.person2.delete,
      self.Person.using(self.connection).orderBy('name').all,
      self.Phone.using(self.connection).orderBy('number').first,
      self.Phone.using(self.connection).count,
      self.Phone.using(self.connection).deleteAll,
      self.Phone.using(self.connection).all
    ], function(err, results) {
      if(err) { console.error(err); return; }

      // person3.save
      test.equal(results[0].name, 'fred');

      // phone3.delete
      test.ok(results[1]);

      // person2.delete
      test.ok(results[2]);

      // person select all
      test.equal(results[3].length, 2);
      test.equal(results[3][0].name, "Bob O'Neill");
      test.equal(results[3][1].name, "fred");

      // phone select first
      test.equal(results[4].number, "111-2222");

      // phone select count
      test.equal(results[5], 2);

      // phone.deleteAll
      test.ok(results[6]);

      // phone.all
      test.equal(results[7].length, 0);

      test.done();
    });
  }

});