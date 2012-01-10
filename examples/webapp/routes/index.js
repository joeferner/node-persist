
/*
 * GET home page.
 */
exports.index = function(req, res, next){
  res.render('index', { title: 'Home' });
};
