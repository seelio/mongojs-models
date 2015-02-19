var utils = require('./utils');
var _ = require('underscore');

module.exports = function(Collection, schema) {
  var Model = (function(Collection) {
    utils.extend(Model, Collection);

    function Model(options) {
      if (!options) {
        options = {};
      }
      var self = this;
      schema.getFields().forEach(function(attr) {
        self[attr] = options[attr];
      });
    }

    // Expose document prototype methods
    Model.prototype.save = function(callback) {
      Collection.save(this, callback);
    };

    Model.prototype.remove = function(callback) {
      Collection.remove({_id: this._id}, true, function(err, result) {
        callback(err, result && result.n === 1);
      });
    };

    // Inherit all collection prototype methods as static model methods
    _.functions(Collection).forEach(function(method) {
      Model[method] = Collection[method];
    });

    // Wrap methods that return documents
    ['find', 'findOne', 'insert', 'save', 'update'].forEach(function(method) {
      Model[method] = function() { return _apply(method, arguments); };
    });

    // Special cases
    Model.findAndModify = function() { return _apply('findAndModify', arguments, 'value'); };

    return Model;

  })(Collection);

  // Delegate function call to Collection instance
  var _apply = function(method, args, key) {
    var args = Array.prototype.slice.call(args);
    _wrapCallback(args, key);
    // Return control to original method
    Collection[method].apply(Collection, args);
  };

  // Wrap callback to return Model instances
  var _wrapCallback = function(args, key) {
    var self = this;
    if (_.isFunction(_.last(args))) {
      callback = args.pop();
      args.push(function(err, result) {
        if (key) {
          result[key] = _mapResults(result[key]);
        } else {
          result = _mapResults(result);
        }
        callback.apply(self, arguments);
      });
    }
  };

  // Convert result to Model instances
  var _mapResults = function(result) {
    if (!result) {
      return;
    }
    if (_.isArray(result)) {
      result = _.map(result, function(doc) {
        return new Model(doc);
      });
    } else {
      result = new Model(result);
    }
    return result;
  };

  return Model;
};
