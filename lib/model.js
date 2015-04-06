var EventEmitter = require('events').EventEmitter;
var utils = require('./utils');
var _ = require('underscore');

var collections = {};

module.exports = function(db) {
  return function(collection, schema) {
    // Return existing class
    if (collections[collection]) {
      return collections[collection];
    }

    if (!schema) {
      throw new Error('Schema not defined for ' + collection);
    }

    var Collection = db.collection(collection);

    var Model = collections[collection] = function (attributes, options) {
      attributes = attributes || {};
      options = options || {};
      var _this = this;
      schema.getFields().forEach(function(attr) {
        if (attributes[attr] !== undefined) {
          _this[attr] = attributes[attr];
        }
      });
      if (!options.silent) {
        Model.emit('init', this, options);
      }
    }

    utils.extend(Model, Collection);

    Model._schema = schema;
    Model._modelName = collection;
    Model.prototype._model = Model;

    // Save document to the collection
    Model.prototype.save = function(callback) {
      var _this = this;
      utils.waterfall(this, Model._hooks['save'], function(err) {
        if (err) return callback.call(_this, err);
        _this.validate(function(err) {
          if (err) return callback.call(_this, err);
          _this.reset();
          Model.save(_this, function(err, result, raw) {
            callback.apply(result, arguments);
            if (err) Model.emit('error', err);
            Model.emit('save', result, raw);
          });
        });
      });
    };

    // Validate data before saving
    Model.prototype.validate = function(callback) {
      var data = utils.flatten(this.toJSON());
      var errors = false;
      schema.fields.forEach(function(field) {
        var path = schema.paths[field];
        if (data[field]) {
          if (field === '_id') {
            if (!db.ObjectId.isValid(data[field].toString())) {
              Model.emit('error', new Error('`_id` has the wrong data type'));
              errors = true;
            }
          } else if (!_['is' + path.type](data[field])) {
            Model.emit('error', new Error('`' + field + '` has the wrong data type'));
            errors = true;
          }
        } else if (path.required) {
          Model.emit('error', new Error('`' + field + '` is required'));
          errors = true;
        }
      });
      callback(errors ? new Error('Validation failed') : null);
    };

    // Remove document from collection
    Model.prototype.remove = function(callback) {
      var _this = this;
      Collection.remove({_id: db.ObjectId(this._id)}, true, function(err, result) {
        callback.call(_this, err, result && result.n === 1);
        Model.emit('remove', _this);
      });
    };

    // Return a pure JSON object with only schema fields
    Model.prototype.toJSON = function() {
      var _addAttr = function _addAttr(obj, attr, into) {
        var path = attr.split('.');
        var next = path.shift();
        if (!obj[next]) return;
        if (path.length === 0) {
          into[next] = obj[next];
        } else {
          into[next] = into[next] || {};
          _addAttr(obj[next], path.join('.'), into[next]);
        }
      }

      var obj = {};
      var _this = this;
      _.each(schema.fields, function(path) {
        _addAttr(_this, path, obj);
      });
      return obj;
    };

    // Reset document to only schema-defined attributes
    Model.prototype.reset = function() {
      var _resetAttr = function _resetAttr(obj, attr, val) {
        if (!obj) return;
        var path = attr.split('.');
        if (path.length === 1) {
          if (val !== undefined) {
            obj[path[0]] = obj[path[0]] || val;
          } else {
            delete obj[path[0]];
          }
          return;
        } else {
          var next = path.shift();
          _resetAttr(obj[next], path.join('.'), val);
        }
      }

      var _this = this;
      var paths = schema.paths;
      // Delete any fields that are not part of the schema
      _.each(utils.flatten(this), function(val, key) {
        if (!paths[key]) {
          _resetAttr(_this, key);
        }
      });
      // Set defaults for any undefined data
      _.each(paths, function(def, path) {
        if (_.has(def, 'default')) {
          _resetAttr(_this, path, def['default']);
        }
      });
    };

    // Register hooks to be called before saving a document
    Model._hooks = {save: []};
    Model.pre = function(trigger, fn) {
      Model._hooks[trigger] = Model._hooks[trigger] || []
      Model._hooks[trigger].push(fn);
    };

    // Bind EventEmitter statically to the Model class
    Model._emitter = new EventEmitter();
    _.functions(Model._emitter).forEach(function(method) {
      Model[method] = Model._emitter[method];
    });

    // Inherit all collection prototype methods as static model methods
    _.functions(Collection).forEach(function(method) {
      Model[method] = Collection[method];
    });

    // Wrap method callback with to instantiate results
    var _wrap = function _wrap(fn, args) {
      var args = Array.prototype.slice.call(args);
      if (args[0] && args[0]._id) {
        args[0]._id = db.ObjectId(args[0]._id);
      }
      // Determine if there is a callback function
      var callback = _.isFunction(_.last(args)) ? args.pop() : null;
      if (callback) {
        // Wrap callback function
        args.push(function(err, result) {
          // Convert results to documents
          if (_.isArray(result)) {
            result = _.map(result, function(doc) {
              return doc && doc._id ? new Model(doc, {silent: true}) : doc;
            });
          } else {
            result = result && result._id ? new Model(result, {silent: true}) : result;
          }
          // Defer to original callback
          callback.apply(Model, arguments);
        });
      }
      // Return to original method call
      return fn.apply(Collection, args);
    };

    // Wrap methods that return documents
    Model.find = function() { _wrap(Collection.find, arguments); };
    Model.findOne = function() { _wrap(Collection.findOne, arguments); };
    Model.findAndModify = function() { _wrap(Collection.findAndModify, arguments); };
    Model.insert = function() { _wrap(Collection.insert, arguments); };
    Model.remove = function() { _wrap(Collection.remove, arguments); };
    Model.save = function() { _wrap(Collection.save, arguments); };
    Model.update = function() { _wrap(Collection.update, arguments); };

    return Model;
  };
};
