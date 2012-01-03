
var persist = require("../lib/persist");
var type = persist.type;
var nodeunit = require("nodeunit");
var util = require("util");
var testUtils = require("../test_helpers/test_utils");

exports['Select'] = nodeunit.testCase({
  "use database.json to connect": function(test) {
    persist.connect(function(err, connection) {
      connection.runSql(testUtils.doNothingSql, function(err) {
        if(err) { console.log(err); return; }
        test.done();
      });
    });
  }

});
