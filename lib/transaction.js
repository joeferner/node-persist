'use strict';

var Transaction = function (connection) {
  this.connection = connection;
};

Transaction.prototype.commit = function (callback) {
  this.connection.commitTransaction(callback);
};

Transaction.prototype.rollback = function (callback) {
  this.connection.rollbackTransaction(callback);
};

module.exports = Transaction;
