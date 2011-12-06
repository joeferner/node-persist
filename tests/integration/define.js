
var persist = require("../../lib/persist");
var nodeunit = require("nodeunit");

exports['Define'] = nodeunit.testCase({
  "create simple property": function(test) {
    var Person = persist.define("Person", {
      "name": "string"
    });
    test.isFunction(Person);

    var person = new Person();
    test.isNotNull(person.name);

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

    var phone = new Phone();
    test.isNotNull(phone.person);

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
    test.isNotNull(person.phone);

    var phone = new Phone();
    test.isNotNull(phone.person);

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

    var phone = new Phone();
    test.isNotNull(phone.persons);

    test.done();
  }
});
