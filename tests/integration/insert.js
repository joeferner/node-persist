
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");
var testUtils = require("../../test_helpers/test_utils");

exports['Insert'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": "string"
    });

    this.Person = persist.define("Person", {
      "name": "string"
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(connection) {
      self.connection = connection;
      callback();
    });
  },

  "save with no associations": function(test) {
    var person1 = new this.Person({ name: "bob" });
    person1.save(this.connection, function(err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "bob");

      test.done();
    });
  }
});
