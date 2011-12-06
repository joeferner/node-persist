
var persist = require("../../lib/persist");
var vows = require("vows");
var assert = require('assert');

Phone = persist.define("Phone", {
  "number": "string"
});

Person = persist.define("Person", {
  "name": "string"
}).hasMany(Phone);

vows.describe("Select").addBatch({
  "all": function() {
    Person.all(function(err, people) {
    });
  }
}).export(module);