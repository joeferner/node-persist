
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");

exports['Define'] = nodeunit.testCase({
  setUp: function(callback) {
    this.Phone = persist.define("Phone", {
      "number": "string"
    });

    this.Person = persist.define("Person", {
      "name": "string"
    }).hasMany(Phone);

    callback();
  },

  "all": function(test) {
    Person.all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 2);

      test.done();
    });
  }

});
