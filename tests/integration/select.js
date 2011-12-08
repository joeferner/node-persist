
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");

exports['Select'] = nodeunit.testCase({
  setUp: function(callback) {
    this.Phone = persist.define("Phone", {
      "number": "string"
    });

    this.Person = persist.define("Person", {
      "name": "string"
    }).hasMany(this.Phone);

    callback();
  },

  "all": function(test) {
    this.Person.all(function(err, people) {
      test.ifError(err);
      test.equals(people.length, 2);

      test.done();
    });
  }

});
