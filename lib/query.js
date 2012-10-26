'use strict';

var persistUtil = require('./persist_utils');
var Connection = require('./connection');
var SqlTree = require('./sqltree');
var type = require('./type');
var inflection = require('./inflection');

var Query = function(connection, model) {
  var self = this;
  this._getConnection = function() { return connection; }; // hide from JSON.stringify
  this.model = model;
  var tableIndex = 0;
  this._getNextTableAlias = function() { return 't' + (tableIndex++); };
  this.count = persistUtil.bind('count', this.count, this);
  this.all = persistUtil.bind('all', this.all, this);
  this.first = persistUtil.bind('first', this.first, this);
  this.getById = persistUtil.bind('getById', this.getById, this);
  this.deleteAll = persistUtil.bind('deleteAll', this.deleteAll, this);
  this.min = persistUtil.bind('min', this.min, this);
  this.sum = persistUtil.bind('sum', this.sum, this);
  this.max = persistUtil.bind('max', this.max, this);

  var sqlTree = new SqlTree(model);
  this._sqlTree = function() { return sqlTree; }; // hide from JSON.stringify

  sqlTree.tableAlias = this._getNextTableAlias();
  if (model.columns) {
    var propertyName;
    for (propertyName in model.columns) {
      var colDef = sqlTree.addColumn(model, propertyName, sqlTree.tableAlias);
      if (model.columns[propertyName].primaryKey) {
        sqlTree.primaryKeyColumn = colDef;
      }
    }
  }
};

// "name = ?", "bob"
// "name = ? AND age = ?", ["bob", 6]
// "name = 'bob'"
// { "name": "bob", "age", 6 }
Query.prototype.where = function() {
  if (typeof (arguments[0]) === 'string') {
    var expr = arguments[0];
    var params = Array.prototype.slice.call(arguments, 1);
    if (params.length === 1 && params[0] instanceof Array) {
      params = params[0];
    }
    this._sqlTree().where.push({expr: expr, params: params});
  } else {
    var hash = arguments[0];
    var key;
    for (key in hash) {
      this.where(key + ' = ?', [ hash[key] ]);
    }
  }
  return this;
};

Query.prototype.whereIn = function() {
  if (typeof (arguments[0]) === 'string') {
    var expr = arguments[0];
    var params = arguments[1];
    var paramCount = params.length;
    expr = expr + ' IN (';
    var i;
    for (i = 0; i < paramCount - 1; i++) {
      expr = expr + "?,"
    }
    expr = expr + '?)'
    this.where(expr, params);
  }

  return this;
};


// "people"
// ["people", "phones"]
Query.prototype.include = function() {
  var join;
  if (typeof (arguments[0]) === 'string') {
    var associationPropertyName = arguments[0];
    var association = this.model.associations[associationPropertyName]
                        || this.model.associations[inflection.singularize(associationPropertyName)]
      || this.model.associations[inflection.pluralize(associationPropertyName)];
    if (!association) {
      throw new Error('Could not find association "' + associationPropertyName + '" off of "' + this.model.modelName + '"');
    }

    // join to table
    if (association.through) {
      // otherTable, otherTableId, thisTableId
      this.leftJoin(association.through, association.foreignKey, this.model.getIdColumn().dbColumnName);
      join = this._sqlTree().joins[this._sqlTree().joins.length - 1];
      this.leftJoin(association.model.tableName, association.model.getIdColumn().dbColumnName, {tableAlias: join.tableAlias, dbColumnName: association.manyToManyForeignKey});
    } else {
      this.leftJoin(associationPropertyName);
    }

    // add the columns from the new table
    join = this._sqlTree().joins[this._sqlTree().joins.length - 1];
    var primaryKeyColumn;
    var propertyName;
    for (propertyName in association.model.columns) {
      var col = association.model.columns[propertyName];
      var colDef = this._sqlTree().addColumn(association.model, propertyName, join.tableAlias);
      if (col.primaryKey) {
        primaryKeyColumn = colDef;
      }
    }

    // add the include
    this._sqlTree().includes.push({ propertyName: arguments[0], association: association, primaryKeyColumn: primaryKeyColumn });

  } else if (Array.isArray(arguments[0])) {
    var arr = arguments[0];
    var i;
    for (i = 0; i < arr.length; i++) {
      this.include(arr[i]);
    }
  } else if (arguments[0].modelName) {
    this.include(arguments[0].modelName);
  } else {
    throw new Error("Include expects a property name or an array of property names.");
  }
  return this;
};

Query.prototype.join = function(otherTable, otherTableId, thisTableId) {
  return this._join.apply(this, ['join'].concat(persistUtil.toArray(arguments)));
};

Query.prototype.leftJoin = function(otherTable, otherTableId, thisTableId) {
  return this._join.apply(this, ['left join'].concat(persistUtil.toArray(arguments)));
};

// type, otherTable, otherTableId, thisTableId
// type, associationPropertyName
Query.prototype._join = function(type, otherTable, otherTableId, thisTableId) {
  if (arguments.length === 2) {
    var association = this.model.associations[arguments[1]]
                        || this.model.associations[inflection.singularize(arguments[1])]
      || this.model.associations[inflection.pluralize(arguments[1])];
    otherTable = association.model.tableName;
    if (association.type === 'hasOne') {
      otherTableId = this.model.getIdColumn().dbColumnName;
      thisTableId = association.foreignKey;
    } else {
      otherTableId = association.foreignKey;
      thisTableId = this.model.getIdColumn().dbColumnName;
    }
  }

  if (thisTableId.tableAlias) {
    thisTableId = thisTableId.tableAlias + '.' + thisTableId.dbColumnName;
  } else {
    thisTableId = this._sqlTree().tableAlias + '.' + thisTableId;
  }

  this._sqlTree().joins.push({
    type: type,
    otherTable: otherTable,
    otherTableId: otherTableId,
    thisTableId: thisTableId,
    tableAlias: this._getNextTableAlias()
  });
  return this;
};

Query.prototype.orderBy = function(name, orderByDirection) {
  var column = this._sqlTree().getColumnByPropertyName(name);
  if (column === null) {
    throw new Error("Invalid property name [" + name + "] for order by clause.");
  }
  this._sqlTree().orderBy.push({ column: column, direction: orderByDirection });
  return this;
};

Query.prototype.limit = function(count, offset) {
  this._sqlTree().limitCount = count;
  this._sqlTree().limitOffset = offset;
  return this;
};

// connection, callback, doneCallback
// callback, doneCallback
Query.prototype.each = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 2];
  var doneCallback = arguments[arguments.length - 1];

  if (this._sqlTree().includes.length > 0) {
    throw new Error("includes are not support with 'each' method.");
  }

  connection.each(this._sqlTree(), callback, doneCallback);
};

Query.prototype.count = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'count';
  connection.single(this._sqlTree(), 'count', callback);
};

// field (chaining)
// connection, field, callback
// field, callback
Query.prototype.min = function() {
  var self = this;
  if (arguments.length === 1) {
    var fieldName = arguments[0];
    return function(connection, callback) {
      self.min(connection, fieldName, callback);
    };
  }

  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'min';
  this._sqlTree().columns = [ this._sqlTree().getColumnByPropertyName(field) ];
  connection.single(this._sqlTree(), 'min', callback);
  return null;
};

// field (chaining)
// connection, field, callback
// field, callback
Query.prototype.max = function() {
  var self = this;
  if (arguments.length === 1) {
    var fieldName = arguments[0];
    return function(connection, callback) {
      self.max(connection, fieldName, callback);
    };
  }

  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'max';
  this._sqlTree().columns = [ this._sqlTree().getColumnByPropertyName(field) ];
  connection.single(this._sqlTree(), 'max', callback);
  return null;
};

// field (chaining)
// connection, field, callback
// field, callback
Query.prototype.sum = function() {
  var self = this;
  if (arguments.length === 1) {
    var fieldName = arguments[0];
    return function(connection, callback) {
      self.sum(connection, fieldName, callback);
    };
  }

  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var field = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'sum';
  this._sqlTree().columns = [ this._sqlTree().getColumnByPropertyName(field) ];
  connection.single(this._sqlTree(), 'sum', function(err, sum) {
    if (err) {
      return callback(err);
    }
    if (sum === null) {
      sum = 0;
    }
    return callback(null, sum);
  });
  return null;
};

Query.prototype.all = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  connection.all(this._sqlTree(), callback);
};

Query.prototype.first = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  // TODO: HACK: If we have includes, limit will cause the joined rows not to be included
  // so we need to not limit and just get all rows and only use the first one.
  if (this._sqlTree().includes.length === 0) {
    this.limit(1);
  }
  this.all(connection, function(err, rows) {
    if (err) {
      callback(err);
      return;
    }
    if (rows.length === 0) {
      callback(null, null);
    } else {
      callback(null, rows[0]);
    }
  });
};

Query.prototype.last = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this.all(connection, function(err, rows) {
    if (err) {
      callback(err);
      return;
    }
    if (rows.length === 0) {
      callback(null, null);
    } else {
      callback(null, rows[rows.length - 1]);
    }
  });
};


Query.prototype.getById = function() {
  var args = persistUtil.toArray(arguments);
  var connection = this._getConnection();
  if (args[0] instanceof Connection) {
    connection = args[0];
    args = args.slice(1);
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var id = args[0];
  var callback = args[args.length - 1];

  this.where(this.model.getIdPropertyName() + " = ?", id).first(connection, function(err, row) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, row);
  });
};

Query.prototype.deleteAll = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'delete';
  this._sqlTree().columns = [];
  this.all(connection, callback);
};

Query.prototype.updateAll = function() {
  var connection = this._getConnection();
  if (arguments[0] instanceof Connection) {
    connection = arguments[0];
  }
  if (!connection) {
    throw new Error("connection is null or undefined");
  }
  var updateHash = arguments[arguments.length - 2];
  var callback = arguments[arguments.length - 1];

  this._sqlTree().action = 'update';
  this._sqlTree().updateHash = updateHash;
  this.all(connection, callback);
};

module.exports = Query;
