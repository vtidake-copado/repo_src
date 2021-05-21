vlocity.cardframework.registerModule.controller('vellaContainerController', ['$scope', '$rootScope', '$state', function($scope, $rootScope, $state) {
    'use strict';
    $scope.init = function() {
        console.log('inside vellaContainerController init');
        $scope.currentType = $state.params.type;
        if ($scope.currentType === 'MoreDetail') {
            $rootScope.isLoaded = true;
        }
    };
    $scope.goToMoreDetail = function() {
        $rootScope.isLoaded = false;
        $rootScope.cardData.InsurablePage = false;
        $state.go('app.univ', {type: 'MoreDetail', objectId: $scope.params.id});
    };
}]);