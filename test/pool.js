var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../test_helpers/assert");
var testUtils = require("../test_helpers/test_utils");

exports['Pool'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;
    self.poolingLogs = [];

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "age": type.INTEGER
    });

    self.connectOpts = {
      trace: false,
      pooling: {
        name: 'testPool',
        max: 2,
        min: 1,
        idleTimeoutMillis: 1000,
        log: function(msg, level) {
          self.poolingLogs.push(msg);
        }
      }
    };
    testUtils.connect(persist, self.connectOpts, function(err, connection) {
      self.pool = connection.getPool();
      connection.close();
      callback();
    });
  },

  "max connections": function(test) {
    var self = this;

    // 1st connection
    persist.connect(self.connectOpts, function(err, conn1) {
      if (err) {
        console.error(err);
        return test.done(err);
      }

      // 2nd connection
      return persist.connect(self.connectOpts, function(err, conn2) {
        if (err) {
          console.error(err);
          return test.done(err);
        }

        // 3rd connection
        setTimeout(function() {
          conn1.close();
        }, 100);
        return persist.connect(self.connectOpts, function(err, conn3) {
          if (err) {
            console.error(err);
            return test.done(err);
          }

          conn2.close();
          conn3.close();
          persist.shutdown();
          return test.done();
        });
      });
    });

//    this.Person.using(this.connection).all(function(err, people) {
//      if (err) {
//        console.error(err);
//        return;
//      }
//      test.equals(people.length, 2);
//      test.equals(people[0].name, "Bob O'Neill");
//      console.log(people[0].nameAndAge, "Bob O\'Neill: 21");
//      test.equals(JSON.stringify(people[0]), '{"phones":{},"companies":{},"modifiedBy":{},"name":"Bob O\'Neill","age":21,"id":' + people[0].id + ',"nameAndAge":"Bob O\'Neill: 21"}');
//      test.equals(people[1].name, 'john');
//
//      test.done();
//    });
  }
});
