
var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  async.series([
    db.createTable.bind(db, 'blogs', {
      id: { type: 'int', primaryKey: true },
      created: { type: 'datetime', notNull: true },
      last_updated: { type: 'datetime', notNull: true },
      category_id: { type: 'int', notNull: true },
      title: { type: 'string' },
      body: { type: 'text' }
    }),

    db.createTable.bind(db, 'categories', {
      id: { type: 'int', primaryKey: true },
      name: { type: 'string' }
    }),

    db.createTable.bind(db, 'keywords', {
      id: { type: 'int', primaryKey: true },
      name: { type: 'string' }
    }),

    db.createTable.bind(db, 'blogs_keywords', {
      blog_id: { type: 'int', primaryKey: true },
      keyword_id: { type: 'int', primaryKey: true }
    })
  ], callback);
};

exports.down = function(db, callback) {
  async.series([
    db.dropTable.bind(db, 'events_handles'),
    db.dropTable.bind(db, 'htmlrequests')
  ], callback);
};
