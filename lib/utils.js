var util = require('util');
var _ = require('underscore');

module.exports = {};

// Extends a child class from the instance of a parent class
module.exports.extend = function(child, parent) {
  for (var key in parent) {
    if ({}.hasOwnProperty.call(parent, key)) {
      child[key] = parent[key]
    }
  }
  function ctor() {
    this.constructor = child;
  }
  if (parent) {
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
  }
  return child;
};

// Augment an object with methods and properties from another object
module.exports.augment = function(obj, props) {
  _augment(obj.prototype, props.prototype);
  _augment(obj, props);
  function _augment(obj, props) {
    for (var key in props) {
      if (typeof props[key] === 'function') {
        // Wrap methods
        obj[key] = _.wrap(obj[key] || function() {}, _wrapper(props[key]));
      } else if (_.isArray(props[key])) {
        // Concatenate array elements
        obj[key] = _.isArray(obj[key]) ? _.union(obj[key], props[key]) : props[key];
      } else if (typeof props[key] === 'object') {
        // Extend object properties
        obj[key] = _.extend({}, obj[key], props[key]);
      } else {
        obj[key] = props[key];
      }
    }
  }
  function _wrapper(fn) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      // Get and call original method
      var _super = args.shift();
      _super.apply(this, args);
      // Call augmented method
      return fn.apply(this, args);
    }
  }
};

// Run asynchronous functions in order, binding every call to a document
module.exports.waterfall = function(doc, tasks, done) {
  tasks = tasks || [];
  done = done || function () {};
  if (!tasks.length) return done(null, doc);

  var wrapIterator = function (iterator) {
    return function (err) {
      if (err) {
        done.call(doc, err);
      } else {
        var callback = done;
        var next = iterator.next();
        if (next) callback = wrapIterator(next);
        process.nextTick(function () {
          iterator.call(doc, callback);
        });
      }
    };
  };

  var makeIterator = function (tasks) {
    var makeCallback = function (index) {
      var fn = function (next) {
        if (tasks.length) tasks[index].call(doc, function(err) {
          next.call(doc, err, doc);
        });
        return fn.next();
      };
      fn.next = function () {
        return (index < tasks.length - 1) ? makeCallback(index + 1): null;
      };
      return fn;
    };
    return makeCallback(0);
  };

  wrapIterator(makeIterator(tasks))();
};

// Flatten object recursively
var flatten = module.exports.flatten = function(obj, prefix, addFn) {
  obj = obj || {}
  prefix = prefix || '';
  addFn = addFn || function(k, v, o) { return o[k] = v; };

  var result = {};
  var keys = Object.keys(obj);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if (_.isObject(obj[key]) && (!obj[key].constructor || 'Object' == obj[key].constructor.name) && (!obj[key].type || obj[key].type.type)) {
      if (Object.keys(obj[key]).length) {
        var attrs = flatten(obj[key], prefix + key + '.', addFn);
        var attrKeys = Object.keys(attrs);
        for (var j = 0; j < attrKeys.length; ++j) {
          var attrKey = attrKeys[j];
          result[attrKey] = attrs[attrKey];
        }
      } else {
        addFn(prefix + key, obj[key], result);
      }
    } else {
      addFn(prefix + key, obj[key], result);
    }
  }
  return result;
};
