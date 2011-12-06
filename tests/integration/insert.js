
var persist = require("../../lib/persist");
var vows = require("vows");
var assert = require('assert');

Phone = persist.define("Phone", {
  "number": "string"
});

Person = persist.define("Person", {
  "name": "string"
}).hasMany(Phone);

vows.describe("Insert").addBatch({
  topic: function() {
    var person1 = new Person({ name: "bob" });
    person1.save(this.callback);
  },

  "save with no associations": function(err, person) {
    assert.isNull(err);
    assert.isNotNull(p.id);
    assert.equals(p.name, "bob");
  }
}).export(module);
