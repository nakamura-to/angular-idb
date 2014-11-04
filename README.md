angular-idb
===========

IndexedDB wrapper integrated with AngularJS.

Supported browsers are followings:

- Chrome
- Firefox
- IE 11

```js
angular.module('app', ['nakamura-to.angular-idb'])

  .provider(function ($idbProvider) {
    $idbProvider.defaults = {
      onUpgradeNeeded = function (session) {
        var product = session.createObjectStore(
          'product', {
            keyPath: 'id',
            autoIncrement: true
          });
        product.add({ name: 'Python' });
        product.add({ name: 'Ruby' });
        product.add({ name: 'Java' });
      }
    };
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
        $scope.clickedProduct = product;
      });
    };
  });  
```
