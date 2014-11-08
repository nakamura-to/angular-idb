'use strict';

describe('ObjectStoreWrapper', function () {

  var $idb;

  beforeEach(module('nakamura-to.angular-idb', function ($idbProvider) {
    angular.extend($idbProvider.defaults, {
      onUpgradeNeeded: function (session) {
        var product = session.createObjectStore('product', { keyPath: 'id', autoIncrement: true });
        product.add({ name: 'Python' });
        product.add({ name: 'Ruby' });
        product.add({ name: 'Java' });
      },
      initializeDatabase: true
    });
  }));

  beforeEach(inject(function (_$idb_) {
    $idb = _$idb_;
  }));

  it('should support "put"', function (done) {
    var session = $idb.session();
    session.open(['product'], 'readwrite').then(function () {
      return session('product').put({ id: 1, name: 'JavaScript' });
    }).then(function (key) {
      expect(key).toBe(1);
      return session('product').get(1);
    }).then(function (value) {
      expect(value).toEqual({ id: 1, name: 'JavaScript' });
      done();        
    });
  });

  it('should support "add"', function (done) {      
    var session = $idb.session();  
    session.open(['product'], 'readwrite').then(function () {
      return session('product').add({ name: 'JavaScript' });
    }).then(function (key) {
      expect(key).toBe(4);
      done();
    });
  });

  it('should support "delete"', function (done) {
    var session = $idb.session();  
    session.open(['product'], 'readwrite').then(function () {
      return session('product').delete(1);
    }).then(function () {
      return session('product').get(1);
    }).then(function (value) {
      expect(value).toBeUndefined();        
      done();
    });
  });

  it('should support "get"', function (done) {
    var session = $idb.session();  
    session.open(['product']).then(function () {
      return session('product').get(1);
    }).then(function (value) {
      expect(value).toEqual({ id: 1, name: 'Python' });
      done();
    });
  });

  it('should support "clear"', function (done) {
    var session = $idb.session();  
    session.open(['product'], 'readwrite').then(function () {
      return session('product').clear();
    }).then(function () {
      return session('product').count();
    }).then(function (num) {
      expect(num).toBe(0);
      done();
    });
  });

  it('should support "openCursor"', function (done) {
    var session = $idb.session();
    var keys = [];
    session.open(['product']).then(function () {
      return session('product').openCursor(function (cursor) {
        if (cursor) {
          keys.push(cursor.key);
          cursor.continue();
        }
      });
    }).then(function () {
      expect(keys.length).toBe(3);
      expect(keys).toEqual([1, 2, 3]);
      done();
    });
  });

  it('should support "count"', function (done) {
    var session = $idb.session();
    session.open(['product'], 'readwrite').then(function () {
      return session('product').count();
    }).then(function (num) {
      expect(num).toBe(3);
      done();
    });
  });

  it('should support "first"', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').first();
    }).then(function (value) {
      expect(value).toEqual({ id: 1, name: 'Python' });
      done();
    });
  });

  it('should support "last"', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').last();
    }).then(function (value) {
      expect(value).toEqual({ id: 3, name: 'Java' });
      done();
    });
  });

  it('should support "fetch" without options', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch();
    }).then(function (values) {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { id: 1, name: 'Python' },
        { id: 2, name: 'Ruby' },
        { id: 3, name: 'Java' }
      ]);
      done();
    });
  });

  it('should support "fetch" with offset', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ offset: 1 });
    }).then(function (values) {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { id: 2, name: 'Ruby' },
        { id: 3, name: 'Java' }
      ]);
      done();
    });
  });

  it('should support "fetch" with limit', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ offset: 0, limit: 2 });
    }).then(function (values) {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { id: 1, name: 'Python' },
        { id: 2, name: 'Ruby' }
      ]);
      done();
    });
  });

  it('should support "fetch" with offset and limit', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ offset: 1, limit: 1 });
    }).then(function (values) {
      expect(values.length).toBe(1);
      expect(values).toEqual([
        { id: 2, name: 'Ruby' }
      ]);
      done();
    });
  });

  it('should support "fetch" with next direction', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ direction: 'next' });
    }).then(function (values) {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { id: 1, name: 'Python' },
        { id: 2, name: 'Ruby' },
        { id: 3, name: 'Java' }
      ]);
      done();
    });
  });

  it('should support "fetch" with prev direction', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ direction: 'prev' });
    }).then(function (values) {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { id: 3, name: 'Java' },
        { id: 2, name: 'Ruby' },
        { id: 1, name: 'Python' }
      ]);
      done();
    });
  });

  it('should support "fetch" with range', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      return session('product').fetch({ range: IDBKeyRange.lowerBound(2) });
    }).then(function (values) {
      expect(values.length).toBe(2);
      expect(values).toEqual([
        { id: 2, name: 'Ruby' },
        { id: 3, name: 'Java' }
      ]);
      done();
    });
  });

  it('should support properties', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      var store = session('product');
      expect(store.name).toBe('product');
      expect(store.keyPath).toBe('id');
      expect(store.indexNames.length).toBe(0);
      // TODO: in IE, store.autoIncrement returns undefined 
      // expect(store.autoIncrement).toBe(true);
      done();
    });
  });

});
