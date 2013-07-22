
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../test_helpers/test_utils");

exports['Chain'] = nodeunit.testCase({
  setUp: function(callback) {
    var self = this;

    this.Phone = persist.define("Phone", {
      "number": { type: type.STRING, dbColumnName: 'numbr' }
    });

    this.Person = persist.define("Person", {
      "name": type.STRING,
      "age": type.INTEGER
    }).hasMany(this.Phone);

    this.Person.defineClause('testClause', function(age) {
      return this.where('age = ?', age || 21).where('name like "%Bob%"');
    });

    this.Person.defineClause('testClause2', function(connection, callback) {
      return this.where('age = ?', 21).where('name like "%Bob%"').all(connection, callback);
    });

    testUtils.connect(persist, {}, function(err, connection) {
      if(err) { console.log(err); return; }
      self.connection = connection;
      self.person1 = new self.Person({ name: "Bob O'Neill", age: 21 });
      self.person2 = new self.Person({ name: "john", age: 23 });
      self.phone1 = new self.Phone({ person: self.person1, number: '111-2222' });
      self.phone2 = new self.Phone({ person: self.person1, number: '222-3333' });
      self.phone3 = new self.Phone({ person: self.person2, number: '333-4444' });

      self.connection.save([self.person1, self.person2, self.phone1, self.phone2, self.phone3], function(err) {
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

  "chain": function(test) {
    var self = this;
    var person3 = new self.Person({ name: "fred", age: 25 });
    var phone1Id = self.phone1.id;

    this.connection.chain([
      person3.save,
      self.Person.min('age'),
      self.Person.max('age'),
      self.phone3.delete,
      self.person2.delete,
      self.Person.orderBy('name').all,
      self.Phone.orderBy('number').first,
      self.Phone.count,
      self.Phone.getById(phone1Id),
      self.Phone.update(phone1Id, { number: '555-5555' }),
      self.Phone.all,
      self.Phone.deleteAll,
      self.Phone.all,
      self.Person.first,
      persist.runSqlAll('SELECT * FROM People'),
      self.Person.testClause(21).all,
      self.Person.limit(5).testClause().all,
      self.Person.limit(5).testClause2,
    ], function(err, results) {
      if (err) { 
        console.error(err); 
        return; 
      }

      // person3.save
      test.equal(results[0].name, 'fred');

      // Person.min
      test.equal(results[1], 21);

      // Person.max
      test.equal(results[2], 25);

      // phone3.delete
      test.ok(results[3]);

      // person2.delete
      test.ok(results[4]);

      // person select all
      test.equal(results[5].length, 2);
      test.equal(results[5][0].name, "Bob O'Neill");
      test.equal(results[5][1].name, "fred");

      // phone select first
      test.equal(results[6].number, "111-2222");

      // phone select count
      test.equal(results[7], 2);

      // phone.getById
      test.ok(results[8]);
      test.ok(results[8].number, '111-2222');

      // phone.update
      test.ok(results[9]);

      // phone all
      test.equal(results[10].length, 2);
      var updatedPhone1 = results[10].getById(phone1Id);
      test.equal(updatedPhone1.number, '555-5555');

      // phone.deleteAll
      test.ok(results[11]);

      // phone.all
      test.equal(results[12].length, 0);

      // Person.first
      test.ok(results[13]);

      // Person.first
      test.ok(results[14].length, 5);

      // Person.testClause
      test.ok(results[15].length, 1);
      test.ok(results[15][0].name, "Bob O'Neill");

      // Person.limit(5).testClause
      test.ok(results[16].length, 1);
      test.ok(results[16][0].name, "Bob O'Neill");

      // Person.limit(5).testClause2
      test.ok(results[17].length, 1);
      test.ok(results[17][0].name, "Bob O'Neill");

      test.done();
    });
  },

  "named chain": function(test) {
    var self = this;

    this.connection.chain({
      minAge: self.Person.min('age'),
      maxAge: self.Person.max('age'),
    }, function(err, results) {
      if(err) { console.error(err); return; }
      test.equal(results.minAge, 21);
      test.equal(results.maxAge, 23);
      test.done();
    });
  },

});
