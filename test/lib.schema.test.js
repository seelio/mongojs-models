var expect = require('chai').expect;
var Schema = require('../lib/schema.js');
var mongojs = require('mongojs');

var schema;
describe('Schema', function() {
  before(function() {
    schema = new Schema({
      foo: String,
      bar: Number
    });
  });

  it('should load all fields into its instance', function() {
    expect(schema).to.have.keys(['tree', 'paths', 'fields']);
    var tree = schema.tree;
    expect(tree).to.have.keys(['foo', 'bar', '_id']);
    expect(tree.foo).to.equal(String);
    expect(tree.bar).to.equal(Number);
    expect(tree._id).to.equal(mongojs.ObjectId);
  });

  describe('#getFields()', function() {
    it('should return a list of all defined fields', function() {
      var fields = schema.getFields();
      expect(fields).to.be.an.instanceof(Array);
      expect(fields).to.include.members(['foo', 'bar', '_id']);
    });
  });

  describe('#getPaths()', function() {
    it('should flatten a complex schema', function() {
      var nested = new Schema({
        one: String,
        two: {
          a: {
            type: Number
          },
          b: Number
        },
        three: [String],
        four: Date,
        five: {
          type: mongojs.ObjectId,
          ref: 'Model'
        },
        six: Array
      });
      expect(nested.paths).to.be.ok;
      expect(nested.paths).to.contain.keys(['_id', 'one', 'two.a', 'two.b', 'three', 'four', 'five', 'six']);
      expect(nested.paths['_id']).to.deep.equal({type: 'ObjectID'});
      expect(nested.paths['one']).to.deep.equal({type: 'String'});
      expect(nested.paths['two.a']).to.deep.equal({type: 'Number'});
      expect(nested.paths['two.b']).to.deep.equal({type: 'Number'});
      expect(nested.paths['three']).to.deep.equal({type: 'Array', elements: 'String'});
      expect(nested.paths['four']).to.deep.equal({type: 'Date'});
      expect(nested.paths['five']).to.deep.equal({type: 'ObjectID', ref: 'Model'});
      expect(nested.paths['six']).to.deep.equal({type: 'Array', elements: 'Object'});
    });
  });

  describe('#addField()', function() {
    it('should add fields to an existing schema', function() {
      schema.addField('baz', Boolean);
      expect(schema.getFields()).to.include.members(['foo', 'bar', '_id', 'baz']);
    });
  });
});
