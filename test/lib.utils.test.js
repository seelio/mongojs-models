var expect = require('chai').expect;
var utils = require('../lib/utils.js');

describe('lib/utils.js', function() {
  it('should load all necessary objects', function() {
    expect(utils).to.contain.keys(['extend']);
    expect(utils.extend).to.be.a.function;
  });

  describe('.extend()', function() {
    it('should extend a child class from the instance of a parent class', function() {
      function Parent(foo) { this.foo = foo };
      function Child() {};
      utils.extend(Child, new Parent('bar'));
      expect(Child).to.contain.keys(['foo']);
      expect(Child.foo).to.equal('bar');
    });
  });
});
