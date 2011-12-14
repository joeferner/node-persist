
var persist = require("../../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");
var testUtils = require("../../test_helpers/test_utils");

exports['Insert'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": type.STRING
    });

    this.testDate1 = new Date(2011, 10, 30, 12, 15);
    this.testDate2 = new Date(2011, 10, 30, 12, 15);

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "createdDate": { type: persist.DateTime, defaultValue: function() { return self.testDate1 } },
      "lastUpdated": { type: persist.DateTime }
    })
    .hasMany(this.Phone)
    .on('beforeSave', function(obj) {
      obj.lastUpdated = self.testDate2;
    })
    .on('afterSave', function(obj) {
      if(!obj.updateCount) obj.updateCount = 0;
      obj.updateCount++;
    });

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      self.connection.runSql([
        testUtils.personCreateStmt,
        "DELETE FROM Person;"
      ], function() {
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

  "save with no associations": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });

    person1.save(self.connection, function(err, p) {
      test.ifError(err);
      assert.isNotNullOrUndefined(p.id, "p.id is null or undefined");
      test.equals(p.name, "Bob O'Neill");
      test.equals(p.createdDate, self.testDate1);
      test.equals(p.lastUpdated, self.testDate2);
      test.equals(p.updateCount, 1);

      person1.save(self.connection, function(err, p) {
        test.equals(p.updateCount, 2);
        test.done();
      });
    });
  }

});
