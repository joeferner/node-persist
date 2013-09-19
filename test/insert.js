var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../test_helpers/assert");
var testUtils = require("../test_helpers/test_utils");

exports['Insert'] = nodeunit.testCase({
  setUp: function (callback) {
    var self = this;

    this.Address = persist.define("Address", {
      "address": type.STRING,
      "city": type.STRING,
      "state": type.STRING,
      "zip": type.STRING
    });
    
    this.Phone = persist.define("Phone", {
      "number": { type: type.STRING, dbColumnName: 'numbr' }
    });

    this.PrimaryKeyTest = persist.define("PrimaryKeyTest", {
      "id": { dbColumnName: 'my_pk_id', primaryKey: true },
      "name": type.STRING
    });

    this.testDate1 = new Date(2011, 10, 30, 12, 15);
    this.testDate2 = new Date(2011, 10, 30, 12, 15);

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "age": type.INTEGER,
      "createdDate": { type: persist.DateTime, defaultValue: function () { return self.testDate1 } },
      "lastUpdated": { type: persist.DateTime }
    })
      .hasMany(this.Phone)
      .hasMany(this.Address)
      .on('beforeSave', function (obj) {
        obj.lastUpdated = self.testDate2;
      })
      .on('afterSave', function (obj) {
        if (!obj.updateCount) {
          obj.updateCount = 0;
        }
        obj.updateCount++;
      });

    this.Person.validate = function (obj, connection, callback) {
      if (obj.name === 'bad name') {
        return callback(false, 'You had a bad name');
      }
      return callback(true);
    };
    
    this.Address.validate = function(obj, connection, callback) {
      var errors = [];
      
      if (obj.address === 'bad address') {
        errors.push({address: 'You had a bad address'});
      }
      
      if (obj.city === '') {
        errors.push({city: 'City cannot be blank'});
      }
      
      if (obj.state === 'ABC') {
        errors.push({state: 'State is invalid'});
      }
      
      var zipCodePattern = /^\d{5}$|^\d{5}-\d{4}$/;
      if (!zipCodePattern.test(obj.zip)) {
        errors.push({zip: 'Invalid zip code'});
      }
      
      if (errors.length > 0) {
        return callback(false, errors);
      }
      
      return callback(true);
    };

    testUtils.connect(persist, {}, function (err, connection) {
      self.connection = connection;
      callback();
    });
  },

  tearDown: function (callback) {
    if (this.connection) {
      this.connection.close();
    }
    callback();
  },

  "primary key without auto increment": function (test) {
    var self = this;
    var ID = 1001,
        item = new this.PrimaryKeyTest({id: ID, name: 'item-1001'});
    self.connection.save(item, function (err, obj) {
      if (err) {
        return console.log(err);
      }

      test.equals(obj.id, ID);

      self.PrimaryKeyTest.all(self.connection, function (err, qItems) {
        if (err) {
          return console.log(err);
        }
        test.equals(qItems.length, 1);
        test.equals(qItems[0].id, ID);

        test.done();
      });
    });
  },

  "primary key not named id": function (test) {
    var self = this;
    var item1 = new this.PrimaryKeyTest({name: 'item1'});
    var item2 = new this.PrimaryKeyTest({name: 'item2'});
    self.connection.save([item1, item2], function (err) {
      if (err) {
        return console.log(err);
      }

      self.PrimaryKeyTest.all(self.connection, function (err, items) {
        if (err) {
          return console.log(err);
        }

        test.equals(items.length, 2);
        test.equals(items[0].name, 'item1');
        test.ok(items[0].id);
        test.equals(items[1].name, 'item2');
        test.ok(items[1].id);
        var item2Id = items[1].id;

        items[0].delete(self.connection, function (err) {
          if (err) {
            return console.log(err);
          }

          items[1].name = 'only item';
          items[1].save(self.connection, function (err) {
            if (err) {
              return console.log(err);
            }

            self.PrimaryKeyTest.all(self.connection, function (err, items) {
              if (err) {
                return console.log(err);
              }

              test.equals(items.length, 1);
              test.equals(items[0].name, 'only item');
              test.equals(items[0].id, item2Id);

              test.done();
            });
          });
        });
      });
    });
  },

  "save with no associations": function (test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });

    person1.save(self.connection, function (err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.createdDate, self.testDate1);
      test.equals(p.lastUpdated, self.testDate2);
      test.equals(p.updateCount, 1);

      person1.save(self.connection, function (err, p) {
        test.equals(p.updateCount, 2);
        test.done();
      });
    });
  },

  "new person age set to 0": function (test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill", age: 0 });

    person1.save(self.connection, function (err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.age, 0);
      test.done();
    });
  },

  "validation with single message": function (test) {
    var self = this;
    var person1 = new this.Person({ name: "bad name", age: 0 });

    person1.save(self.connection, function (err, p) {
      test.equals('Validation failed: You had a bad name', err.message);
      test.done();
    });
  },
  
  "validation with custom object": function (test) {
    var self = this;
    var address1 = new this.Address({address: 'bad address',
                                     city: '',
                                     state: 'ABC',
                                     zip: 'abcde'});
    
    address1.save(self.connection, function(err, p) {
      test.equals('You had a bad address', err[0].address);
      test.equals('City cannot be blank', err[1].city);
      test.equals('State is invalid', err[2].state);
      test.equals('Invalid zip code', err[3].zip);
      test.done();
    });
  }

});
