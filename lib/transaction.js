
var Transaction = function(connection) {
  this.connection = connection;
}

Transaction.prototype.commit = function(callback) {
  callback(); // todo: write me
}

Transaction.prototype.rollback = function(callback) {
  callback(); // todo: write me
}

module.exports = Transaction;
