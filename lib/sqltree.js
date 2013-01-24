'use strict';

var persistUtil = require('./persist_utils');
var type = require('./type');
var Class = require('./class');

var SqlTree = Class.extend({
  init: function (model) {
    this.action = "select";
    this.model = model;
    this.tableName = model.tableName || model;
    this.tableAlias = null;
    this.columns = [];
    this.primaryKeyColumn = null;
    this.orderBy = [];
    this.where = [];
    this.joins = [];
    this.includes = [];
    this.columnIndex = 0;
  },

  _getNextColumnAlias: function () {
    return 'c' + (this.columnIndex++);
  },

  findColumnByModelNameAndColumnName: function (modelName, columnName) {
    var i;
    for (i = 0; i < this.columns.length; i++) {
      var column = this.columns[i];
      if ((column.model.modelName === modelName || column.model.tableName === modelName)
        && (column.propertyName === columnName || column.dbColumnName === columnName)) {
        return column;
      }
    }
    return null;
  },

  addColumn: function (model, propertyName, tableAlias) {
    var colDef = {
      model: model,
      propertyName: propertyName,
      tableAlias: tableAlias,
      dbColumnName: model.columns[propertyName].dbColumnName,
      modelColumn: model.columns[propertyName],
      alias: this._getNextColumnAlias()
    };
    this.columns.push(colDef);
    return colDef;
  },

  getColumnByPropertyName: function (propertyName) {
    var i;
    for (i = 0; i < this.columns.length; i++) {
      if (this.columns[i].propertyName === propertyName) {
        return this.columns[i];
      }
    }
    return null;
  },

  getColumnByAlias: function (alias) {
    var i;
    for (i = 0; i < this.columns.length; i++) {
      if (this.columns[i].alias.toLowerCase() === alias.toLowerCase()) {
        return this.columns[i];
      }
    }
    return null;
  },

  populateInclude: function (result, item, include) {
    var i;
    var includeItems = [];
    if (!include.primaryKeyColumn) {
      throw new Error('Include "' + include.propertyName + '" does not have a single primary key defined.');
    }
    var groups = persistUtil.groupBy(item, include.primaryKeyColumn.alias);
    for (i = 0; i < groups.length; i++) {
      var includeItem = groups[i][0];
      var includeItemInstance = new include.association.model();
      includeItemInstance = this.toObject(includeItem, includeItemInstance);

      // there could be no children, in this case the child columns will all be null
      if (includeItemInstance.getId() !== null) {
        includeItems.push(includeItemInstance);
      }
    }
    delete result[include.propertyName];
    if (include.association.type === 'hasOne') {
      result[include.propertyName] = includeItems[0];
    } else {
      result[include.propertyName] = includeItems;
    }
  },

  populateIncludes: function (result, item) {
    var i;
    for (i = 0; i < this.includes.length; i++) {
      var include = this.includes[i];
      this.populateInclude(result, item, include);
    }
  },

  toObjects: function (rows) {
    var i;
    var results = [];

    if (this.primaryKeyColumn) {
      // group the results by the primary key. this handles the case where we might have done a left join and
      // we need to only return one record per grouping
      var items = persistUtil.groupBy(rows, this.primaryKeyColumn.alias);
      var trueFunc = function () { return true; };
      for (i = 0; i < items.length; i++) {
        var item = items[i];
        var result = new this.primaryKeyColumn.model();
        result._isPersisted = trueFunc;
        result = this.toObject(item[0], result);
        results.push(result);

        this.populateIncludes(result, item);
      }
      return results;
    }

    for (i = 0; i < rows.length; i++) {
      results.push(this.toObject(rows[i]));
    }
    return results;
  },

  toObject: function (row, result) {
    var key;
    var trueFunc = function () { return true; };
    for (key in row) {
      if (key == 'parse' || key == '_typeCast') {
        continue;
      }
      var column = this.getColumnByAlias(key);
      if (!column) {
        throw new Error('Could not find column from alias "' + key + '"');
      }
      if (!result) {
        result = new column.model();
        result._isPersisted = trueFunc;
      }
      if (column.model !== result._getModel()) {
        continue;
      }
      var val = row[key];
      if (column.modelColumn.type === type.DATETIME && val && typeof (val) === 'number') {
        val = new Date(val);
      }
      if (column.modelColumn.type === type.JSON && val) {
        try {
          val = JSON.parse(val);
        } catch (e) {
          // could not parse json so we will leave it as a string
        }
      }
      if (column.modelColumn.type === type.BOOLEAN && (val !== null)) {
        val = !!val;
      }
      result[column.propertyName] = val;
    }
    if (result._getModel().onLoad) {
      result._getModel().onLoad(result);
    }
    return result;
  }
});

module.exports = SqlTree;
