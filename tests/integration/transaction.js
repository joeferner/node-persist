
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var testUtils = require("../../test_helpers/test_utils");

exports['Transaction'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Person = persist.define("Person", {
      "name": "string"
    });

    testUtils.connect(persist, function(connection) {
      self.connection = connection;
      callback();
    });
  },

  "rollback": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "bob" });
    this.connection.tx(function(err, tx) {
      test.ifError(err);
      person1.save(tx, function(err, p) {
        tx.rollback(function(err) {
          test.ifError(err);
          self.Person.all(function(err, items) {
            test.ifError(err);
            test.equals(items.length, 0);
            test.done();
          });
        });
      });
    });
  },

  "commit": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "bob" });
    this.connection.tx(function(err, tx) {
      test.ifError(err);
      person1.save(tx, function(err, p) {
        test.ifError(err);
        tx.commit(function(err) {
          test.ifError(err);
          self.Person.all(function(err, items) {
            test.ifError(err);
            test.equals(items.length, 1);
            test.done();
          });
        });
      });
    });
  }
});
