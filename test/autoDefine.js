var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../test_helpers/assert");
var testUtils = require("../test_helpers/autoDefineTestUtils");
var Phone;
var PrimaryKeyTest;
var Person;
var testDate

exports['Insert'] = nodeunit.testCase({
  setUp: function (callback) {
    var self = this;    
  
    testUtils.connect(persist, {}, function (err, connection) {
      self.connection = connection;
      var dbDriver = connection.opts.driver;
      persist.defineAuto("Phone", {driver:dbDriver, db:self.connection.db},function(err,model){
        Phone = model;
      });
      persist.defineAuto("PrimaryKeyTest",{driver:dbDriver, db:self.connection.db},function(err,model){
        PrimaryKeyTest = model;
      });
      testDate = new Date(2011, 10, 30, 12, 15);
      persist.defineAuto("Person",{driver:dbDriver, db:self.connection.db},function(err,model){
        Person = model.hasMany(Phone)
          .on('beforeSave', function (obj) {
            obj.lastUpdated = testDate;
          })
          .on('afterSave', function (obj) {
            if (!obj.updateCount) obj.updateCount = 0;
            obj.updateCount++;
          });
      });
      persist.waitForDefinitionsToFinish(onComplete);
    });
    var onComplete = function(){
      callback();
    }   
  },

  tearDown: function (callback) {
    if (this.connection) {
      this.connection.close();
    }
    callback();
  },

  "primary key not named id": function (test) {
    var self = this;
    var item1 = new PrimaryKeyTest({name: 'item1'});
    var item2 = new PrimaryKeyTest({name: 'item2'});
    self.connection.save([item1, item2], function (err) {
      if (err) {
        console.log("err");
        return console.log(err);
      }
      PrimaryKeyTest.all(self.connection, function (err, items) {
        if (err) {
                  console.log("err1");

          return console.log(err);
        }
        test.equals(items.length, 2);
        test.equals(items[0].name, 'item1');
        test.ok(items[0].my_pk_id);
        test.equals(items[1].name, 'item2');
        test.ok(items[1].my_pk_id);
        var item2Id = items[1].id;

        items[0].delete(self.connection, function (err) {
          if (err) {
                    console.log("err2");

            return console.log(err);
          }

          items[1].name = 'only item';
          items[1].save(self.connection, function (err) {
            if (err) {
                      console.log("err3");

              return console.log(err);
            }

            PrimaryKeyTest.all(self.connection, function (err, items) {
              if (err) {
                        console.log("err4");

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
    var person1 = new Person({ name: "Bob O'Neill" });

    person1.save(self.connection, function (err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.lastUpdated, testDate);
      test.equals(p.updateCount, 1);

      person1.save(self.connection, function (err, p) {
        test.equals(p.updateCount, 2);
        test.done();
      });
    });
  },

  "new person age set to 0": function (test) {

    var self = this;
    var person1 = new Person({ name: "Bob O'Neill", age: 0 });

    person1.save(self.connection, function (err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.age, 0);
      test.done();
    });
  }

});
