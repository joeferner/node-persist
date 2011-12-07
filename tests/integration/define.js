
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");

exports['Define'] = nodeunit.testCase({
  "create simple property": function(test) {
    var Person = persist.define("Person", {
      "name": "string"
    });
    assert.isFunction(Person, "Person is not a function");

    var person = new Person();
    assert.isNotUndefined(person.name, "person.name is undefined");

    test.done();
  },

  "hasMany": function(test) {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasMany(Phone);

    var person = new Person();
    assert.isNotNullOrUndefined(person.phones, "person.phones is null or undefined");
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    assert.isNotNullOrUndefined(phone.person, "phone.person is null or undefined");
    test.equals(phone.person.length, 0);

    test.done();
  },

  "hasOne": function(test) {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasOne(Phone);

    var person = new Person();
    assert.isNotUndefined(person.phone, "person.phone is undefined");

    var phone = new Phone();
    assert.isNotUndefined(phone.person, "phone.person is undefined");

    test.done();
  },

  "hasManyToMany": function(test) {
    var Phone = persist.define("Phone", {
      "number": "string"
    });
    var Person = persist.define("Person", {
      "name": "string"
    }).hasMany(Phone);
    Phone.hasMany(Person);

    var person = new Person();
    assert.isNotNullOrUndefined(person.phones, "person.phones is null or undefined");
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    assert.isNotNullOrUndefined(phone.persons, "phone.persons is null or undefined");
    test.equals(person.phones.length, 0);

    test.done();
  }
});
