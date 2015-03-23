var mongojs = require('mongojs');
var Model = require('./lib/model');
var Schema = require('./lib/schema');
var utils = require('./lib/utils');

module.exports = function(config, collections) {
  var connect = mongojs(config, collections);
  connect.Model = Model(connect);
  connect.Model.augment = utils.augment;
  connect.Schema = Schema;
  return connect;
}
