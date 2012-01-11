
var models = require("../models");
var persist = require("persist");
require("persist/extensions/jqgrid");

/*
 * GET all blogs as json.
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
              blog.created.toISOString(),
              blog.lastUpdated.toISOString(),
              "<a href='/blogs/" + blog.id + "'>Edit</a>"
            ]
          };
        })
      };

      res.end(JSON.stringify(json, null, '\t'));
    });
  });
};

exports.blog = function(req, res, next){
  var id = req.params.id;
  if(!id) { throw new Error("'id' is required."); }

  persist.connect(function(err, conn) {
    if(err) { next(err); return; }

    var queries = {
      categories: models.Category.all
    };

    if(id != 'new') {
      queries.blog = models.Blog.getById(id);
    }

    conn.chain(queries, function(err, results) {
      if(err) { next(err); return; }

      var blog;
      if(id == 'new') {
        blog = {
          title: "",
          body: ""
        };
      } else {
        blog = results.blog;
      }

      res.render('blog/index', {
        title: 'Blog',
        blog: blog,
        categories: results.categories
      });
    });
  });
};

exports.blogSave = function(req, res, next){
  var id = req.params.id;
  if(!id) { throw new Error("'id' is required."); }

  persist.connect(function(err, conn) {
    if(err) { next(err); return; }

    if(id == 'new') {
      var blog = new models.Blog(req.body);
      blog.save(conn, function(err) {
        if(err) { next(err); return; }
        res.redirect('home');
      });
    } else {
      models.Blog.update(conn, id, req.body, function(err) {
        if(err) { next(err); return; }
        res.redirect('home');
      });
    }
  });
};
