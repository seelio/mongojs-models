var _ = require('underscore');
var mongojs = require('mongojs');
var utils = require('./utils');

var Schema = function(tree) {
  this.tree = tree || {};
  this.tree._id = mongojs.ObjectId;
  this.paths = this.getPaths();
  this.fields = this.getFields();
}

Schema.prototype.tree = {};
Schema.prototype.paths = {};
Schema.prototype.fields = [];

// Get list of all field paths
Schema.prototype.getFields = function() {
  return Object.keys(this.paths);
}

// Add field to schema and recalculate paths
Schema.prototype.addField = function(field, type) {
  this.tree[field] = type;
  this.paths = this.getPaths();
  this.fields = this.getFields();
}

// Determine all field paths recursively
Schema.prototype.getPaths = function() {
  return utils.flatten(this.tree, null, _addToPath);
}

var reserved = ['_model', '_schema', 'save', 'validate', 'remove', 'toJSON', 'reset'];
// Adds path definition into a determined object
var _addToPath = function _addToPath(path, obj, into) {
  if (_.contains(reserved, path)) {
    throw new Error('`' + path + '` may not be used as a schema pathname');
  }

  if (!obj.type) {
    obj = {type: obj};
  }

  if (_isPrimitive(obj.type)) {
    obj.type = obj.type.name;
    if (obj.type === 'Array') {
      obj.elements = obj.elements || 'Object';
    }
  } else if (_.isArray(obj.type)) {
    obj.elements = _isPrimitive(obj.type[0]) ? obj.type[0].name : 'Object';
    obj.type = 'Array';
  } else {
    obj.type = 'Object';
  }

  into[path] = obj;
}

// Determines if type is a "primitive" class
var _isPrimitive = function _isPrimitive(type) {
  return _.contains([Number, String, Array, Object, Date, mongojs.ObjectId], type);
}

module.exports = Schema;
