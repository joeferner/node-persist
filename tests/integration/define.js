
var persist = require("../../lib/persist");
var vows = require("vows");
var assert = require('assert');

vows.describe("Define").addBatch({
  "create simple property": function() {
    var Person = persist.define("Person", {
      "name": "string"
    });
    assert.isFunction(Person);

    var person = new Person();
    assert.isNotNull(person.name);
  },

  "hasMany": function() {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasMany(Phone);

    var person = new Person();
    assert.isNotNull(person.phones);

    var phone = new Phone();
    assert.isNotNull(phone.person);
  },

  "hasOne": function() {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasOne(Phone);

    var person = new Person();
    assert.isNotNull(person.phone);

    var phone = new Phone();
    assert.isNotNull(phone.person);
  },

  "hasManyToMany": function() {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasMany(Phone);
    Phone.hasMany(Person);

    var person = new Person();
    assert.isNotNull(person.phones);

    var phone = new Phone();
    assert.isNotNull(phone.persons);
  }
}).export(module);
