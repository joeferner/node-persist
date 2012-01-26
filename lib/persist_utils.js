'use strict';

exports.bind = function (name, func, scope) {
  var _function = func;

  var results = function () {
    return _function.apply(scope, arguments);
  };
  results._name = name;
  return results;
};

exports.shallowCopy = function (obj) {
  var result = {};
  var i;
  for (i in obj) {
    result[i] = obj[i];
  }
  return result;
};

exports.toArray = function (hash) {
  var results = [];
  var key;
  for (key in hash) {
    results.push(hash[key]);
  }
  return results;
};

// this group by preserves the order in which the items are found.
// it will return an array of arrays containing the items
exports.groupBy = function (items, key) {
  var results = [];
  var hash = {};
  var i;
  for (i = 0; i < items.length; i++) {
    var item = items[i];
    var val = item[key];
    if (hash[val]) {
      hash[val].push(item);
    } else {
      results.push(hash[val] = [ item ]);
    }
  }
  return results;
};

exports.alterHashKeys = function (hash, transformFn) {
  var key;
  for (key in hash) {
    var newKey = transformFn(key, hash[key]);
    if (newKey !== key) {
      if (newKey) {
        hash[newKey] = hash[key];
      }
      delete hash[key];
    }
  }
};
