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

    Model.prototype._model = Model;
    Model.prototype._schema = schema;

    // Save document to the collection
    Model.prototype.save = function(callback) {
      var _this = this;
      utils.waterfall(this, Model._hooks['save'], function(err) {
        if (err) return callback.call(_this, err);
        _this.validate(function(err) {
          if (err) return callback.call(_this, err);
          Model.save(_this.toJSON(), function(err, result) {
            callback.apply(result, arguments);
            Model.emit('save', result);
          });
        });
      });
    };

    // Validate data before saving
    Model.prototype.validate = function(callback) {
      var schema = this._schema;
      var data = utils.flatten(this.toJSON());
      var errors = false;
      schema.fields.forEach(function(field) {
        var path = schema.paths[field];
        if (data[field]) {
          if (field === '_id') {
            if (!db.ObjectId.isValid(data[field])) {
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
      Collection.remove({_id: this._id}, true, function(err, result) {
        callback.call(_this, err, result && result.n === 1);
        Model.emit('remove', _this);
      });
    };

    // Return a pure JSON object with only schema fields
    Model.prototype.toJSON = function() {
      var obj = _.pick(this, this._schema.fields);
      if (obj._id) obj._id = obj._id.toString();
      return obj;
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
    Model.save = function() { _wrap(Collection.save, arguments); };
    Model.update = function() { _wrap(Collection.update, arguments); };

    return Model;
  };
};
