
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

  "save with no associations": function(test) {
    var person1 = new Person({ name: "bob" });
    person1.save(function(err, p) {
      test.ifError(err);
      test.isNotNull(p.id);
      test.equals(p.name, "bob");

      test.done();
    });
  }
});
