
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

    testUtils.connect(persist, function(connection) {
      self.connection = connection;
      callback();
    });
  },

  "all": function(test) {
    this.Person.using(this.connection).all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 2);

      test.done();
    });
  }

});
