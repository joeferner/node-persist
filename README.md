# persist

persis is an orm framework for node.js.

The following databases are currently supported:

 * sqlite3 - via: [node-sqlite3](https://github.com/developmentseed/node-sqlite3)
 * mysql - via: [node-mysql](https://github.com/felixge/node-mysql)

# Quick Examples
    var persist = require("persist");

    // define some model objects
    Phone = persist.define("Phone", {
      "number": persist.String
    });

    Person = persist.define("Person", {
      "name": persist.String
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

## Connection

 * [chain](#connectionChain)
 * [tx](#connectionTx)

## Model

 * [define](#modelDefine)
 * [hasMany](#modelHasMany)
 * [using](#modelUsing)
 * [save](#modelSave)
 * [delete](#modelDelete)
 * [Associated Object Properties](#associatedObjectProperties)

## Query

 * [all](#queryAll)
 * [each](#queryEach)
 * [first](#queryFirst)
 * [orderBy](#queryOrderBy)
 * [limit](#queryLimit)
 * [where](#queryWhere)

## Transaction

 * [commit](#txCommit)
 * [rollback](#txRollback)

# API Documentation

<a name="connection"/>
## Connection

<a name="connectionChain"/>
### connection.chain(chainables, callback)

Chains multiple statements together in order and gets the results.

__Arguments__

 * chainables - An array of chainable queries. These can be save, updates, selects, or deletes. Each item in the array will be
   executed, wait for the results, and then execute the next.
 * callback(err, results) - Callback called when all the items have been executed.

__Example__

    connection.chain([
      person3.save,
      phone3.delete,
      person2.delete,
      Person.orderBy('name').all,
      Phone.orderBy('number').first,
      Phone.count,
      Phone.deleteAll,
      Phone.all
    ], function(err, results) {
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

<a name="modelDefine" />
### persist.define(modelName, properties): Model

Defines a model object for use in persist.

__Arguments__

 * modelName - The name of the model. This name will map to the database name.
 * properties - Hash of properties (or columns). The value of each property can simply be the type name (ie persist.String)
                or it can be a hash of more options.
  * type - type of the property (ie persist.String)
  * defaultValue - this can be a value or a function that will be called each time this model object is created
  * dbColumnName - the name of the database column. (default: name of the property, all lower case, seperated by '_')

__Returns__

 A model class.

__Example__

    Person = persist.define("Person", {
      "name": persist.String,
      "createdDate": { type: persist.DateTime, defaultValue: function() { return self.testDate1 }, dbColumnName: 'new_date' },
      "lastUpdated": { type: persist.DateTime }
    })

<a name="modelHasMany" />
### Model.hasMany(AssociatedModel): Model

Adds a has many relationship to a model. This will automatically add a property to the associated model which links to this
model. It will also define a property on instances of this model to get the releated objects - see [Associated Object Properties](#associatedObjectProperties)

__Arguments__

 * AssociatedModel - The name of the model to associate to.

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

Gets all items from a query as a single array of items.

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

Filters the results by a where clause.

__Arguments__

 * clause - A clause to filter the results by.
 * values - (Optional) A single value or array of values to substitute in for '?'s in the clause.

__Returns__

 The query object suitable for chaining.

__Example__

    Person.where('name = ?', 'bob').all(connection, function(err, people) {
      // All the people named 'bob'
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