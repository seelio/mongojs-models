MongoJS Models
==============

MongoJS Models is a lightweight MongoDB object modeling library for node.js. It
uses [mongojs](http://mafintosh.github.io/mongojs/) as backend API, and expands
from there by providing classes for Models and Schemas.

For basic usage, refer to the [mongojs](https://github.com/mafintosh/mongojs#usage)
API documentation. In addition to the MongoDB API calls, MongoJS Models provides
object modeling capabilities.

Example Usage
-------------

```javascript
// Require libraries and initiate database connection
var mongo = require('mongojs-models');
var db = mongo(connectionString);

// Define your schema
var schema = new db.Schema({
  firstName: String,
  lastName: String
});

// Load your collection
var Collection = db.collection('users');

// Instantiate your Model class
var User = new db.Model(Collection, schema);
```

Now that your Model class is instantiated, you can use model prototype methods:

```javascript
var user = new User({firstName: 'John', lastName: 'Doe'});
user.save(function(err, user) { ... });
user.remove(function(err, wasRemoved) { ... });
```

You also have access to static collection methods:

```javascript
User.findOne({firstName: 'John'}, function(err, user) {
  // `user` is an instance of `User`
  user.remove(...);
});
```

See the [API documentation](https://github.com/mafintosh/mongojs#collection) for
a list of all static collection methods.
