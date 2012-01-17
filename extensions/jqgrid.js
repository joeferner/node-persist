
var persist = require('../lib/persist');

persist.Query.prototype._jqgridGetSearchValues = function(field, op, val) {
  var ruleStr = field + " ";
  if(op == "in" || op == "ni") {
    var vals = val.split(',').map(function(v) { return v.replace(/^\s+|\s+$/g,""); });
    if(op == "ni") {
      ruleStr += "NOT ";
    }
    ruleStr += "IN (" + vals.map(function(v) { return '?'; }) + ")";
    return {
      ruleStr: ruleStr,
      vals: vals
    };
  }

  var data;
  switch(op) {
    case "eq":
      ruleStr += "=";
      data = val;
      break;
    case "ne":
      ruleStr += "!=";
      data = val;
      break;
    case "lt":
      ruleStr += "<";
      data = val;
      break;
    case "le":
      ruleStr += "<=";
      data = val;
      break;
    case "gt":
      ruleStr += ">";
      data = val;
      break;
    case "ge":
      ruleStr += ">=";
      data = val;
      break;
    case "bw":
      ruleStr += "LIKE";
      data = val + "%";
      break;
    case "bn":
      ruleStr += "NOT LIKE";
      data = val + "%";
      break;
    case "ew":
      ruleStr += "LIKE";
      data = "%" + val;
      break;
    case "en":
      ruleStr += "NOT LIKE";
      data = "%" + val;
      break;
    case "cn":
      ruleStr += "LIKE";
      data = "%" + val + "%";
      break;
    case "nc":
      ruleStr += "NOT LIKE";
      data = "%" + val + "%";
      break;
    case "nu":
      ruleStr += "IS NULL";
      data = null;
      break;
    case "nn":
      ruleStr += "IS NOT NULL";
      data = null;
      break;
    default:
      throw new Error("Unhandled operator '" + op + "'");
  }
  var results = {
    vals: [],
    ruleStr: ruleStr
  };
  if(data) {
    results.ruleStr += " ?";
    results.vals.push(data);
  }
  return results;
}

persist.Query.prototype._jqgrid = function(reqQuery) {
  var self = this;
  var rulesArray = [];
  var valuesArray = [];
  var groupOp = 'AND';
  //console.log(reqQuery);

  // process toolbar searches
  for(var paramName in reqQuery) {
    if(paramName == '_search'
       || paramName == 'nd'
       || paramName == 'rows'
       || paramName == 'page'
       || paramName == 'sidx'
       || paramName == 'sord'
       || paramName == 'filters'
       || paramName == 'searchField'
       || paramName == 'searchString'
       || paramName == 'searchOper') {
      continue;
    }

    var val = reqQuery[paramName];
    var searchValues = this._jqgridGetSearchValues(paramName, 'cn', val);
    rulesArray.push(searchValues.ruleStr);
    valuesArray = valuesArray.concat(searchValues.vals);
  }

  // process single search
  if(reqQuery['searchField'] && reqQuery['searchString'] && reqQuery['searchOper']) {
    var searchValues = this._jqgridGetSearchValues(reqQuery['searchField'], reqQuery['searchOper'], reqQuery['searchString']);
    rulesArray.push(searchValues.ruleStr);
    valuesArray = valuesArray.concat(searchValues.vals);
  }

  // process filters
  if(reqQuery['filters']) {
    var filters = JSON.parse(reqQuery['filters']);
    //console.log(filters);
    if(filters.rules && filters.groupOp) {
      groupOp = filters.groupOp;
      for(var i=0; i<filters.rules.length; i++) {
        var rule = filters.rules[i];
        var searchValues = this._jqgridGetSearchValues(rule.field, rule.op, rule.data);
        rulesArray.push(searchValues.ruleStr);
        valuesArray = valuesArray.concat(searchValues.vals);
      }
    }
  }

  if(rulesArray.length > 0) {
    var where = rulesArray.join(" " + groupOp + " ");
    //console.log(where, valuesArray);
    self = self.where(where, valuesArray);
  }

  return self;
}

persist.Query.prototype.jqgridCount = function(reqQuery) {
  var self = this._jqgrid(reqQuery);
  return self;
}

persist.Query.prototype.jqgrid = function(reqQuery) {
  var self = this._jqgrid(reqQuery);
  //console.log(reqQuery);
  if(reqQuery.sidx) {
    var dir = reqQuery.sord == 'desc' ? persist.Descending : persist.Ascending;
    self = self.orderBy(reqQuery.sidx, dir);
  }

  self = self.limit(reqQuery.rows, (reqQuery.page - 1) * reqQuery.rows);

  return self;
}
