
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../test_helpers/test_utils");

exports['Run SQL'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "age": type.INTEGER
    });

    testUtils.connect(persist, {}, function(err, connection) {
      if(err) { console.log(err); return; }

      self.connection = connection;
      self.person1 = new self.Person({ name: "Bob O'Neill", age: 21 });
      self.person2 = new self.Person({ name: "john", age: 23 });
      self.connection.save([self.person1, self.person2], function(err) {
        if(err) { console.log(err); return; }
        callback();
      });
    });
  },

  tearDown: function(callback) {
    if(this.connection) {
      this.connection.close();
    }
    callback();
  },

  "runSql": function(test) {
    var self = this;

    persist.runSql(this.connection, "UPDATE people SET age = ?", [ 32 ], function(err, results) {
      if(err) { console.error(err); return; }
      test.ok(results);

      self.Person.using(self.connection).all(function(err, people) {
        if(err) { console.error(err); return; }
        test.equals(people.length, 2);
        test.equals(people[0].age, 32);
        test.equals(people[1].age, 32);

        test.done();
      });
    });
  },

  "runSqlAll": function(test) {
    var self = this;

    persist.runSqlAll(this.connection, "SELECT * FROM people WHERE age = ?", [ 21 ], function(err, results) {
      if(err) { console.error(err); return; }
      test.equals(results.length, 1);
      test.equals(results[0].name, "Bob O'Neill");
      test.done();
    });
  },

  "runSqlEach": function(test) {
    var self = this;

    persist.runSqlEach(this.connection, "SELECT * FROM people WHERE age = ?", [ 21 ], function(err, result) {
      if(err) { console.error(err); return; }
      test.equals(result.name, "Bob O'Neill");
    }, function(err) {
      if(err) { console.error(err); return; }
      test.done();
    });
  }
});
