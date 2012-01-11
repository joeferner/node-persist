
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../test_helpers/assert");

exports['Define'] = nodeunit.testCase({
  "create simple property": function(test) {
    var Person = persist.define("Person", {
      "name": type.STRING
    });
    assert.isFunction(Person, "Person is not a function");

    var person = new Person();
    assert.isNotUndefined(person.name, "person.name is undefined");

    test.done();
  },

  "default value": function(test) {
    var testDate = new Date(2011, 10, 30, 12, 15);
    var Person = persist.define("Person", {
      "name": { type: type.STRING, defaultValue: 'bob' },
      'lastUpdated': { type: type.DATETIME, defaultValue: function() { return testDate; } }
    });

    var person = new Person();
    test.equal(person.name, "bob");
    test.equal(person.lastUpdated, testDate);

    test.done();
  },

  "hasMany": function(test) {
    var Phone = persist.define("Phone", {
      "number": type.STRING
    });
    var Person = persist.define("Person", {
      "name": type.STRING
    }).hasMany(Phone);

    var person = new Person();
    assert.isNotNullOrUndefined(person.phones, "person.phones is null or undefined");
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    assert.isNotUndefined(phone.person, "phone.person is null");

    test.done();
  },

  "hasOne": function(test) {
    var Phone = persist.define("Phone", {
      "number": type.STRING
    });
    var Person = persist.define("Person", {
      "name": type.STRING
    }).hasOne(Phone);

    var person = new Person();
    assert.isNotUndefined(person.phone, "person.phone is undefined");

    var phone = new Phone();
    assert.isNotUndefined(phone.people, "phone.people is undefined");

    test.done();
  },

  "hasManyToMany": function(test) {
    var Phone = persist.define("Phone", {
      "number": type.STRING
    });
    var Person = persist.define("Person", {
      "name": type.STRING
    }).hasMany(Phone);
    Phone.hasMany(Person);

    var person = new Person();
    assert.isNotNullOrUndefined(person.phones, "person.phones is null or undefined");
    test.equals(person.phones.length, 0);

    var phone = new Phone();
    assert.isNotNullOrUndefined(phone.people, "phone.people is null or undefined");
    test.equals(person.phones.length, 0);

    test.done();
  }

});
