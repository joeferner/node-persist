
var persist = require("persist");
var type = persist.type;

module.exports = persist.define("Keyword", {
  "name": { type: type.STRING }
});
