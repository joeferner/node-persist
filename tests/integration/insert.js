
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");
var testUtils = require("../../test_helpers/test_utils");

exports['Insert'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": persist.String
    });

    this.testDate = new Date(2011, 10, 30, 12, 15);

    this.Person = persist.define("Person", {
      "name": persist.String,
      "lastUpdated": { type: persist.DateTime, defaultValue: function() { return self.testDate } }
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      self.connection.runSql([
        testUtils.personCreateStmt,
        "DELETE FROM Person;"
      ], function() {
        callback();
      });
    });
  },

  tearDown: function(callback) {
    this.connection.close();
    callback();
  },

  "save with no associations": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });
    person1.save(this.connection, function(err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.lastUpdated, self.testDate);

      test.done();
    });
  }

});
