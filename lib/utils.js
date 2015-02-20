var util = require('util');

module.exports = {
  inherits: util.inherits
}

// Extends a child class from the instance of a parent class
module.exports.extend = function(child, parent) {
  for (var key in parent) {
    if ({}.hasOwnProperty.call(parent, key)) {
      child[key] = parent[key];
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
