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

# API Documentation

<a name="model" />
## Model

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
### Model.using(connection): Query

Gets a query object bound to a connection object.

__Arguments__

 * connection - The connection to bind the query object to.

__Returns__

 A new [Query](#query) object.

__Example__

    Person.using(connection).first(...);

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

### query.all([connection], callback)

Gets all items from a query as a single array of items.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, items) - Callback to be called after the rows have been fetched. items is an array of model instances.

__Example__

    Person.all(connection, function(err, people) {
      // all the people
    });

### query.each([connection], callback, doneCallback)

Gets items from a query calling the callback for each item returned.

__Arguments__

 * connection - (Optional) The connection to use. If this is not specified a [using](#modelUsing) statement must be specified earlier.
 * callback(err, item) - Callback to be called after each row has been fetched. item is a model instances.
 * doneCallback(err) - Callback called after all rows have been retrieved.

__Example__

    Person.each(connection, function(err, person) {
      // a person
    }, function() {
      // all done
    });

### query.orderBy(propertyName): query

Sets an order by on the query.

__Arguments__

 * propertyName - Name of the property to order by.

__Returns__

 The query object suitable for chaining.

__Example__

    Person.orderBy('name').all(connection, function(err, people) {
      // all the people
    });