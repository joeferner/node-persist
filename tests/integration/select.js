
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
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
        self.Person = persist.define("Person", {
          "name": "string"
        });

        self.person1 = new self.Person({ name: "bob" });
        self.person2 = new self.Person({ name: "john" });
        self.person1.save(self.connection, function(err, p1) {
          self.person2.save(self.connection, function(err, p2) {
            callback();
          });
        });
      });
    });
  },

  tearDown: function(callback) {
    this.connection.close();
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
  }

});
