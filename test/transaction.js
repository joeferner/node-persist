
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var testUtils = require("../test_helpers/test_utils");

exports['Transaction'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Person = persist.define("Person", {
      "name": type.STRING
    });

    testUtils.connect(persist, {}, function(err, connection) {
      self.connection = connection;
      callback();
    });
  },

  tearDown: function(callback) {
    this.connection.close();
    callback();
  },

  "rollback": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "bob" });
    this.connection.tx(function(err, tx) {
      if(err) { console.log(err); return; }
      person1.save(self.connection, function(err, p) {
        tx.rollback(function(err) {
          if(err) { console.log(err); return; }
          self.Person.using(self.connection).all(function(err, items) {
            if(err) { console.log(err); return; }
            test.equals(items.length, 0);
            test.done();
          });
        });
      });
    });
  },

  "commit": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "bob" });
    this.connection.tx(function(err, tx) {
      if(err) { console.log(err); return; }
      person1.save(self.connection, function(err, p) {
        if(err) { console.log(err); return; }
        tx.commit(function(err) {
          if(err) { console.log(err); return; }
          self.Person.using(self.connection).all(function(err, items) {
            test.ifError(err);
            test.equals(items.length, 1);
            test.done();
          });
        });
      });
    });
  }
});
