
var persist = require("persist");
var type = persist.type;

module.exports = persist.define("Category", {
  "name": { type: type.STRING }
});
