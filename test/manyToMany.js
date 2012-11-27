
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../test_helpers/test_utils");

exports['ManyToMany'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Company = persist.define("Company", {
      "name": type.STRING
    });

    this.Person = persist.define("Person", {
      "name": type.STRING
    }).hasMany(this.Company, { through: 'CompanyPerson' });

    testUtils.connect(persist, {}, function(err, connection) {
      if(err) { console.log(err); return; }
      self.connection = connection;
      self.person1 = new self.Person({ name: "bob" });
      self.person2 = new self.Person({ name: "john" });
      self.company1 = new self.Company({ people: [self.person1], name: 'Near Infinity' });
      self.company2 = new self.Company({ people: [self.person1, self.person2], name: 'Microsoft' });
      self.company3 = new self.Company({ people: [self.person2], name: 'Google' });
      self.connection.save([self.person1, self.person2, self.company1, self.company2, self.company3], function(err) {
        if(err) { console.log(err); return; }
        callback();
      });
    });
  },

  tearDown: function(callback) {
    if(this.connection) {
      this.connection.close();
    }
    callback();
  },

  "all": function(test) {
    var self = this;

    this.Person.using(this.connection).orderBy("name").all(function(err, people) {
      if(err) { console.error(err); return; }
      test.equals(people.length, 2);

      test.equals(people[0].name, "bob");
      test.equals(people[1].name, 'john');
      self.connection.chain([
        people[0].companies.all,
        people[1].companies.all,
      ], function(err, results) {
        if(err) { console.error(err); return; }

        test.equals(results[0].length, 2);
        results[0].sort(function(a,b) { return a.name < b.name; });
        test.equals(results[0][0].name, 'Near Infinity');
        test.equals(results[0][1].name, 'Microsoft');

        test.equals(results[1].length, 2);
        results[1].sort(function(a,b) { return a.name < b.name; });
        test.equals(results[1][0].name, 'Microsoft');
        test.equals(results[1][1].name, 'Google');

        test.done();
      });
    });
  },

  "get, change, and save again": function(test) {
    var self = this;

    this.Person.using(this.connection).orderBy("name").first(function(err, person) {
      if(err) { console.error(err); return; }
      test.equals(person.name, "bob");

      person.companies.all(function(err, companies) {
        if(err) { console.error(err); return; }
        test.equals(companies.length, 2);
        test.equals(companies[0].name, 'Near Infinity');
        test.equals(companies[1].name, 'Microsoft');

        person.companies = [self.company1];
        person.save(self.connection, function(err) {
          if(err) { console.error(err); return; }

          person.companies.all(function(err, companies) {
            test.equals(companies.length, 1);
            test.equals(companies[0].name, 'Near Infinity');
            test.done();
          });
        });
      });
    });
  }

});
