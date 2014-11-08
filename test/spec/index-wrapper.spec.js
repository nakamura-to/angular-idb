'use strict';

describe('IndexWrapper', function () {

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
      },
      initializeDatabase: true     
    });
  }));

  beforeEach(inject(function (_$idb_) {
    $idb = _$idb_;
  }));

  it('should support "openCursor"', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['person']).then(function () {
      return session('person').index('age').openCursor(function (cursor) {
        if (cursor) {
          values.push(cursor.key);
          cursor.continue();
        }
      });
    }).then(function () {
      expect(values.length).toBe(6);
      done();
    });
  });

  it('should support "openKeyCursor"', function (done) {
    var session = $idb.session();
    var values = [];
    session.open(['person']).then(function () {
      return session('person').index('age').openKeyCursor(function (cursor) {
        if (cursor) {        	
          values.push(cursor.key);
          cursor.continue();
        }
      });
    }).then(function () {
      expect(values.length).toBe(6);
      done();
    });
  });

  it('should support "get"', function (done) {
  	var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('age').get(20);
    }).then(function (value) {
      expect(value).toEqual({ name: 'bbb', age: 20 });
      done();
    });
  });

  it('should support "getKey"', function (done) {
  	var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('age').getKey(20);
    }).then(function (key) {
      expect(key).toEqual(3);
      done();
    });
  });

  it('should support "count"', function (done) {
  	var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('age').count(20);
    }).then(function (key) {
      expect(key).toEqual(2);
      done();
    });
  });


  it('should support "fetch" without options', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch();
    }).then(function (values) {
      expect(values.length).toBe(6);
      expect(values).toEqual([
        { name: 'aaa', age: 10 },
        { name: 'bbb', age: 20 },
        { name: 'ccc', age: 30 },
        { name: 'ddd', age: 10 },
        { name: 'eee', age: 20 },
        { name: 'fff', age: 30 }
      ]);
      done();
    });
  });

  it('should support "fetch" with offset', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch({ offset: 1 });
    }).then(function (values) {
      expect(values.length).toBe(5);
      expect(values).toEqual([
        { name: 'bbb', age: 20 },
        { name: 'ccc', age: 30 },
        { name: 'ddd', age: 10 },
        { name: 'eee', age: 20 },
        { name: 'fff', age: 30 }
      ]);
      done();
    });
  });

  it('should support "fetch" with limit', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch({ limit: 2 });
    }).then(function (values) {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { name: 'aaa', age: 10 },
        { name: 'bbb', age: 20 }
      ]);
      done();
    });
  });

  it('should support "fetch" with offset and limit', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch({ offset: 2, limit: 2 });
    }).then(function (values) {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { name: 'ccc', age: 30 },
        { name: 'ddd', age: 10 }
      ]);
      done();
    });
  });

  it('should support "fetch" with next direction', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch({ direction: 'next' });
    }).then(function (values) {
      expect(values.length).toBe(6);
      expect(values).toEqual([
        { name: 'aaa', age: 10 },
        { name: 'bbb', age: 20 },
        { name: 'ccc', age: 30 },
        { name: 'ddd', age: 10 },
        { name: 'eee', age: 20 },
        { name: 'fff', age: 30 }
      ]);
      done();
    });
  });

  it('should support "fetch" with prev direction', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('name').fetch({ direction: 'prev' });
    }).then(function (values) {
      expect(values.length).toBe(6);
      expect(values).toEqual([
        { name: 'fff', age: 30 },
        { name: 'eee', age: 20 },
        { name: 'ddd', age: 10 },
        { name: 'ccc', age: 30 },
        { name: 'bbb', age: 20 },
        { name: 'aaa', age: 10 }
      ]);
      done();
    });
  });

  it('should support "fetch" with range', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      return session('person').index('age').fetch({ range: IDBKeyRange.lowerBound(20) });
    }).then(function (values) {
      expect(values.length).toBe(4);
      expect(values).toEqual([
        { name: 'bbb', age: 20 },
        { name: 'eee', age: 20 },
        { name: 'ccc', age: 30 },
        { name: 'fff', age: 30 }
      ]);
      done();
    });
  });

  it('should support perperties', function (done) {
    var session = $idb.session();
    session.open(['person']).then(function () {
      var index = session('person').index('age');
      expect(index.name).toBe('age');
      expect(index.objectStore.name).toBe('person');
      expect(index.keyPath).toBe('age');
      // TODO: in IE, index.multiEntry returns undefined 
      // expect(index.multiEntry).toBe(false);
      expect(index.unique).toBe(false);
      done();
    });
  });

});
