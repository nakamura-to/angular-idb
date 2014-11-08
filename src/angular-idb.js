'use strict';

angular.module('nakamura-to.angular-idb', []).provider('$idb', function () {

  var defaults = this.defaults = {
    name: 'angular-idb',
    version: 1,
    /*jshint unused:false*/
    onUpgradeNeeded: function(session) {},
    initializeDatabase: false
  };

  var helper;

  var destroyPromise;

  /**
   * Service
   */
  var idb = function(storeName) {
    return new ObjectStoreAdapter(storeName);
  };

  idb.session = function () {
    var _session = function (storeName) {
      return _session.stores[storeName];
    };

    _session.open = function(storeNames, mode) {
      function _open() {
        var deferred = helper.$q.defer();
        var req = helper.indexedDB.open(defaults.name, defaults.version);

        req.onupgradeneeded = function (event) {
          _session.db = event.target.result;
          _session.transaction = event.target.transaction;
          defaults.onUpgradeNeeded(_session);
        };

        req.onsuccess = function (event) {
          var db = _session.db = event.target.result;
          var transaction = _session.transaction = db.transaction(storeNames, mode || 'readonly');
          _session.stores = storeNames.reduce(function (acc, name) {
            var store = transaction.objectStore(name);
            acc[name] = new ObjectStoreWrapper(store);
            return acc;
          }, {});
          db.close();
          helper.runDeferred(function () {
            deferred.resolve();
          });
        };

        req.onerror = function (event) {
          helper.runDeferred(function () {
            deferred.reject(event);
          });
        };

        req.onblocked = function(event) {
          deferred.reject(event);      
        };

        return deferred.promise;          
      }
      return destroyPromise.then(_open);
    };

    _session.createObjectStore = function (storeName, optionalParameters) {
      if (_session.db) {
        var store = _session.db.createObjectStore(storeName, optionalParameters);
        return new ObjectStoreWrapper(store);
      } else {
        throw new Error('session is not opened.');
      }
    };

    return _session;
  };

  idb.destroy = function () {
    var req = helper.indexedDB.deleteDatabase(defaults.name);
    return helper.promise(req);
  };

  this.$get = function($rootScope, $q, $window) {
    helper = makeHelper($rootScope, $q, $window);

    if (defaults.initializeDatabase) {
      destroyPromise = idb.destroy();
    } else {
      destroyPromise = $q.when();
    }

    return idb;
  };

  function makeHelper($rootScope, $q, $window) {
    return {

      $q: $q,

      indexedDB: $window.indexedDB,

      runDeferred: function (runner) {
        runner();
        if (!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      },

      promise: function (req) {
        var deferred = $q.defer();
        req.onsuccess = function (event) {
          var result = event.target.result;
          helper.runDeferred(function () {
            deferred.resolve(result);
          });
        };
        req.onerror = function (event) {
          helper.runDeferred(function () {
            deferred.reject(event);
          });
        };
        return deferred.promise;
      },

      promiseCursor: function (req, callback, CursorWrapper) {
        var deferred = $q.defer();
        req.onsuccess = function (event) {
          var next = false;
          var cursor = event.target.result;
          if (cursor) {
            cursor = new CursorWrapper(cursor);
            var cont = cursor.continue;
            cursor.continue = function (key) {
              next = true;
              cont.call(cursor, key);
            };
            var advance = cursor.advance;
            cursor.advance = function (count) {
              next = true;
              advance.call(cursor, count);
            };
          } else {
            helper.runDeferred(function () {
              deferred.resolve();
            });
          }
          callback(cursor);
          if (!next) {
            helper.runDeferred(function () {
              deferred.resolve();
            });              
          }
        };
        req.onerror = function (event) {
          helper.runDeferred(function () {
            deferred.reject(event);
          });
        };
        return deferred.promise;
      },

      openCursor: function (delegate, methodName, range, direction) {
        var _openCursor = delegate[methodName].bind(delegate);
        if (range === null || range === undefined) {
          if (direction === null || direction === undefined) {
            return _openCursor();
          }
          return _openCursor(null, direction);
        } else {
          if (direction === null || direction === undefined) {
            return _openCursor(range);
          }
          return _openCursor(range, direction);
        }
      },

      fetch: function(openCursor, options) {
        options = options || { 
          offset: 0,
          limit: Number.MAX_VALUE,
          range: null,
          direction: null
        };
        var offset = parseFloat(options.offset, 10);
        var limit = parseFloat(options.limit, 10);
        var lowerBound = isNaN(offset) ? 0 : offset;
        var upperBound = isNaN(limit) ? Number.MAX_VALUE : lowerBound + limit;
        upperBound = isNaN(upperBound) ? Number.MAX_VALUE : upperBound;
        var values = [];
        var count = 0;
        return openCursor(function (cursor) {
          if (cursor) {
            if (lowerBound <= count && count <= upperBound) {
              values.push(cursor.value);
            }
            count++;
            if (count < upperBound) {
              cursor.continue();
            }
          }
        }, options.range, options.direction).then(function () {
          return values;
        });
      },

      first: function (openCursor) {
        var value;
        return openCursor(function (cursor) {
          if (cursor) {
            value = cursor.value;
          }
        }).then(function () {
          return value;
        });        
      },

      last: function (openCursor) {
        var value;
        return openCursor(function (cursor) {
          if (cursor) {
            value = cursor.value;
          }
        }, null, 'prev').then(function () {
          return value;
        });        
      }

    };
  }

  /**
   * IDBObjectStore Wrapper
   */
  function ObjectStoreWrapper(delegate) {
    this.delegate = delegate;
    Object.defineProperties(this, {
      name: { get: function () { return delegate.name; } },
      keyPath: { get: function () { return delegate.keyPath; } },
      indexNames: { get: function () { return delegate.indexNames; } },
      transaction: { get: function () { return delegate.transaction; } },
      autoIncrement: { get: function () { return delegate.autoIncrement; } },        
    });      
  }

  ObjectStoreWrapper.prototype.put = function(value, key) {
    var req = (key === null || key === undefined) ? 
      this.delegate.put(value):
      this.delegate.put(value, key);
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.add = function(value, key) {
    var req = (key === null || key === undefined) ?
      this.delegate.add(value):
      this.delegate.add(value, key);
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.delete = function(key) {
    var req = this.delegate.delete(key);
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.remove = ObjectStoreWrapper.prototype.delete;

  ObjectStoreWrapper.prototype.get = function(key) {
    var req = this.delegate.get(key);
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.clear = function () {
    var req = this.delegate.clear();
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.openCursor = function (callback, range, direction) {
    var req = helper.openCursor(this.delegate, 'openCursor', range, direction);
    return helper.promiseCursor(req, callback, CursorWithValueWrapper);
  };

  ObjectStoreWrapper.prototype.createIndex = function (name, keyPath, optionalParameters) {
    var index = this.delegate.createIndex(name, keyPath, optionalParameters);
    return new IndexWrapper(index);
  };

  ObjectStoreWrapper.prototype.index = function (name) {
    var index = this.delegate.index(name);
    return new IndexWrapper(index);
  };

  ObjectStoreWrapper.prototype.deleteIndex = function (name) {
    this.delegate.deleteIndex(name);
  };

  ObjectStoreWrapper.prototype.count = function (key) {
    var req = (key === null || key === undefined) ?
      this.delegate.count():
      this.delegate.count(key);
    return helper.promise(req);
  };

  ObjectStoreWrapper.prototype.fetch = function (options) {
    return helper.fetch(this.openCursor.bind(this), options);
  };

  ObjectStoreWrapper.prototype.first = function () {
    return helper.first(this.openCursor.bind(this));
  };

  ObjectStoreWrapper.prototype.last = function () {
    return helper.last(this.openCursor.bind(this));
  };

  /**
   * IDBObjectStore Adapter
   */
  function ObjectStoreAdapter(storeName) {
    this.name = storeName;
  }

  ObjectStoreAdapter.prototype.put = function(value, key) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).put(value, key);
    });
  };

  ObjectStoreAdapter.prototype.add = function(value, key) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).add(value, key);
    });
  };

  ObjectStoreAdapter.prototype.delete = function(key) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).delete(key);
    });
  };

  ObjectStoreAdapter.prototype.remove = ObjectStoreAdapter.prototype.delete;

  ObjectStoreAdapter.prototype.get = function(key) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).get(key);
    });
  };

  ObjectStoreAdapter.prototype.clear = function () {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).clear();
    });
  };

  ObjectStoreAdapter.prototype.openCursor = function (callback, range, direction) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).openCursor(callback, range, direction);
    });
  };

  ObjectStoreAdapter.prototype.createIndex = function (name, keyPath, optionalParameters) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).createIndex(name, keyPath, optionalParameters);
    });
  };

  ObjectStoreAdapter.prototype.index = function (name) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).index(name);
    });
  };

  ObjectStoreAdapter.prototype.deleteIndex = function (name) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readwrite').then(function () {
      return session(storeName).deleteIndex(name);
    });
  };

  ObjectStoreAdapter.prototype.count = function (key) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).count(key);
    });
  };

  ObjectStoreAdapter.prototype.fetch = function (options) {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).fetch(options);
    });
  };

  ObjectStoreAdapter.prototype.first = function () {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).first();
    });
  };

  ObjectStoreAdapter.prototype.last = function () {
    var storeName = this.name;
    var session = idb.session();
    return session.open([storeName], 'readonly').then(function () {
      return session(storeName).last();
    });
  };

  /**
   * IDBIndex Wrapper
   */
  function IndexWrapper(delegate) {
    this.delegate = delegate;
    Object.defineProperties(this, {
      name: { get: function () { return delegate.name; } },
      objectStore: { get: function () { return delegate.objectStore; } },
      keyPath: { get: function () { return delegate.keyPath; } },
      multiEntry: { get: function () { return delegate.multiEntry; } },
      unique: { get: function () { return delegate.unique; } },        
    });      
  }

  IndexWrapper.prototype.openCursor = function (callback, range, direction) {
    var req = helper.openCursor(this.delegate, 'openCursor', range, direction);
    return helper.promiseCursor(req, callback, CursorWithValueWrapper);
  };

  IndexWrapper.prototype.openKeyCursor = function (callback, range, direction) {
    var req = helper.openCursor(this.delegate, 'openKeyCursor', range, direction);
    return helper.promiseCursor(req, callback, CursorWrapper);
  };

  IndexWrapper.prototype.get = function(key) {
    var req = this.delegate.get(key);
    return helper.promise(req);
  };

  IndexWrapper.prototype.getKey = function(key) {
    var req = this.delegate.getKey(key);
    return helper.promise(req);
  };

  IndexWrapper.prototype.count = function(key) {
    var req = (key === null || key === undefined) ?
      this.delegate.count():
      this.delegate.count(key);
    return helper.promise(req);
  };

  IndexWrapper.prototype.fetch = function (options) {
    return helper.fetch(this.openCursor.bind(this), options);
  };

  IndexWrapper.prototype.first = function () {
    var value;
    return this.openCursor(function (cursor) {
      if (cursor) {
        value = cursor.value;
      }
    }).then(function () {
      return value;
    });
  };

  IndexWrapper.prototype.last = function () {
    var value;
    return this.openCursor(function (cursor) {
      if (cursor) {
        value = cursor.value;
      }
    }, null, 'prev').then(function () {
      return value;
    });
  };

  /**
   * IDBCursor Wrapepr
   */
  function CursorWrapper(delegate) {
    this.delegate = delegate;
    Object.defineProperties(this, {
      source: { get: function () { return delegate.source; } },
      direction: { get: function () { return delegate.direction; } },
      key: { get: function () { return delegate.key; } },
      primaryKey: { get: function () { return delegate.primaryKey; } },
    });
  }

  CursorWrapper.prototype.update = function(value) {
    var req = this.delegate.update(value);
    return helper.promise(req);
  };

  CursorWrapper.prototype.advance = function (count) {
    this.delegate.advance(count);
  };

  CursorWrapper.prototype.continue = function (key) {
    if (key === null || key === undefined) {
      this.delegate.continue();
    } else {
      this.delegate.continue(key);
    }
  };

  CursorWrapper.prototype.delete = function() {
    var req = this.delegate.delete();
    return helper.promise(req);
  };

  CursorWrapper.prototype.remove = CursorWrapper.prototype.delete;

  /**
   * IDBCursorWithValue Wrapepr
   */
  function CursorWithValueWrapper(delegate) {
    this.delegate = delegate;
    Object.defineProperties(this, {
      value: { get: function () { return delegate.value; } },
    });
    CursorWrapper.call(this, delegate);
  }

  CursorWithValueWrapper.prototype = CursorWrapper.prototype;

});
