vlocity.cardframework.registerModule.controller('vellaMoreDetailsController', ['$scope', '$rootScope', 'IonicService', function($scope, $rootScope, IonicService) {
    'use strict';
    $scope.getDetails = function(obj) {
        $scope.details = obj;
        console.log('$scope.details', $scope.details);
        $rootScope.isLoaded = true;
    };
}]);