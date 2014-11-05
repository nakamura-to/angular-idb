'use strict';

describe('ObjectStore CursorWrapper', function () {

  var $idb;

  beforeEach(module('nakamura-to.angular-idb', function ($idbProvider) {
    angular.extend($idbProvider.defaults, {
      onUpgradeNeeded: function (session) {
        var person = session.createObjectStore('person', { autoIncrement: true });
        person.createIndex('name', 'name', {unique: true});
        person.createIndex('age', 'age', {unique: false});
        person.add({ name: 'aaa', age: 10 });
        person.add({ name: 'ddd', age: 10 });
        person.add({ name: 'bbb', age: 20 });
        person.add({ name: 'eee', age: 20 });
        person.add({ name: 'ccc', age: 30 });
        person.add({ name: 'fff', age: 30 });
        var address = session.createObjectStore('address', {autoIncrement: true});
        address.createIndex('street', 'street', {unique: false});
		    address.put({ street: 'aaa', city: 'NY'});
        address.put({ street: 'bbb', city: 'TOKYO'});
        address.put({ street: 'aaa', city: 'PARIS'});
      },
      initializeDatabase: true 
    });
  }));

  beforeEach(inject(function (_$idb_) {
    $idb = _$idb_;
  }));

  it('should support properties', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').openCursor(function (cursor) {
        if (cursor) {
          expect(cursor.source).toBeDefined();
          expect(cursor.direction).toBe('next');
          expect(cursor.key).toBe(1);
          expect(cursor.primaryKey).toBe(1);
          expect(cursor.value).toEqual({ name: 'aaa', age: 10 });
          done();
        }
      });
    });
  });

  it('should support "update"', function (done) {
    var session = $idb.session();
    session.open(['person'], 'readwrite').then(function () {
      return session('person').openCursor(function (cursor) {
        if (cursor) {
          var value = cursor.value;
          value.age2 = value.age * 2;
          delete value.age;
          cursor.update(value);
          cursor.continue();
        }
      });
    }).then(function () {
      return session('person').all();
    }).then(function (values) {
      expect(values.length).toBe(6);
      expect(values).toEqual([
        { name: 'aaa', age2: 20 },
        { name: 'ddd', age2: 20 },
        { name: 'bbb', age2: 40 },
        { name: 'eee', age2: 40 },
        { name: 'ccc', age2: 60 },
        { name: 'fff', age2: 60 }
      ]);
      done();
    });
  });

  it('should support "delete"', function (done) {
    var session = $idb.session();
    session.open(['person'], 'readwrite').then(function () {
      return session('person').openCursor(function (cursor) {
        if (cursor) {
          var value = cursor.value;
          if (value.name > 'd') {
            cursor.delete();
          }
          cursor.continue();
        }
      });
    }).then(function () {
      return session('person').all();
    }).then(function (values) {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { name: 'aaa', age: 10 },
        { name: 'bbb', age: 20 },
        { name: 'ccc', age: 30 }
      ]);
      done();
    });
  });

  it('should support "next" direction', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }, null, 'next');
    }).then(function () {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { street: 'aaa', city: 'NY' },
        { street: 'bbb', city: 'TOKYO' },
        { street: 'aaa', city: 'PARIS' }
      ]);
      done();
    });
  });

  it('should support "nextunique" direction', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }, null, 'nextunique');
    }).then(function () {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { street: 'aaa', city: 'NY' },
        { street: 'bbb', city: 'TOKYO' },
        { street: 'aaa', city: 'PARIS' }
      ]);
      done();
    });
  });

  it('should support "prev" direction', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }, null, 'prev');
    }).then(function () {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { street: 'aaa', city: 'PARIS' },
        { street: 'bbb', city: 'TOKYO' },
        { street: 'aaa', city: 'NY' }
      ]);
      done();
    });
  });

  it('should support "prevunique" direction', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }, null, 'prevunique');
    }).then(function () {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { street: 'aaa', city: 'PARIS' },
        { street: 'bbb', city: 'TOKYO' },
        { street: 'aaa', city: 'NY' }
      ]);
      done();
    });
  });

  it('should support "advance"', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.advance(2);
        }
      }, null, 'next');
    }).then(function () {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { street: 'aaa', city: 'NY' },
        { street: 'aaa', city: 'PARIS' },
      ]);
      done();
    });
  });

  it('should support "openCursor" with IDBKeyRange', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['address']).then(function () {
      return session('address').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.value);
          cursor.continue();
        }
      }, IDBKeyRange.only(2));
    }).then(function () {
      expect(values.length).toBe(1);
      expect(values).toEqual([
        { street: 'bbb', city: 'TOKYO' }
      ]);
      done();
    });
  });

});
