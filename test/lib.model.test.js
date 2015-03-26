var expect = require('chai').expect;
var db = require('mongojs')('mongojsom-test');
var Model = require('../lib/model.js')(db);
var Schema = require('../lib/schema.js');

var Test, test, _id;
describe('Model', function() {
  before(function() {
    // Create new Model class for `test.test`
    var schema = new Schema({foo: String, bar: Number});
    Test = Model('test', schema);
  });

  it('should fail without schema', function() {
    expect(Model).to.throw(Error, /Schema not defined/);
  });

  it('should return same model class', function() {
    expect(Model('test')).to.equal(Test);
  });

  it('should contain static collection methods', function() {
    expect(Test).to.contain.keys(['_name', 'find', 'findOne', 'save', 'remove']);
    expect(Test._name).to.equal('mongojsom-test.test');
    expect(Test.find).to.be.a.function;
  });

  describe('static methods', function() {
    it('should save a new document to the collection', function(done) {
      Test.save({foo: 'foo', bar: 1}, function(err, doc) {
        if (err) return done(err);
        expect(doc).to.be.an.instanceof(Test);
        expect(doc).to.contain.keys(['foo', 'bar', '_id']);
        expect(doc.foo).to.equal('foo');
        expect(doc.bar).to.equal(1);
        expect(doc._id).to.be.an.instanceof(db.ObjectId);
        test = doc;
        done();
      });
    });

    it('should find document from the collection', function(done) {
      Test.findOne({_id: test._id}, function(err, doc) {
        if (err) return done(err);
        expect(doc).to.be.an.instanceof(Test);
        expect(doc).to.contain.keys(['foo', 'bar', '_id']);
        expect(doc.foo).to.equal('foo');
        expect(doc.bar).to.equal(1);
        expect(doc._id).to.be.an.instanceof(db.ObjectId);
        done();
      });
    });

    it('should find and modify a document from the collection', function(done) {
      Test.findAndModify({
        query: {foo: 'foo'},
        update: {$set: {foo: 'bar'}}
      }, function(err, doc, response) {
        if (err) return done(err);
        expect(doc).to.be.ok;
        expect(doc).to.be.an.instanceof(Test);
        expect(doc).to.deep.equal(test);
        expect(response).to.be.ok;
        expect(response).to.contain.keys(['updatedExisting', 'n']);
        expect(response.updatedExisting).to.be.true;
        expect(response.n).to.equal(1);
        done();
      });
    });

    it('should try to find and upsert a new document', function(done) {
      Test.findAndModify({
        query: {foo: 'foo', bar: 2},
        update: {$inc: {bar: 1}},
        upsert: true,
        new: true
      }, function(err, doc, response) {
        if (err) return done(err);
        expect(doc).to.be.ok;
        expect(doc).to.be.an.instanceof(Test);
        expect(doc).to.contain.keys(['foo', 'bar', '_id']);
        expect(doc.bar).to.equal(3);
        expect(response).to.be.ok;
        expect(response).to.contain.keys(['updatedExisting', 'n', 'upserted']);
        expect(response.updatedExisting).to.be.false;
        expect(response.n).to.equal(1);
        expect(response.upserted).to.deep.equal(doc._id);
        done();
      });
    });

    it('should find multiple documents', function(done) {
      Test.find({foo: {$ne: null}}, function(err, docs) {
        if (err) return done(err);
        expect(docs).to.be.an.instanceof(Array);
        expect(docs[0]).to.be.an.instanceof(Test);
        done();
      });
    });

    it('should remove document from the collection', function(done) {
      Test.remove({_id: test._id}, function(err, removed) {
        if (err) return done(err);
        expect(removed).to.have.keys('n');
        expect(removed.n).to.equal(1);
        done();
      });
    });
  });

  describe('prototype methods', function() {
    before(function() {
      test = new Test({foo: 'baz', bar: 2});
    });

    it('should save document to the collection', function(done) {
      test.save(function(err, doc) {
        if (err) return done(err);
        expect(doc).to.be.ok;
        test._id = doc._id;
        expect(doc).to.deep.equal(test);
        Test.findOne({_id: test._id}, function(err, doc) {
          if (err) return done(err);
          expect(doc).to.be.ok;
          expect(doc._id).to.deep.equal(test._id);
          done();
        });
      });
    });

    it('should return a native Object version of the document', function() {
      expect(test).to.contain.keys(['foo', 'bar', '_id']);
      expect(test.save).to.be.an.instanceof(Function);
      var obj = test.toJSON();
      expect(obj).to.not.equal(test);
      expect(obj).to.contain.keys(['foo', 'bar', '_id']);
      expect(obj.save).to.not.be.an.instanceof(Function);
    });

    it('should only save fields defined in the schema', function(done) {
      var test2 = new Test(test.toJSON());
      test2.baz = 'FOOBARBAZ';
      expect(test2).to.contain.keys(['baz']);
      test2.save(function(err, doc) {
        if (err) return done(err);
        expect(doc).to.be.ok;
        expect(doc).to.contain.keys(['foo', 'bar', '_id']);
        expect(doc).to.not.contain.keys(['baz']);
        expect(doc._id.toString()).to.equal(test2._id.toString());
        done();
      });
    });

    it('should remove document from the collection', function(done) {
      test.remove(function(err, removed) {
        if (err) return done(err);
        expect(removed).to.be.true;
        Test.findOne({_id: test._id}, function(err, doc) {
          if (err) return (err);
          expect(doc).to.be.not.ok;
          done();
        });
      });
    });
  });

  describe('events', function() {
    before(function() {
      test = new Test({foo: 'foobar', bar: 3});
    });

    it('should emit events', function(done) {
      Test.on('foo', function(foo) {
        expect(foo).to.equal('bar');
        done()
      });
      Test.emit('foo', 'bar');
    });

    it('should listen to a document being saved', function(done) {
      Test.once('save', function(doc) {
        delete doc._id;
        expect(doc).to.deep.equal(test);
        done();
      });
      test.save(function(err) {
        if (err) return done(err);
      });
    });

    it('should listen to a document being removed', function(done) {
      Test.once('remove', function(doc) {
        expect(doc).to.equal(test);
        done();
      });
      test.remove(function(err) {
        if (err) return done(err);
      });
    });

    after(function() {
      Test.removeAllListeners('save');
    });
  });

  describe('pre-save', function() {
    before(function() {
      test = new Test({foo: 'foo', bar: 4});
    });

    it('should run asynchronous functions prior to saving a document', function(done) {
      Test.pre('save', function(next) {
        this.foo = this.foo.toUpperCase();
        next();
      });
      Test.pre('save', function(next) {
        this.foo = this.foo + 'bar';
        next();
      });
      test.save(function(err, doc) {
        if (err) return done(err);
        delete doc._id;
        expect(doc).to.deep.equal(test);
        expect(doc.foo).to.equal('FOObar');
        done();
      });
    });

    it('should fail to save on error callback', function(done) {
      Test.pre('save', function(next) {
        next(new Error('You shall not pass'));
      });
      Test.pre('save', function(next) {
        next(new Error('This should never be called'));
      });
      test.save(function(err, doc) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal('You shall not pass');
        expect(doc).to.not.be.ok;
        done();
      });
    });
  });

  after(function(done) {
    db.dropDatabase(done);
  });
});
