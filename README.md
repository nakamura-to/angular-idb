angular-idb
===========

IndexedDB wrapper integrated with AngularJS.

Supported browsers are followings:

- Chrome 38 and above versions
- Firefox 33 and above versions
- IE 11 and above versions

```js
angular.module('app', ['nakamura-to.angular-idb'])

  .config(function ($idbProvider) {
    angular.extend($idbProvider.defaults, {
      version: 1,
      onUpgradeNeeded: function (session) {
        var product = session.createObjectStore(
          'product', {
            keyPath: 'id',
            autoIncrement: true
          });
        product.add({ name: 'Python' });
        product.add({ name: 'Ruby' });
        product.add({ name: 'Java' });
      }
    });
  })

  .factory('productStorage', function ($idb) {
    return {
      get: function (id) {
        return $idb('product').get(id);
      },
      add: function (product) {
        return $idb('product').add(product);
      },
      delete: function (id) {
        return $idb('product').delete(id);
      }
    };
  })

  .controller('MainCtrl', function ($scope, productStorage) {
    $scope.click = function (id) {
      productStrage.get(id).then(function (product) {
        $scope.product = product;
      });
    };
  });  
```
