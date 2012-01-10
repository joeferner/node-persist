
var express = require('express')
var home = require('./routes/index')
var blog = require('./routes/blog')

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', home.index);
app.get('/blogs', blog.blogs);
app.get('/blogs/:id', blog.blog);
app.post('/blogs/:id', blog.blogSave);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
