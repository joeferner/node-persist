# persist

persist is an ORM framework for node.js.

The following databases are currently supported:

 * sqlite3 - via: [node-sqlite3](https://github.com/developmentseed/node-sqlite3)
 * mysql - via: [node-mysql](https://github.com/felixge/node-mysql)
 * PostgreSQL - via: [node-postgres](https://github.com/brianc/node-postgres)
 * Oracle - via: [node-oracle](https://github.com/nearinfinity/node-oracle)

# Quick Examples
```javascript
var persist = require("persist");
var type = persist.type;

// define some model objects
Phone = persist.define("Phone", {
  "number": type.STRING
});

Person = persist.define("Person", {
  "name": type.STRING
}).hasMany(this.Phone);

persist.connect({
  driver: 'sqlite3',
  filename: 'test.db',
  trace: true
}, function(err, connection) {
  Person.using(connection).all(function(err, people) {
    // people contains all the people
  });
});
```
# Download

You can install using Node Package Manager (npm):

    npm install persist

# Index

## [database.json](#databaseJson)

## persist
 * [env](#persistEnv)
 * [connect](#persistConnect)
 * [define](#persistDefine)
 * [defineAuto](#persistDefineAuto)
 * [setDefaultConnectOptions](#persistSetDefaultConnectOptions)
 * [shutdown](#persistShutdown)

## Connection

 * [chain](#connectionChain)
 * [tx](#connectionTx)
 * [runSql](#connectionRunSql)
 * [runSqlAll](#connectionRunSqlAll)
 * [runSqlEach](#connectionRunSqlEach)
 * [runSqlFromFile](#connectionRunSqlFromFile)
 * [runSqlAllFromFile](#connectionRunSqlAllFromFile)
 * [runSqlEachFromFile](#connectionRunSqlEachFromFile)

## Model

 * [hasMany](#modelHasMany)
 * [hasOne](#modelHasOne)
 * [using](#modelUsing)
 * [save](#modelSave)
 * [update (instance)](#modelInstanceUpdate)
 * [update](#modelUpdate)
 * [delete](#modelDelete)
 * [getById](#modelGetById)
 * [onSave](#modelOnSave)
 * [onLoad](#modelOnLoad)
 * [Associated Object Properties](#associatedObjectProperties)

## Query

 * [all](#queryAll)
 * [each](#queryEach)
 * [first](#queryFirst)
 * [last](#queryLast)
 * [orderBy](#queryOrderBy)
 * [limit](#queryLimit)
 * [where](#queryWhere)
 * [whereIn](#queryWhereIn)
 * [count](#queryCount)
 * [min](#queryMin)
 * [max](#queryMax)
 * [sum](#querySum)
 * [deleteAll](#queryDeleteAll)
 * [updateAll](#queryUpdateAll)
 * [include](#queryInclude)

## Transaction

 * [commit](#txCommit)
 * [rollback](#txRollback)

## Results Set
 * [getById](#resultSetGetById)

## Connection Pooling
 * [using](#connectionPoolingUsing)

<a name="databaseJson"/>
# database.json

If the current working directory contains a file called database.json this file will be loaded upon requiring persist.
The file should follow a format like this:

    {
      "default": "dev",

      "dev": {
        "driver": "sqlite3",
        "filename": ":memory:"
      },

      "test": {
        "driver": "sqlite3",
        "filename": ":memory:"
      },

      "prod": {
        "driver": "sqlite3",
        "filename": "prod.db"
        "sqlDir": "./prodSql",
        "pooling": {
          "name": "testPool",
          "max": 2,
          "min": 1,
          "idleTimeoutMillis": 30000
        }
      }
    }

"default" specifies which environment to load.

# API Documentation

<a name="persist"/>
## persist

<a name="persistEnv" />
### persist.env

The environment to read from the database.json file. If not set will use the value of default from the database.json.

__Example__

    persist.env = 'prod';

<a name="persistConnect" />
### persist.connect([options], callback)

Connects to a database.

__Arguments__

 * options - (optional) Options used to connect to the database. If options are not specified the default connect options are used.
             see [database.json](#databaseJson) and [SetDefaultConnectOptions](#persistSetDefaultConnectOptions)
  * driver - The driver to use to connect (ie sqlite3, mysql, oracle, or postgresql).
  * db - If db is specified this parameter will be assumed to be an already open connection to the database.
  * _other_ - see the documentation for your driver. The options hash will be passed to that driver.
 * callback(err, connection) - Callback to be called when the connection is established.

__Example__
```javascript
persist.connect({
  driver: 'sqlite3',
  filename: 'test.db',
  trace: true
}, function(err, connection) {
  // connnection esablished
});
```
<a name="persistDefine" />
### persist.define(modelName, properties, [opts]): Model

Defines a model object for use in persist.

The primary key column does not need to be specified and will default to the name 'id' with the attributes dbColumnName='id',
type='integer'. You can override the database name using dbColumnName or setting the primaryKey attribute on any column.

__Arguments__

 * modelName - The name of the model. This name will map to the database name.
 * properties - Hash of properties (or columns). The value of each property can simply be the type name (ie type.STRING)
                or it can be a hash of more options.
  * type - type of the property (ie type.STRING)
  * defaultValue - this can be a value or a function that will be called each time this model object is created
  * dbColumnName - the name of the database column. (default: name of the property, all lower case, seperated by '_')
  * primaryKey - Marks this column as being the primary key column. You can have only one primary key column.
 * opts - Options for this column.
  * tableName - The name of the table (default: modelName pluralized).

__Returns__

 A model class.

__Example__
```javascript
Person = persist.define("Person", {
  "name": type.STRING,
  "createdDate": { type: type.DATETIME, defaultValue: function() { return self.testDate1 }, dbColumnName: 'new_date' },
  "lastUpdated": { type: type.DATETIME }
})
```
<a name="persistDefineAuto" />
### persist.defineAuto(modelName, dbConfig, callback): Model

Defines a model object for use in persist. Columns are defined by the program in this method. Uses an existing database connection to retrieve column data.

__Arguments__

 * modelName - The name of the model. This name will map to the table name.
 * dbConfig - Hash of dbConfig. Should contain the driver, as well as the database name.
 * database - The database connection to use.
 * driver - The name of the database driver to use.

__Returns__

 A model class.

__Example__
```javascript
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
```
<a name="persistSetDefaultConnectOptions"/>
### persist.setDefaultConnectOptions(options)

Sets the default connection options to be used on future connect calls. see [database.json](#databaseJson)

__Arguments__
 * options - See [connect](#persistConnect) for the description of options

__Example__
```javascript
persist.setDefaultConnectOptions({
  driver: 'sqlite3',
  filename: 'test.db',
  trace: true});
```
<a name="persistShutdown"/>
### persist.shutdown([callback])

Shutdown persist. This is currently only required if you are using connection pooling. see [generic-pool](https://github.com/coopernurse/node-pool).

__Arguments__
 * [callback] - Optional callback on successful shutdown.

__Example__
```javascript
persist.shutdown(function() {
  console.log('persist shutdown');
});
```
<a name="connection"/>
## Connection

<a name="connectionChain"/>
### connection.chain(chainables, callback)

Chains multiple statements together in order and gets the results.

__Arguments__

 * chainables - An array of chainable queries. These can be save, updates, selects, or deletes. Each item in the array will be
   executed, wait for the results, and then execute the next. This can also be a hash of queries in which case the results
   will contain a hash of results where each key corresponds to a key in the results.
 * callback(err, results) - Callback called when all the items have been executed.

__Example__
```javascript
// array chaining
connection.chain([
  person3.save,
  Person.min('age'),
  Person.max('age'),
  phone3.delete,
  person2.delete,
  Person.orderBy('name').all,
  Phone.orderBy('number').first,
  Phone.count,
  Phone.deleteAll,
  Phone.all,
  Person.getById(1),
  persist.runSql('SELECT * FROM Person')
], function(err, results) {
  // results[0] = person3
  // results[1] = 21
  // results[2] = 25
  // results[3] = []
  // results[4] = []
  // results[5] = -- all people ordered by name
  // results[6] = -- first phone ordered by number
  // results[7] = 100
  // results[8] = []
  // results[9] = [] -- nobody left
  // results[10] = -- the person with id 1
  // results[11] = Results of select.
});

// mapped chaining
connection.chain({
  minAge: Person.min('age'),
  maxAge: Person.max('age')
}, function(err, results) {
  // results.minAge = 21
  // results.maxAge = 25
});
```
<a name="connectionTx"/>
### connection.tx(callback)

Begins a transaction on the connection.

__Arguments__

 * callback(err, tx) - Callback called when the transaction has started. tx is a transaction object which you can
   call [commit](#txCommit) or [rollback](#txRollback)

__Example__
```javascript
connection.tx(function(err, tx) {
  person1.save(connection, function(err) {
    tx.commit(function(err) {
      // person1 saved and committed to database
    });
  });
});
```
<a name="connectionRunSql"/>
### connection.runSql(sql, values, callback)

Runs a sql statement that does not return results (INSERT, UPDATE, etc).

__Arguments__

 * sql - The SQL statement to run.
 * values - The values to substitute in the SQL statement. This is DB specific but typically you would use "?".
 * callback(err, results) - Callback called when SQL statement completes. results will contain the number of affected
   rows or last insert id.

__Example__
```javascript
connection.runSql("UPDATE people SET age = ?", [32], function(err, results) {
  // people updated
});
```
<a name="connectionRunSqlAll"/>
### connection.runSqlAll(sql, values, callback)

Runs a sql statement that returns results (ie SELECT).

__Arguments__

 * sql - The SQL statement to run.
 * values - The values to substitute in the SQL statement. This is DB specific but typically you would use "?".
 * callback(err, results) - Callback called when SQL statement completes. results will contain the row data.

__Example__
```javascript
connection.runSqlAll("SELECT * FROM people WHERE age = ?", [32], function(err, people) {
  // people contains all the people with age 32
});
```
<a name="connectionRunSqlEach"/>
### connection.runSqlEach(sql, values, callback, doneCallback)

Runs a sql statement that returns results (ie SELECT). This is different from runSqlAll in that it returns each row
in a seperate callback.

__Arguments__

 * sql - The SQL statement to run.
 * values - The values to substitute in the SQL statement. This is DB specific but typically you would use "?".
 * callback(err, row) - Callback called for each row returned.
 * doneCallback(err) - Callback called after all the rows have returned.

__Example__
```javascript
connection.runSqlEach("SELECT * FROM people WHERE age = ?", [32], function(err, person) {
  // a single person
}, function(err) {
  // all done
});
```
<a name="connectionRunSqlFromFile"/>
<a name="connectionRunSqlAllFromFile"/>
<a name="connectionRunSqlEachFromFile"/>
### connection.runSqlFromFile(filename, values, callback)
### connection.runSqlAllFromFile(filename, values, callback)
### connection.runSqlEachFromFile(filename, values, callback, doneCallback)

Same as [runSql](#connectionRunSql), [runSqlAll](#connectionRunSqlAll), [runSqlEach](#connectionRunSqlEach) except the first parameter is a filename of where to load the SQL from.

__Example__
```javascript
connection.runSqlFromFile('report.sql', [32], function(err, person) {
  // a single person
}, function(err) {
  // all done
});
```
<a name="model" />
## Model

<a name="modelHasMany" />
### Model.hasMany(AssociatedModel, [options]): Model

Adds a has many relationship to a model. This will automatically add a property to the associated model which links to this
model. It will also define a property on instances of this model to get the releated objects - see [Associated Object Properties](#associatedObjectProperties)

__Arguments__

 * AssociatedModel - The name of the model to associate to.
 * options - (optional) An hash of options.
  * through - creates a many to many relationship using the value of through as the join table.
  * name - the name of the property to expose.

__Returns__

 The model class object suitable for chaining.

__Example__
```javascript
Phone = persist.define("Phone", {
  "number": persist.String
});

Person = persist.define("Person", {
  "name": persist.String
}).hasMany(Phone);
```
<a name="modelHasOne" />
### Model.hasOne(AssociatedModel, [options]): Model

Adds a has one relationship to a model. This will automatically add a property to the associated model which links to this
model. It will also define a property on instances of this model to get the releated objects - see [Associated Object Properties](#associatedObjectProperties)

__Arguments__

 * AssociatedModel - The name of the model to associate to.
 * options - (optional) An hash of options.
  * foreignKey - The foreign key to use for the relationship
  * name - the name of the property to expose.
  * createHasMany - true/false to create the other side of the relationship.

__Returns__

 The model class object suitable for chaining.

__Example__
```javascript
Phone = persist.define("Phone", {
  "number": persist.String
}).hasMany(Person);

Person = persist.define("Person", {
  "name": persist.String
});
```
<a name="modelUsing" />
### Model.using(connection): query

Gets a query object bound to a connection object.

__Arguments__

 * connection - The connection to bind the query object to.

__Returns__

 A new [Query](#query) object.

__Example__
```javascript
Person.using(connection).first(...);
```
<a name="modelSave" />
### Model.save(connection, callback)

Saves the model object to the database

__Arguments__

 * connection - The connection to use to save the object with.
 * callback(err) - The callback to be called when the save is complete

__Example__
```javascript
person1.save(connection, function() {
  // person1 saved
});
```
<a name="modelInstanceUpdate" />
### modelInstance.update(connection, params, callback)

Updates the model object to the database

__Arguments__

 * connection - The connection to use to update the object with.
 * params - Object containing properties to update.
 * callback(err) - The callback to be called when the update is complete

__Example__
```javascript
person1.update(connection, { name: 'Tom' }, function() {
  // person1 saved
});
```
<a name="modelUpdate" />
### Model.update(connection, id, params, callback)

Updates the model object specified with id to the database. This will only update the values
specified and will not retreive the item from the database first.

__Arguments__

 * connection - The connection to use to update the object with.
 * id - The id of the row you would like to update.
 * params - Object containing properties to update.
 * callback(err) - The callback to be called when the update is complete

__Example__
```javascript
Person.update(connection, 5, { name: 'Tom' }, function() {
  // person with id = 5 updated with name 'Tom'.
});

// or chaining
connection.chain([
  Person.update(5, { name: 'Tom' })
], function(err, results) {
  // person with id = 5 updated with name 'Tom'.
});
```
<a name="modelDelete" />
### Model.delete(connection, callback)

Deletes the model object from the database

__Arguments__

 * connection - The connection to use to delete the object with.
 * callback(err) - The callback to be called when the delete is complete

__Example__
```javascript
person1.delete(connection, function() {
  // person1 deleted
});
```
<a name="modelGetById" />
### Model.getById(connection, id, callback)

Gets an object from the database by id.

__Arguments__

 * connection - The connection to use to delete the object with.
 * id - The if of the item to get.
 * callback(err, obj) - The callback to be called when the delete is complete

__Example__
```javascript
Person.getById(connection, 1, function(err, person) {
  // person is the person with id equal to 1. Or null if not found
});
```
<a name="modelOnSave" />
### Model.onSave(obj, connection, callback)

If preset this function will be called when an update or save occures. You would typically create this method
in your model file.

__Arguments__

 * obj - The object or partial object, in the case of [update](#modelUpdate), being saved.
 * connection - The connection persist is currently using to do the save
 * callback() - The callback to be called when the onSave is complete

__Example__
```javascript
Person.onSave = function(obj, connection, callback) {
  obj.lastUpdated = new Date();
  callback();
};
```
<a name="modelOnLoad" />
### Model.onLoad(obj)

If preset this function will be called after an object is loaded from the database. You would typically
create this method in your model file.

__Arguments__

 * obj - The object that was just loaded from the database.

__Example__
```javascript
Person.onLoad = function(obj) {
  obj.fullName = obj.firstName + ' ' + obj.lastName;
};
```
<a name="associatedObjectProperties" />
### Associated Object Properties

If you have setup an associated property using [hasMany](#modelHasMany) instances of your model will have an additional property
which allows you to get the associated data. This property returns a [Query](#query) object which you can further chain to limit
the results.

__Example__
```javascript
Phone = persist.define("Phone", {
  "number": persist.String
});

Person = persist.define("Person", {
  "name": persist.String
}).hasMany(Phone);

Person.using(connection).first(function(err, person) {
  person.phones.orderBy('number').all(function(err, phones) {
    // all the phones of the first person
  });
});
```
<a name="query" />
## Query

<a name="queryAll" />
### query.all([connection], callback)

Gets all items from a query as a single array of items. The array returned will have additional
methods see [here for documentation](#resultSetMethods).

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, items) - Callback to be called after the rows have been fetched. items is an array of model instances.

__Example__
```javascript
Person.all(connection, function(err, people) {
  // all the people
});
```
<a name="queryEach" />
### query.each([connection], callback, doneCallback)

Gets items from a query calling the callback for each item returned.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after each row has been fetched. item is a model instance.
 * doneCallback(err) - Callback called after all rows have been retrieved.

__Example__
```javascript
Person.each(connection, function(err, person) {
  // a person
}, function() {
  // all done
});
```
<a name="queryFirst" />
### query.first([connection], callback)

Gets the first item from a query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after the row has been fetched. item is a model instance.

__Example__
```javascript
Person.first(connection, function(err, person) {
  // gets the first person
});
```
<a name="queryLast" />
### query.last([connection], callback)

Gets the last item from a query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after the row has been fetched. item is a model instance.

__Example__
```javascript
Person.last(connection, function(err, person) {
  // gets the last person
});
```
<a name="queryOrderBy" />
### query.orderBy(propertyName, direction): query

Orders the results of a query.

__Arguments__

 * propertyName - Name of the property to order by.
 * direction - The direction to orderBy. Can be persist.Ascending or persist.Descending.

__Returns__

 The query object suitable for chaining.

__Example__
```javascript
Person.orderBy('name').all(connection, function(err, people) {
  // all the people ordered by name
});
```
<a name="queryLimit" />
### query.limit(count, [offset]): query

Limits the number of results of a query.

__Arguments__

 * count - Number of items to return.
 * offset - (Optional) The number of items to skip.

__Returns__

 The query object suitable for chaining.

__Example__
```javascript
Person.orderBy('name').limit(5, 5).all(connection, function(err, people) {
  // The 5-10 people ordered by name
});
```
<a name="queryWhere" />
### query.where(clause, [values...]): query
### query.where(hash): query

Filters the results by a where clause.

__Arguments__

 * clause - A clause to filter the results by.
 * values - (Optional) A single value or array of values to substitute in for '?'s in the clause.
 * hash - A hash of columns and values to match on (see example)

__Returns__

 The query object suitable for chaining.

__Example__
```javascript
Person.where('name = ?', 'bob').all(connection, function(err, people) {
  // All the people named 'bob'
});

Person.where('name = ? or age = ?', ['bob', 23]).all(connection, function(err, people) {
  // All the people named 'bob' or people with age 23
});

Person.where({'name': 'bob', 'age': 23}).all(connection, function(err, people) {
  // All the people named 'bob' with the age of 23
});
```
<a name="queryWhereIn" />
### query.whereIn(property, [values...]): query
Filters the results by a where clause using an IN clause.

__Arguments__
 * property - The property to invoke the IN clause on.
 * values - An array of values to include in the IN clause.

__Returns__

 The query object suitable for chaining.

__Example__
```javascript
Person.whereIn('name', ['bob', 'alice', 'cindy']).all(connection, function(err,people) {
  // All the people named 'bob', 'alice', or 'cindy'
});

Person.include("phones").whereIn('phones.number', ['111-2222','333-4444']).all(connection, function(err,people){
  // All the people whose phone numbers are '111-2222' or '333-4444'
});
```
<a name="queryCount" />
### query.count([connection], callback)

Counts the number of items that would be returned by the query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, count) - Callback with the count of items.

__Example__
```javascript
Person.where('name = ?', 'bob').count(connection, function(err, count) {
  // count = the number of people with the name bob
});
```
<a name="queryMin" />
### query.min([connection], fieldName, callback)

Gets the minimum value in the query of the given field.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * fieldName - The field name of the value you would like to get the minimum for.
 * callback(err, min) - Callback with the minimum value.

__Example__
```javascript
Person.where('name = ?', 'bob').min(connection, 'age', function(err, min) {
  // the minimum age of all bobs
});
```
<a name="queryMax" />
### query.max([connection], fieldName, callback)

Gets the maximum value in the query of the given field.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * fieldName - The field name of the value you would like to get the maximum for.
 * callback(err, min) - Callback with the maximum value.

__Example__
```javascript
Person.where('name = ?', 'bob').max(connection, 'age', function(err, min) {
  // the maximum age of all bobs
});
```
<a name="querySum" />
### query.sum([connection], fieldName, callback)

Gets the sum of all values in the query of the given field.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * fieldName - The field name you would like to sum.
 * callback(err, sum) - Callback with the sum value.

__Example__
```javascript
Person.where('name = ?', 'bob').sum(connection, 'age', function(err, sum) {
  // the sum of all ages whos name is bob
});
```
<a name="queryDeleteAll" />
### query.deleteAll([connection], callback)

Deletes all the items specified by the query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err) - Callback called upon completion.

__Example__
```javascript
Person.where('name = ?', 'bob').deleteAll(connection, function(err) {
  // all people name 'bob' have been deleted.
});
```
<a name="queryUpdateAll" />
### query.updateAll([connection], data, callback)

Updates all the items specified by the query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * data - A hash of properties to update. Key is the property name to update. Value is the value to update the property to.
 * callback(err) - Callback called upon completion.

__Example__
```javascript
Person.where('name = ?', 'bob').updateAll(connection, { age: 25 }, function(err) {
  // all people name 'bob' have their age set to 25.
});
```
<a name="queryInclude" />
### query.include(propertyName): query

Includes the associated data linked by (hasMany or hasMany(through)) the propertyName when retrieving data from the database.
This will replace obj.propertyName with an array of results as opposed to the default before which is a query.

Internally this will do a join to the associated table in the case of a one to many. And will do a join to the associated through table
and the associated table in the case of a many to many.

__Arguments__

 * propertyName - This can be a single property name or an array of property names to include.

__Example__
```javascript
Person.include("phones").where('name = ?', 'bob').all(connection, function(err, people) {
  // all people named 'bob' and all their phone numbers
  // so you can do... people[0].phones[0].number
  // as opposed to... people[0].phones.all(function(err, phones) {});
});
```
<a name="tx"/>
## Transaction

<a name="txCommit"/>
### tx.commit(callback)

Commits a transaction.

__Arguments__

 * callback(err) - Callback called when the transaction has committed.

__Example__
```javascript
connection.tx(function(err, tx) {
  person1.save(connection, function(err) {
    tx.commit(function(err) {
      // person1 saved and committed to database
    });
  });
});
```
<a name="txRollback"/>
### tx.rollback(callback)

Rollsback a transaction.

__Arguments__

 * callback(err) - Callback called when the transaction has rolledback.

__Example__
```javascript
connection.tx(function(err, tx) {
  person1.save(connection, function(err) {
    tx.rollback(function(err) {
      // person1 not saved. Transaction rolledback.
    });
  });
});
```
<a name="resultSetMethods"/>
## Result Set

<a name="resultSetGetById"/>
### rs.getById(id)

Gets an item from the result set by id.

__Arguments__

 * id - The id of the item to get.

__Example__
```javascript
Person.all(connection, function(err, people) {
  var person2 = people.getById(2);
});
```
<a name="connectionPooling"/>
## Connection Pooling

<a name="connectionPoolingUsing"/>
### Using

Persist uses [generic-pool](https://github.com/coopernurse/node-pool) to manage the connection pool. If you specify
"pooling" in your configuration you must specify a pool name. See [generic-pool](https://github.com/coopernurse/node-pool)
for other options. To cleanly shutdown the connection pool you must also call persist.[shutdown](#persistShutdown).

Example database.json to enable pooling:

    {
      "default": "dev",

      "dev": {
        "driver": "sqlite3",
        "filename": ":memory:",
        "pooling": {
          "name": "myDatabasePool"
        }
      }
    }
