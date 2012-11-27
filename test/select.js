var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../test_helpers/test_utils");

exports['Select'] = nodeunit.testCase({
  setUp: function (callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": { type: type.STRING, dbColumnName: 'numbr' }
    });

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "age": type.INTEGER
    }).hasMany(this.Phone);

    this.Person.onLoad = function (person) {
      person.nameAndAge = person.name + ": " + person.age;
    };

    this.Company = persist.define("Company", {
      "name": type.STRING
    }).hasMany(this.Person, { through: "CompanyPerson" });

    this.Phone.hasOne(this.Person, { name: "modifiedBy", foreignKey: "modified_by_person_id" });

    testUtils.connect(persist, {}, function (err, connection) {
      if (err) {
        console.log(err);
        return;
      }

      self.connection = connection;
      self.person1 = new self.Person({ name: "Bob O'Neill", age: 21 });
      self.person2 = new self.Person({ name: "john", age: 23 });
      self.phone1 = new self.Phone({ person: self.person1, number: '111-2222', modifiedBy: self.person1 });
      self.phone2 = new self.Phone({ person: self.person1, number: '222-3333', modifiedBy: self.person1 });
      self.phone3 = new self.Phone({ person: self.person2, number: '333-4444', modifiedBy: self.person1 });
      self.company1 = new self.Company({ people: [self.person1, self.person2], name: "Near Infinity" });
      self.connection.save([self.person1, self.person2, self.phone1, self.phone2, self.phone3, self.company1], function (err) {
        if (err) {
          console.log(err);
          return;
        }
        callback();
      });
    });
  },

  tearDown: function (callback) {
    if (this.connection) {
      this.connection.close();
    }
    callback();
  },

  "all": function (test) {
    this.Person.using(this.connection).all(function (err, people) {
      if (err) {
        console.error(err);
        return;
      }
      test.equals(people.length, 2);
      test.equals(people[0].name, "Bob O'Neill");
      console.log(people[0].nameAndAge, "Bob O\'Neill: 21");
      test.equals(JSON.stringify(people[0]), '{"phones":{},"companies":{},"modifiedBy":{},"name":"Bob O\'Neill","age":21,"id":' + people[0].id + ',"nameAndAge":"Bob O\'Neill: 21"}');
      test.equals(people[1].name, 'john');

      test.done();
    });
  },

  "all with include": function (test) {
    this.Person
      .include(["phones", "companies"])
      .all(this.connection, function (err, people) {
        if (err) {
          console.error(err);
          return;
        }

        people.sort(function (a, b) { return a.name > b.name; });
        test.equals(people.length, 2);
        test.equals(people[0].name, "Bob O'Neill");
        test.equals(people[0].phones.length, 2);
        var phones = people[0].phones.sort(function (a, b) { return a.number > b.number; });
        test.equals(phones[0].number, "111-2222");
        test.equals(phones[1].number, "222-3333");
        test.equals(people[0].companies.length, 1);
        test.equals(people[0].companies[0].name, "Near Infinity");
        //TODO: console.log(JSON.stringify(people[0]));
        //TODO: test.equals(JSON.stringify(people[0]), '{"name":"Bob O\'Neill","age":21,"id":1,"phones":[{"number":"111-2222"},{"number":"222-3333"}]}');
        test.equals(people[1].name, 'john');
        test.equals(people[1].phones.length, 1);
        test.equals(people[1].phones[0].number, "333-4444");
        test.equals(people[1].companies.length, 1);
        test.equals(people[1].companies[0].name, "Near Infinity");

        test.done();
      });
  },

  "include one from the many": function (test) {
    this.Phone
      .include("person")
      .include("modifiedBy")
      .where("numbr = ?", "111-2222")
      .first(this.connection, function (err, phone) {
        if (err) {
          console.error(err);
          return;
        }

        test.equals(phone.number, "111-2222");
        test.ok(phone.person);
        test.equals(phone.person.name, "Bob O'Neill");
        test.ok(phone.modifiedBy);
        test.equals(phone.modifiedBy.name, "Bob O'Neill");

        test.done();
      });
  },

  "where query for associated data": function (test) {
    this.Person
      .include("phones")
      .where("phones.number = ?", "111-2222")
      .first(this.connection, function (err, person) {
        if (err) {
          console.error(err);
          return;
        }

        test.equals(person.name, "Bob O'Neill");

        test.done();
      });
  },

  "where query for associated data (count)": function (test) {
    this.Person
      .include("phones")
      .where("phones.number = ?", "111-2222")
      .count(this.connection, function (err, count) {
        if (err) {
          console.error(err);
          return;
        }

        test.equals(count, 1);

        test.done();
      });
  },

  "include with conflicting column names": function (test) {
    var self = this;
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").first(function (err, p1) {
      if (err) {
        console.error(err);
        return;
      }

      self.Person
        .include("phones")
        .where("id = ?", p1.id)
        .first(self.connection, function (err, p2) {
          if (err) {
            console.error(err);
            return;
          }

          test.ok(p2);
          test.ok(p2.phones);

          test.done();
        });
    });
  },

  "include with no children": function (test) {
    var self = this;
    this.Phone.deleteAll(this.connection, function (err) {
      if (err) {
        console.error(err);
        return;
      }

      self.Person
        .include("phones")
        .where("name = ?", "Bob O'Neill")
        .first(self.connection, function (err, p2) {
          if (err) {
            console.error(err);
            return;
          }

          test.ok(p2);
          test.ok(p2.phones);
          test.equal(p2.phones.length, 0);

          test.done();
        });
    });
  },

  "get by id": function (test) {
    var self = this;
    var person1Id = self.person1.id;

    this.Person
      .getById(this.connection, person1Id, function (err, person) {
        if (err) {
          console.error(err);
          return;
        }

        test.equals(person.name, "Bob O'Neill");

        test.done();
      });
  },

  "get by id with include": function (test) {
    var self = this;
    var person1Id = self.person1.id;

    this.Person
      .include("phones")
      .getById(this.connection, person1Id, function (err, person) {
        if (err) {
          console.error(err);
          return;
        }

        test.equals(person.name, "Bob O'Neill");
        test.equals(person.phones.length, 2);

        test.done();
      });
  },

  "count": function (test) {
    this.Person.using(this.connection).count(function (err, count) {
      if (err) {
        console.error(err);
        return;
      }
      test.equals(count, 2);
      test.done();
    });
  },

  "order by desc": function (test) {
    this.Person.using(this.connection).orderBy("name", persist.Descending).all(function (err, people) {
      test.ifError(err);
      test.equals(people.length, 2);
      test.equals(people[0].name, 'john');
      test.equals(people[1].name, "Bob O'Neill");

      test.done();
    });
  },

  "each": function (test) {
    var count = 0;
    this.Person.using(this.connection).orderBy("name").each(function (err, person) {
      test.ifError(err);
      if (count == 0) {
        test.equals(person.name, "Bob O'Neill");
        count++;
      } else if (count == 1) {
        test.equals(person.name, 'john');
        count++;
      } else {
        throw new Error("Invalid count");
      }
    }, function () { test.done(); });
  },

  "where": function (test) {
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").all(function (err, people) {
      test.ifError(err);
      test.equals(people.length, 1);
      test.equals(people[0].name, "Bob O'Neill");

      test.done();
    });
  },

  "whereIn count": function (test) {
    this.Person.using(this.connection).include("phones").whereIn("phones.number", ["111-2222", "222-3333"]).count(function (err, count) {
      test.ifError(err);
      test.equals(count, 2);

      test.done();
    });
  },

  "whereIn names": function (test) {
    this.Person.using(this.connection).include("phones").whereIn("phones.number", ["111-2222", "222-3333"]).all(function (err, people) {
      test.ifError(err);
      test.equals(people.length, 1);
      test.equals(people[0].name, "Bob O'Neill");

      test.done();
    });
  },


  "hash based where": function (test) {
    this.Person.using(this.connection).where({'name': "Bob O'Neill", 'age': '21'}).all(function (err, people) {
      test.ifError(err);
      test.equals(people.length, 1);
      test.equals(people[0].name, "Bob O'Neill");

      test.done();
    });
  },

  "first": function (test) {
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").first(function (err, person) {
      test.ifError(err);
      test.ok(person);
      test.equals(person.name, "Bob O'Neill");
      test.done();
    });
  },

  "first with include": function (test) {
    var self = this;
    this.Person
      .include("phones")
      .where("name = ?", "Bob O'Neill").first(self.connection, function (err, person) {
        test.ifError(err);
        test.ok(person);
        test.equals(person.name, "Bob O'Neill");
        test.equals(person.phones.length, 2);
        test.done();
      });
  },

  "first that doesn't match anything": function (test) {
    this.Person.using(this.connection).where("name = ?", "Bad Name").first(function (err, person) {
      test.ifError(err);
      test.equals(person, null);
      test.done();
    });
  },

  "last": function(test) {
    this.Person.using(this.connection).last(function (err, person) {
      test.ifError(err);
      test.ok(person);
      test.equals(person.name, "john");
      test.done();
    });
  },

  "last with include": function (test) {
    var self = this;
    this.Person
      .include("phones")
      .last(self.connection, function (err, person) {
        test.ifError(err);
        test.ok(person);
        test.equals(person.name, "john");
        test.equals(person.phones.length, 1);
        test.done();
      });
  },

  "last that doesn't match anything": function (test) {
    this.Person.using(this.connection).where("name = ?", "Bad Name").last(function (err, person) {
      test.ifError(err);
      test.equals(person, null);
      test.done();
    });
  },

  "where empty string": function (test) {
    this.Person.using(this.connection).where("name = ?", "").all(function (err, people) {
      test.ifError(err);
      test.equals(people.length, 0);
      test.done();
    });
  },

  "min": function (test) {
    this.Person.using(this.connection).min("age", function (err, age) {
      if (err) {
        console.log(err);
        return;
      }
      test.equals(age, 21);
      test.done();
    });
  },

  "max": function (test) {
    this.Person.using(this.connection).max("age", function (err, age) {
      if (err) {
        console.log(err);
        return;
      }
      test.equals(age, 23);
      test.done();
    });
  },

  "sum": function (test) {
    this.Person.using(this.connection).sum("age", function (err, age) {
      if (err) {
        console.log(err);
        return;
      }
      test.equals(age, 44);
      test.done();
    });
  },

  "limit": function (test) {
    this.Phone.limit(1, 1).orderBy("number").all(this.connection, function (err, phones) {
      if (err) {
        console.log(err);
        return;
      }
      test.equals(phones.length, 1);
      test.equals(phones[0].number, "222-3333");
      test.done();
    });
  },

  "associated data": function (test) {
    var self = this;
    this.Person.using(this.connection).where("name = ?", "Bob O'Neill").first(function (err, person) {
      if (err) {
        console.log(err);
        return;
      }
      person.phones.all(function (err, phones) {
        if (err) {
          console.log(err);
          return;
        }
        test.equals(phones.length, 2);
        test.equals(phones[0].number, '111-2222');
        test.equals(phones[0].personId, person.id);
        test.equals(phones[1].number, '222-3333');
        test.equals(phones[1].personId, person.id);

        phones[0].person.first(function (err, p) {
          if (err) {
            console.log(err);
            return;
          }

          test.equals(p.name, "Bob O'Neill");

          test.done();
        });
      });
    });
  },

  "JSON datatype": function (test) {
    var self = this;
    MyPerson = persist.define("Person", {
      "name": type.STRING,
      "txt": type.JSON
    });

    var person1 = new MyPerson({"name": "joe1", "txt": '{"address": "123 Elm St", "emails": [ "a@b.com", "b@c.com" ]}'});
    var person2 = new MyPerson({"name": "joe2", "txt": 'invalid JSON'});

    this.connection.save([person1, person2], function (err) {
      if (err) {
        console.log(err);
        return;
      }

      MyPerson.where("name = ?", "joe1").first(self.connection, function (err, p) {
        if (err) {
          console.log(err);
          return;
        }

        test.ok(p.txt);
        test.equal(p.txt.address, '123 Elm St');
        test.equal(p.txt.emails.length, 2);
        test.equal(p.txt.emails[0], 'a@b.com');
        test.equal(p.txt.emails[1], 'b@c.com');

        MyPerson.where("name = ?", "joe2").first(self.connection, function (err, p) {
          if (err) {
            console.log(err);
            return;
          }

          test.ok(p.txt);
          test.equal(p.txt, 'invalid JSON');

          test.done();
        });
      });
    });
  }

});
