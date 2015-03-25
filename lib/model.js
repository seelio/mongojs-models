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

    var Model = collections[collection] = function (attributes) {
      attributes = attributes || {};
      var _this = this;
      schema.getFields().forEach(function(attr) {
        if (attributes[attr] !== undefined) {
          _this[attr] = attributes[attr];
        }
      });
      Model.emit('init', this);
    }

    utils.extend(Model, Collection);

    // Save document to the collection
    Model.prototype.save = function(callback) {
      var _this = this;
      utils.waterfall(this, Model._hooks['save'], function(err) {
        if (err) return callback.call(_this, err);
        _this.reset();
        Collection.save(_this, function(err, result) {
          Model.emit('save', result);
          callback.apply(_this, arguments);
        });
      });
    };

    // Register hooks to be called before saving a document
    Model._hooks = {save: []};
    Model.pre = function(trigger, fn) {
      Model._hooks[trigger] = Model._hooks[trigger] || []
      Model._hooks[trigger].push(fn);
    };

    // Remove document from collection
    Model.prototype.remove = function(callback) {
      this.reset();
      var _this = this;
      Collection.remove(this, true, function(err, result) {
        Model.emit('remove', _this);
        callback(err, result && result.n === 1);
      });
    };

    Model.prototype._model = Model;
    Model.prototype._schema = schema;
    Model.prototype._fields = schema.getFields();

    // Remove attributes that are not part of the schema
    Model.prototype.reset = function() {
      var _this = this;
      _.keys(this).forEach(function(field) {
        if (_this._fields.indexOf(field) === -1) {
          delete _this[field];
        }
      });
    };

    // Return a pure JSON object with only schema fields
    Model.prototype.toJSON = function() {
      var obj = _.pick(this, this._fields);
      if (obj._id) obj._id = obj._id.toString();
      return obj;
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
              return doc && doc._id ? new Model(doc) : doc;
            });
          } else {
            result = result && result._id ? new Model(result) : result;
          }
          // Defer to original callback
          callback.apply(Collection, arguments);
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
