Mongo JavaScript Object Modeler
===============================

MongoJSOM is a lightweight MongoDB object modeling library for node.js. It
uses [mongojs](http://mafintosh.github.io/mongojs/) as backend API, and expands
from there by providing classes for Models and Schemas.

For basic usage, refer to the [mongojs](https://github.com/mafintosh/mongojs#usage)
API documentation. In addition to the MongoDB API calls, MongoJSOM provides
object modeling capabilities.

Usage
-----

```javascript
// Require libraries and initiate database connection
var db = require('mongojsom')(connectionString);

// Define your schema
var schema = new db.Schema({
  firstName: String,
  lastName: String
});

// Instantiate your Model class for the 'users' collection
var User = new db.Model('users', schema);
```

Now that your Model class is instantiated, you can use model prototype methods:

```javascript
var user = new User({firstName: 'John', lastName: 'Doe'});
user.save(function(err, savedUser) { ... });
user.remove(function(err, wasRemoved) { ... });
```

You also have access to static collection methods:

```javascript
User.findOne({firstName: 'John'}, function(err, user) {
  // `user` is an instance of `User`
  user.remove(...);
});
```

Hooks
-----
You can add hooks to a Model class to run functions on any given document prior
to it being saved. This allows you to modify documents before sending them to
MongoDB. To add pre-save hooks:

```javascript
User.pre('save', function(next) {
  this.password = _hashPasswd(this.password);
  next();
});
```
The document to be saved is bound directly to `this`. Pre-save methods have a
single argument `next`, which is a callback, to allow for asynchronous
operations.

Pre-save hooks are run in the order they were registered, and the changes to a
document are cumulative.

Augments
--------
You can augment a model with methods and properties from a different object.
Think of augments as mixins with extend capabilities. The way this works is
different for each attribute type:

* Arrays get unioned:

```javascript
Foo._arr = ['foo', 'bar'];
Bar._arr = ['bar', 'baz'];
db.Model.augment(Foo, Bar);
Foo._arr == ['foo', 'bar', 'baz'];
```

* Objects get extended:

```javascript
Foo._obj = {foo: 1, bar: 2};
Bar._obj = {bar: 3, baz: 4};
db.Model.augment(Foo, Bar);
Foo._obj == {foo: 1, bar: 3, baz: 4};
```

* Functions get wrapped:

```javascript
Foo._fn = function() { this._count++; return 'foo'; };
Bar._fn = function() { this._count++; return 'bar'; };
db.Model.augment(Foo, Bar);
Foo._fn() == 'bar'; // this._count == 2;
```

Everything else is just replaced. If the property doesn't exist in the original
object, it is added. This applies for both static and prototype properties.

Events
------
The `Model` class itself is evented. This means that you can listen to events
on the static class, rather than on instances. This allows for more complex
modeling behavior. Following the example above:

```javascript
User.on('save', function(user) {
  // This is fired whenever a `user.save()` is called. The `user` argument is
  // the same model instance on which `.save()` was called.
});
```

Events emitted by default are `save` and `remove`, but you can also emit any
custom event by doing:

```javascript
User.emit('myCustomEvent', dataToSend);
```

See the [API documentation](https://github.com/mafintosh/mongojs#collection) for
a list of all static collection methods.
