var mongojs = require('mongojs')

var Schema = function(fields) {
  if (!fields) {
    fields = {};
  }
  var self = this;
  // Store all defined fields in object instance
  Object.keys(fields).forEach(function(key) {
    self[key] = fields[key];
  });
  // Always include the _id field
  this._id = mongojs.ObjectId
}

Schema.prototype.getFields = function() {
  return Object.keys(this);
}

module.exports = Schema;
