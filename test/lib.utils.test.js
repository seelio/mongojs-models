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

  describe('.augment()', function() {
    it('should augment an object with methods and properties of another object', function() {
      function Foo() { this._id = 'foo'; this._count = 0; }
      Foo._static = function() { return 'foo'; }
      Foo.prototype._proto = function(val) { this._val = val; this._count++; return 'foo'; }
      Bar.prototype._old = function() { return 'foo'; }
      Foo.prototype._arr = ['foo', 'bar'];
      Foo.prototype._obj = {foo: 1, bar: 2};
      function Bar() { this._id = 'bar'; }
      Bar._static = function() { return 'bar'; }
      Bar.prototype._proto = function(val) { this._count++; return 'bar'; }
      Bar.prototype._new = function() { return 'bar'; }
      Bar.prototype._arr = ['bar', 'baz'];
      Bar.prototype._obj = {bar: 3, baz: 4};
      utils.augment(Foo, Bar);
      expect(Foo).to.contain.keys(['_static']);
      expect(Foo._static()).to.equal('bar');
      expect(Foo.prototype).to.contain.keys(['_proto', '_arr']);
      var foo = new Foo();
      expect(foo._proto(1)).to.equal('bar');
      expect(foo._val).to.equal(1);
      expect(foo._count).to.equal(2);
      expect(foo._old()).to.equal('foo');
      expect(foo._new()).to.equal('bar');
      expect(foo._arr).to.deep.equal(['foo', 'bar', 'baz']);
      expect(foo._obj).to.deep.equal({foo: 1, bar: 3, baz: 4});
    });
  });

  describe('.waterfall()', function() {
    it('should run functions in order on the same object', function(done) {
      var doc = {};
      var tasks = [
        function(next) { doc.one = 1; next(); },
        function(next) { doc.two = 2; next(); },
        function(next) { doc.three = 3; next(); }
      ];
      utils.waterfall(doc, tasks, function(err, modifiedDoc) {
        if (err) return done(err);
        expect(modifiedDoc).to.be.ok;
        expect(modifiedDoc).to.equal(doc);
        expect(modifiedDoc).to.equal(this);
        expect(modifiedDoc).to.contain.keys(['one', 'two', 'three']);
        expect(modifiedDoc.one).to.equal(1);
        expect(modifiedDoc.two).to.equal(2);
        expect(modifiedDoc.three).to.equal(3);
        done();
      });
    });
  });

  describe('.flatten()', function() {
    var nested = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
          f: {
            g: 4
          }
        }
      }
    };
    var flat = utils.flatten(nested);
    expect(flat).to.be.ok;
    expect(flat).to.deep.equal({'a': 1, 'b.c': 2, 'b.d.e': 3, 'b.d.f.g': 4});
  });
});
