
var persistUtil = require('./persist_utils');
var type = require('./type');

module.exports = SqlTree = persistUtil.Class.extend({
  init: function(model) {
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

  _getNextColumnAlias: function() {
    return 'c' + (this.columnIndex++);
  },

  addColumn: function(model, propertyName, tableAlias) {
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

  getColumnByPropertyName: function(propertyName) {
    for(var i=0; i<this.columns.length; i++) {
      if(this.columns[i].propertyName == propertyName) {
        return this.columns[i];
      }
    }
    return null;
  },

  getColumnByAlias: function(alias) {
    for(var i=0; i<this.columns.length; i++) {
      if(this.columns[i].alias == alias) {
        return this.columns[i];
      }
    }
    return null;
  },

  populateInclude: function(result, item, include) {
    var includeItems = [];
    var groups = persistUtil.groupBy(item, include.primaryKeyColumn.alias);
    for(var i=0; i<groups.length; i++) {
      var includeItem = groups[i][0];
      var includeItemInstance = new include.association.model()
      includeItemInstance = this.toObject(includeItem, includeItemInstance);
      includeItems.push(includeItemInstance);
    }
    delete result[include.propertyName];
    if(include.association.type == 'hasOne') {
      result[include.propertyName] = includeItems[0];
    } else {
      result[include.propertyName] = includeItems;
    }
  },

  populateIncludes: function(result, item) {
    for(var i=0; i<this.includes.length; i++) {
      var include = this.includes[i];
      this.populateInclude(result, item, include)
    }
  },

  toObjects: function(rows) {
    if(this.primaryKeyColumn) {
      // group the results by the primary key. this handles the case where we might have done a left join and
      // we need to only return one record per grouping
      var items = persistUtil.groupBy(rows, this.primaryKeyColumn.alias);
      var results = [];
      for(var i=0; i<items.length; i++) {
        var item = items[i];
        var result = new this.primaryKeyColumn.model();
        result = this.toObject(item[0], result);
        results.push(result);

        this.populateIncludes(result, item);
      }

      return results;
    }

    var results = [];
    for(var i=0; i<rows.length; i++) {
      results.push(this.toObject(rows[i]));
    }
    return results;
  },

  toObject: function(row, result) {
    for(var key in row) {
      var column = this.getColumnByAlias(key);
      if(!result) {
        result = new column.model();
      }
      if(column.model !== result._model()) {
        continue;
      }
      var val = row[key];
      if(column.modelColumn.type == type.JSON && val) {
        try {
          val = JSON.parse(val);
        } catch(e) {
          // could not parse json so we will leave it as a string
        }
      }
      result[column.propertyName] = val;
    }
    return result;
  }
});
