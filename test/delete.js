var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var testUtils = require("../test_helpers/test_utils");

exports['Delete'] = nodeunit.testCase({
  setUp: function (callback) {
    var self = this;

    testUtils.connect(persist, {}, function (err, connection) {
      self.connection = connection;
      self.Person = persist.define("Person", {
        "name": type.STRING
      });

      self.person1 = new self.Person({ name: "Bob Smith" });
      self.person2 = new self.Person({ name: "Joe Blow" });
      self.person3 = new self.Person({ name: "Joe Smith" });
      self.connection.save([self.person1, self.person2, self.person3], function (err) {
        if (err) {
          return console.log(err);
        }
        callback();
      });
    });
  },

  tearDown: function (callback) {
    this.connection.close();
    callback();
  },

  "delete with no associations": function (test) {
    var self = this;
    this.person1.delete(self.connection, function (err, deletedPerson) {
      if (err) {
        return console.log(err);
      }
      self.Person.orderBy("name").all(self.connection, function (err, rows) {
        if (err) {
          return console.log(err);
        }
        test.equal(rows.length, 2);
        test.equal(rows[0].name, 'Joe Blow');
        test.equal(rows[1].name, 'Joe Smith');
        test.done();
      });
    });
  },

  "delete all of a certain type": function (test) {
    var self = this;
    this.Person.deleteAll(this.connection, function (err) {
      if (err) {
        return console.log(err);
      }
      self.Person.orderBy("name").all(self.connection, function (err, rows) {
        if (err) {
          return console.log(err);
        }
        test.equal(rows.length, 0);
        test.done();
      });
    })
  },

  "delete all with query": function (test) {
    var self = this;

    self.Person.where("name LIKE ?", "Joe%").deleteAll(self.connection, function (err) {
      if (err) {
        return console.log(err);
      }

      self.Person.orderBy("name").all(self.connection, function (err, results) {
        if (err) {
          return console.log(err);
        }

        test.equals(1, results.length);

        test.equals("Bob Smith", results[0].name);

        test.done();
      });
    });
  }
});
