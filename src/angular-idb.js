'use strict';

angular.module('nakamura-to.angular-idb', []).provider('$idb', function () {

  var defaults = this.defaults = {
    name: 'angular-idb',
    version: 1,
    /*jshint unused:false*/
    onUpgradeNeeded: function(session) {},
    initializeDatabase: false
  };

  var destroyPromise;

  this.$get = function($rootScope, $q, $window) {
    var $idb = createIDB($rootScope, $q, $window);

    if (defaults.initializeDatabase) {
      destroyPromise = $idb.destroy();
    } else {
      destroyPromise = $q.when();
    }

    return $idb;
  };

  function createIDB($rootScope, $q, $window) {
    var idbFactory = $window.indexedDB;

    var util = {

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
          util.runDeferred(function () {
            deferred.resolve(result);
          });
        };
        req.onerror = function (event) {
          util.runDeferred(function () {
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
            util.runDeferred(function () {
              deferred.resolve();
            });
          }
          callback(cursor);
          if (!next) {
            util.runDeferred(function () {
              deferred.resolve();
            });              
          }
        };
        req.onerror = function (event) {
          util.runDeferred(function () {
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
      }
    };

    /**
     * Service
     */
    function idb(storeName) {
      return new ObjectStoreAdapter(storeName);
    }

    idb.session = function () {
      var _session = function (storeName) {
        return _session.stores[storeName];
      };

      _session.open = function(storeNames, mode) {
        function _open() {
          var deferred = $q.defer();
          var req = idbFactory.open(defaults.name, defaults.version);

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
            util.runDeferred(function () {
              deferred.resolve();
            });
          };

          req.onerror = function (event) {
            util.runDeferred(function () {
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
      var req = idbFactory.deleteDatabase(defaults.name);
      return util.promise(req);
    };

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
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.add = function(value, key) {
      var req = (key === null || key === undefined) ?
        this.delegate.add(value):
        this.delegate.add(value, key);
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.delete = function(key) {
      var req = this.delegate.delete(key);
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.remove = ObjectStoreWrapper.prototype.delete;

    ObjectStoreWrapper.prototype.get = function(key) {
      var req = this.delegate.get(key);
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.clear = function () {
      var req = this.delegate.clear();
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.openCursor = function (callback, range, direction) {
      var req = util.openCursor(this.delegate, 'openCursor', range, direction);
      return util.promiseCursor(req, callback, CursorWithValueWrapper);
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
      return util.promise(req);
    };

    ObjectStoreWrapper.prototype.all = function () {
      var values = [];
      return this.openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }).then(function () {
        return values;
      });
    };

    ObjectStoreWrapper.prototype.first = function () {
      var value;
      return this.openCursor(function (cursor) {
        if (cursor) {
          value = cursor.value;
        }
      }).then(function () {
        return value;
      });
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

    ObjectStoreAdapter.prototype.all = function () {
      var storeName = this.name;
      var session = idb.session();
      return session.open([storeName], 'readonly').then(function () {
        return session(storeName).all();
      });
    };

    ObjectStoreAdapter.prototype.first = function () {
      var storeName = this.name;
      var session = idb.session();
      return session.open([storeName], 'readonly').then(function () {
        return session(storeName).first();
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
      var req = util.openCursor(this.delegate, 'openCursor', range, direction);
      return util.promiseCursor(req, callback, CursorWithValueWrapper);
    };

    IndexWrapper.prototype.openKeyCursor = function (callback, range, direction) {
      var req = util.openCursor(this.delegate, 'openKeyCursor', range, direction);
      return util.promiseCursor(req, callback, CursorWrapper);
    };

    IndexWrapper.prototype.get = function(key) {
      var req = this.delegate.get(key);
      return util.promise(req);
    };

    IndexWrapper.prototype.getKey = function(key) {
      var req = this.delegate.getKey(key);
      return util.promise(req);
    };

    IndexWrapper.prototype.count = function(key) {
      var req = (key === null || key === undefined) ?
        this.delegate.count():
        this.delegate.count(key);
      return util.promise(req);
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
      return util.promise(req);
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
      return util.promise(req);
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

    return idb;      
  }
});