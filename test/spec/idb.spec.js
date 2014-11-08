'use strict';

describe('$idb', function () {

  var $rootScope;

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

  beforeEach(inject(function (_$rootScope_, _$idb_) {
    $rootScope = _$rootScope_;
    $idb = _$idb_;
  }));

  it('should open database with implicit readonly mode', function (done) {
    var session = $idb.session();
    session.open(['product']).then(function () {
      expect(session('product')).toBeDefined();
      done();
    });
  });

  it('should open database with explicit readonly mode', function (done) {
    var session = $idb.session();
    session.open(['product'], 'readonly').then(function () {
      expect(session('product')).toBeDefined();
      done();
    });
  });

  it('should open database with explicit readwrite mode', function (done) {
    var session = $idb.session();
    session.open(['product'], 'readwrite').then(function () {
      expect(session('product')).toBeDefined();
      done();
    });
  });

  it('should destroy database', function (done) {
    var session = $idb.session();
    session.open(['product'], 'readwrite').then(function () {
      expect(session('product')).toBeDefined();
      $idb.destroy().then(done);
    });
  });

  it('should support "put"', function (done) {
    $idb('product').put({ id: 1, name: 'JavaScript' }).then(function (key) {
      expect(key).toBe(1);
      return $idb('product').get(1);
    }).then(function (value) {
      expect(value).toEqual({ id: 1, name: 'JavaScript' });
      done();        
    });
  });

  it('should support "add"', function (done) {
    $idb('product').add({ name: 'JavaScript' }).then(function (key) {
      expect(key).toBe(4);
      done();
    });    
  });

  it('should support "delete"', function (done) {
    $idb('product').delete(1).then(function () {
      return $idb('product').get(1);
    }).then(function (value) {
      expect(value).toBeUndefined();        
      done();
    });
  });

  it('should support "get"', function (done) {
    $idb('product').get(1).then(function (value) {
      expect(value).toEqual({ id: 1, name: 'Python' });
      done();
    });
  });

  it('should support "clear"', function (done) {
    $idb('product').clear().then(function () {
      return $idb('product').count();
    }).then(function (num) {
      expect(num).toBe(0);
      done();
    });
  });

  it('should support "openCursor"', function (done) {
    var keys = [];
    $idb('product').openCursor(function (cursor) {
      if (cursor) {
        keys.push(cursor.key);
        cursor.continue();
      }
    }).then(function () {
      expect(keys.length).toBe(3);
      expect(keys).toEqual([1, 2, 3]);
      done();
    });
  });

  it('should support "count"', function (done) {
    $idb('product').count().then(function (num) {
      expect(num).toBe(3);
      done();
    });
  });

  it('should support "all"', function (done) {
    $idb('product').all().then(function (values) {
      expect(values.length).toBe(3);
      expect(values).toEqual([
        { id: 1, name: 'Python' },
        { id: 2, name: 'Ruby' },
        { id: 3, name: 'Java' }
      ]);
      done();
    });
  });

  it('should support "first"', function (done) {
    $idb('product').first().then(function (value) {
      expect(value).toEqual({ id: 1, name: 'Python' });
      done();
    });
  });

  it('should support "last"', function (done) {
    $idb('product').last().then(function (value) {
      expect(value).toEqual({ id: 3, name: 'Java' });
      done();
    });
  });

});
