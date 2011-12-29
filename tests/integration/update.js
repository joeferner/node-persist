
var persist = require("../../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var assert = require("../../test_helpers/assert");
var testUtils = require("../../test_helpers/test_utils");

exports['Update'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": { type: type.STRING, dbColumnName: 'numbr' }
    });

    this.Person = persist.define("Person", {
      "name": type.STRING
    }).hasMany(this.Phone);

    testUtils.connect(persist, function(err, connection) {
      self.connection = connection;
      callback();
    });
  },

  tearDown: function(callback) {
    this.connection.close();
    callback();
  },

  "update": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });
    person1.save(this.connection, function(err, p) {
      if(err) { console.error(err); return; }
      self.Person.using(self.connection).all(function(err, rows) {
        if(err) { console.error(err); return; }
        test.equal(1, rows.length);
        test.equal("Bob O'Neill", rows[0].name);

        // update
        rows[0].name = 'tom';
        rows[0].save(self.connection, function(err) {
          if(err) { console.error(err); return; }
          self.Person.using(self.connection).all(function(err, rows) {
            if(err) { console.error(err); return; }
            test.equal(1, rows.length);
            test.equal('tom', rows[0].name);

            test.done();
          });
        });
      });
    });
  },

  "update with attributes": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });
    person1.save(this.connection, function(err, p) {
      if(err) { console.error(err); return; }
      self.Person.using(self.connection).all(function(err, rows) {
        if(err) { console.error(err); return; }
        test.equal(1, rows.length);
        test.equal("Bob O'Neill", rows[0].name);

        // update
        rows[0].update(self.connection, {name: 'tom'}, function(err) {
          if(err) { console.error(err); return; }
          self.Person.using(self.connection).all(function(err, rows) {
            if(err) { console.error(err); return; }
            test.equal(1, rows.length);
            test.equal('tom', rows[0].name);

            test.done();
          });
        });
      });
    });
  },

  "update without fetch": function(test) {
    var self = this;
    var person1 = new this.Person({ name: "Bob O'Neill" });
    person1.save(this.connection, function(err, p) {
      if(err) { console.error(err); return; }

      self.Person.update(self.connection, p.id, {
        name: "Bob O'Neil"
      }, function(err) {
        if(err) { console.error(err); return; }
        self.Person.where("id = ?", p.id).first(self.connection, function(err, row) {
          if(err) { console.error(err); return; }
          test.equal("Bob O'Neil", row.name);
          test.done();
        });
      });
    });
  }
});
