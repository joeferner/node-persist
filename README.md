# persist

persist is an ORM framework for node.js.

The following databases are currently supported:

 * sqlite3 - via: [node-sqlite3](https://github.com/developmentseed/node-sqlite3)
 * mysql - via: [node-mysql](https://github.com/felixge/node-mysql)
 * PostgreSQL - via: [node-postgres](https://github.com/brianc/node-postgres)
 * Oracle - via: [node-oracle](https://github.com/nearinfinity/node-oracle)

# Quick Examples
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

# Download

You can install using Node Package Manager (npm):

    npm install persist

# Index

## [database.json](#databaseJson)

## persist
 * [connect](#persistConnect)
 * [define](#persistDefine)
 * [setDefaultConnectOptions](#persistSetDefaultConnectOptions)

## Connection

 * [chain](#connectionChain)
 * [tx](#connectionTx)

## Model

 * [hasMany](#modelHasMany)
 * [using](#modelUsing)
 * [save](#modelSave)
 * [update (instance)](#modelInstanceUpdate)
 * [update](#modelUpdate)
 * [delete](#modelDelete)
 * [Associated Object Properties](#associatedObjectProperties)

## Query

 * [all](#queryAll)
 * [each](#queryEach)
 * [first](#queryFirst)
 * [orderBy](#queryOrderBy)
 * [limit](#queryLimit)
 * [where](#queryWhere)
 * [count](#queryCount)
 * [min](#queryMin)
 * [max](#queryMax)
 * [deleteAll](#queryDeleteAll)
 * [include](#queryInclude)

## Transaction

 * [commit](#txCommit)
 * [rollback](#txRollback)

## Results Set
 * [getById](#resultSetGetById)

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
      }
    }

"default" specifies which environment to load.

# API Documentation

<a name="persist"/>
## persist

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

    persist.connect({
      driver: 'sqlite3',
      filename: 'test.db',
      trace: true
    }, function(err, connection) {
      // connnection esablished
    });

<a name="persistDefine" />
### persist.define(modelName, properties): Model

Defines a model object for use in persist.

__Arguments__

 * modelName - The name of the model. This name will map to the database name.
 * properties - Hash of properties (or columns). The value of each property can simply be the type name (ie type.STRING)
                or it can be a hash of more options.
  * type - type of the property (ie type.STRING)
  * defaultValue - this can be a value or a function that will be called each time this model object is created
  * dbColumnName - the name of the database column. (default: name of the property, all lower case, seperated by '_')

__Returns__

 A model class.

__Example__

    Person = persist.define("Person", {
      "name": type.STRING,
      "createdDate": { type: type.DATETIME, defaultValue: function() { return self.testDate1 }, dbColumnName: 'new_date' },
      "lastUpdated": { type: type.DATETIME }
    })

<a name="persistSetDefaultConnectOptions"/>
### persist.setDefaultConnectOptions(options)

Sets the default connection options to be used on future connect calls. see [database.json](#databaseJson)

__Arguments__
 * options - See [connect](#persistConnect) for the description of options

__Example__

    persist.setDefaultConnectOptions({
      driver: 'sqlite3',
      filename: 'test.db',
      trace: true});

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
      Phone.all
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
    });

    // mapped chaining
    connection.chain({
      minAge: Person.min('age'),
      maxAge: Person.max('age')
    }, function(err, results) {
      // results.minAge = 21
      // results.maxAge = 25
    });

<a name="connectionTx"/>
### connection.tx(callback)

Begins a transaction on the connection.

__Arguments__

 * callback(err, tx) - Callback called when the transaction has started. tx is a transaction object which you can
   call [commit](#txCommit) or [rollback](#txRollback)

__Example__

    connection.tx(function(err, tx) {
      person1.save(connection, function(err) {
        tx.commit(function(err) {
          // person1 saved and committed to database
        });
      });
    });

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

__Returns__

 The model class object suitable for chaining.

__Example__

    Phone = persist.define("Phone", {
      "number": persist.String
    });

    Person = persist.define("Person", {
      "name": persist.String
    }).hasMany(Phone);

<a name="modelUsing" />
### Model.using(connection): query

Gets a query object bound to a connection object.

__Arguments__

 * connection - The connection to bind the query object to.

__Returns__

 A new [Query](#query) object.

__Example__

    Person.using(connection).first(...);

<a name="modelSave" />
### Model.save(connection, callback)

Saves the model object to the database

__Arguments__

 * connection - The connection to use to save the object with.
 * callback(err) - The callback to be called when the save is complete

__Example__

    person1.save(connection, function() {
      // person1 saved
    });

<a name="modelInstanceUpdate" />
### modelInstance.update(connection, params, callback)

Updates the model object to the database

__Arguments__

 * connection - The connection to use to update the object with.
 * params - Object containing properties to update.
 * callback(err) - The callback to be called when the update is complete

__Example__

    person1.update(connection, { name: 'Tom' }, function() {
      // person1 saved
    });

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

    Person.update(connection, 5, { name: 'Tom' }, function() {
      // person with id = 5 updated with name 'Tom'.
    });

    // or chaining
    connection.chain([
      Person.update(5, { name: 'Tom' })
    ], function(err, results) {
      // person with id = 5 updated with name 'Tom'.
    });

<a name="modelDelete" />
### Model.delete(connection, callback)

Deletes the model object from the database

__Arguments__

 * connection - The connection to use to delete the object with.
 * callback(err) - The callback to be called when the delete is complete

__Example__

    person1.delete(connection, function() {
      // person1 deleted
    });

<a name="associatedObjectProperties" />
### Associated Object Properties

If you have setup an associated property using [hasMany](#modelHasMany) instances of your model will have an additional property
which allows you to get the associated data. This property returns a [Query](#query) object which you can further chain to limit
the results.

__Example__

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

    Person.all(connection, function(err, people) {
      // all the people
    });

<a name="queryEach" />
### query.each([connection], callback, doneCallback)

Gets items from a query calling the callback for each item returned.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after each row has been fetched. item is a model instance.
 * doneCallback(err) - Callback called after all rows have been retrieved.

__Example__

    Person.each(connection, function(err, person) {
      // a person
    }, function() {
      // all done
    });

<a name="queryFirst" />
### query.first([connection], callback)

Gets the first item from a query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after the row has been fetched. item is a model instance.

__Example__

    Person.first(connection, function(err, person) {
      // gets the first person
    });

<a name="queryOrderBy" />
### query.orderBy(propertyName): query

Orders the results of a query.

__Arguments__

 * propertyName - Name of the property to order by.

__Returns__

 The query object suitable for chaining.

__Example__

    Person.orderBy('name').all(connection, function(err, people) {
      // all the people ordered by name
    });

<a name="queryLimit" />
### query.limit(count, [offset]): query

Limits the number of results of a query.

__Arguments__

 * count - Number of items to return.
 * offset - (Optional) The number of items to skip.

__Returns__

 The query object suitable for chaining.

__Example__

    Person.orderBy('name').limit(5, 5).all(connection, function(err, people) {
      // The 5-10 people ordered by name
    });

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

    Person.where('name = ?', 'bob').all(connection, function(err, people) {
      // All the people named 'bob'
    });

    Person.where({'name': 'bob', 'age': 23}).all(connection, function(err, people) {
      // All the people named 'bob' with the age of 23
    });

<a name="queryCount" />
### query.count([connection], callback)

Counts the number of items that would be returned by the query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, count) - Callback with the count of items.

__Example__

    Person.where('name = ?', 'bob').count(connection, function(err, count) {
      // count = the number of people with the name bob
    });

<a name="queryMin" />
### query.min([connection], fieldName, callback)

Gets the minimum value in the query of the given field.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * fieldName - The field name of the value you would like to get the minimum for.
 * callback(err, min) - Callback with the minimum value.

__Example__

    Person.where('name = ?', 'bob').min(connection, 'age', function(err, min) {
      // the minimum age of all bobs
    });

<a name="queryMax" />
### query.max([connection], fieldName, callback)

Gets the maximum value in the query of the given field.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * fieldName - The field name of the value you would like to get the maximum for.
 * callback(err, min) - Callback with the maximum value.

__Example__

    Person.where('name = ?', 'bob').max(connection, 'age', function(err, min) {
      // the maximum age of all bobs
    });


<a name="queryDeleteAll" />
### query.deleteAll([connection], callback)

Deletes all the items specified by the query.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err) - Callback called upon completion.

__Example__

    Person.where('name = ?', 'bob').deleteAll(connection, function(err) {
      // all people name 'bob' have been deleted.
    });

<a name="queryInclude" />
### query.include(propertyName): query

Includes the associated data linked by (hasMany or hasMany(through)) the propertyName when retrieving data from the database.
This will replace obj.propertyName with an array of results as opposed to the default before which is a query.

Internally this will do a join to the associated table in the case of a one to many. And will do a join to the associated through table
and the associated table in the case of a many to many.

__Arguments__

 * propertyName - This can be a single property name or an array of property names to include.

__Example__

    Person.include("phones").where('name = ?', 'bob').all(connection, function(err, people) {
      // all people named 'bob' and all their phone numbers
      // so you can do... people[0].phones[0].number
      // as opposed to... people[0].phones.all(function(err, phones) {});
    });

<a name="tx"/>
## Transaction

<a name="txCommit"/>
### tx.commit(callback)

Commits a transaction.

__Arguments__

 * callback(err) - Callback called when the transaction has committed.

__Example__

    connection.tx(function(err, tx) {
      person1.save(connection, function(err) {
        tx.commit(function(err) {
          // person1 saved and committed to database
        });
      });
    });

<a name="txRollback"/>
### tx.rollback(callback)

Rollsback a transaction.

__Arguments__

 * callback(err) - Callback called when the transaction has rolledback.

__Example__

    connection.tx(function(err, tx) {
      person1.save(connection, function(err) {
        tx.rollback(function(err) {
          // person1 not saved. Transaction rolledback.
        });
      });
    });

<a name="resultSetMethods"/>
## Result Set

<a name="resultSetGetById"/>
### rs.getById(id)

Gets an item from the result set by id.

__Arguments__

 * id - The id of the item to get.

__Example__

    Person.all(connection, function(err, people) {
      var person2 = people.getById(2);
    });

