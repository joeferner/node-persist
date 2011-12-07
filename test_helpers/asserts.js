

exports.isFunction = function(val, msg) {
  if(!val || typeof(val) != "function") {
    throw new Error(msg || "not a function");
  }
}

exports.isNotUndefined = function(val, msg) {
  if(typeof(val) == "undefined") {
    throw new Error(msg || "object is undefined");
  }
}