
var persist = require("../../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");
var testUtils = require("../../test_helpers/test_utils");

exports['Update'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": { type: type.STRING, dbColumnName: 'numbr' }
    });

    this.Person = persist.define("Person", {
      "name": type.STRING
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      callback();
    });
  },

  tearDown: function(callback) {
    this.connection.close();
    callback();
  },

  "update": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });
    person1.save(this.connection, function(err, p) {
      test.ifError(err);
      self.Person.using(self.connection).all(function(err, rows) {
        test.ifError(err);
        test.equal(1, rows.length);
        test.equal("Bob O'Neill", rows[0].name);

        // update
        person1.name = 'tom';
        person1.save(self.connection, function(err) {
          test.ifError(err);
          self.Person.using(self.connection).all(function(err, rows) {
            test.ifError(err);
            test.equal(1, rows.length);
            test.equal('tom', rows[0].name);

            test.done();
          });
        });
      });
    });
  }
});
