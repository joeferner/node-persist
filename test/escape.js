"use strict";

var assert = require("assert");
var nodeunit = require("nodeunit");
var persist = require("../lib/persist");
var testUtils = require("../test_helpers/test_utils");

exports['Escape'] = nodeunit.testCase({
  "reserved field name": function(test) {
    var TaxonomicClass = persist.define("TaxonomicClass", {
      order: persist.type.STRING
    });

    testUtils.connect(persist, {}, function(err, connection) {
      test.ifError(err);

      connection.runSql('CREATE TABLE TaxonomicClasses("order" INT NOT NULL);', function(err) {
        test.ifError(err);

        var t = new TaxonomicClass({ order: "Lepidoptera" });
        t.save(connection, test.ifError);

        test.done();
      });
    });
  }
});
