
var models = require("../models");
var persist = require("persist");
require("persist/extensions/jqgrid");

/*
 * GET home page.
 */
exports.blogs = function(req, res, next){
  persist.connect(function(err, conn) {
    if(err) { next(err); return; }

    conn.chain({
      blogs: models.Blog.include(["category"]).jqgrid(req.query).all,
      count: models.Blog.include(["category"]).jqgridCount(req.query).count
    }, function(err, results) {
      if(err) { next(err); return; }

      var json = {
        total: Math.ceil(results.count / req.query.rows),
        page: req.query.page,
        records: results.count,
        rows: results.blogs.map(function(blog) {
          return {
            id: blog.id,
            cell: [
              blog.id,
              blog.title,
              blog.category.name,
              blog.created,
              blog.lastUpdated
            ]
          };
        })
      };

      res.end(JSON.stringify(json, null, '\t'));
    });
  });
};
