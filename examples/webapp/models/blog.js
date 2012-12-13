
var persist = require("persist");
var Category = require("./category");
var Keyword = require("./keyword");
var type = persist.type;

module.exports = Blog = persist.define("Blog", {
  "created": { type: type.DATETIME, defaultValue: function() { return new Date() } },
  "lastUpdated": { type: type.DATETIME },
  "title": { type: type.STRING },
  "body": { type: type.STRING }
})
  .hasOne(Category)
  .hasMany(Keyword, { through: "blogs_keywords" });

Blog.onSave = function(obj, connection, callback) {
  obj.lastUpdated = new Date();
  callback();
}
