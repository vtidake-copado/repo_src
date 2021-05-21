vlocity.cardframework.registerModule.controller('vellaHomeProtectionController', ['$scope', '$rootScope', function($scope, $rootScope) {
    'use strict';
    function generateRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    $scope.animationDelay = {
        online: generateRandom(0.25, 0.85),
        offline: generateRandom(0.25, 0.85),
        alert: generateRandom(0.25, 0.85)
    };
}]);