
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");
var asserts = require("../../test_helpers/asserts");

exports['Define'] = nodeunit.testCase({
  "create simple property": function(test) {
    var Person = persist.define("Person", {
      "name": "string"
    });
    asserts.isFunction(Person, "Person is not a function");

    var person = new Person();
    asserts.isNotUndefined(person.name, "person.name is undefined");

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
    test.isNotNull(person.phones);
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    test.isNotNull(phone.person);
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
    asserts.isNotUndefined(person.phone, "person.phone is undefined");

    var phone = new Phone();
    asserts.isNotUndefined(phone.person, "phone.person is undefined");

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
    test.isNotNull(person.phones);
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    test.isNotNull(phone.persons);
    test.equals(person.phones.length, 0);

    test.done();
  }
});
