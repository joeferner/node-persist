var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");

exports['Delete'] = nodeunit.testCase({
  setUp: function(callback) {
    persist.connect(function(connectedPersist) {
      this.Person = persist.define("Person", {
        "name": "string"
      });

      this.person1 = new Person({ name: "bob" });
      this.person2 = new Person({ name: "john" });
      person1.save(function(err, p1) {
        person2.save(function(err, p2) {
          callback();
        });
      });
    });
  },

  "delete with no associations": function(test) {
    this.person1.delete(function(err, deletedPerson) {
      test.ifError(err);
      test.ok(!deletedPerson.isPersisted());
      test.done();
    });
  },

  "delete all of a certain type": function(test) {
    Person.deleteAll(function(err, count) {
      test.equal(count, 2);
      Person.all(function(err, rows) {
        test.ifError(err);
        test.equal(rows.length, 0);
      });
    })
  }
});
