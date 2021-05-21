vlocity.cardframework.registerModule.controller('vellaPolicyContainerController', ['$scope', '$rootScope', function($scope, $rootScope, $state, vellaHomeCircleService) {
    'use strict';
    $scope.closeNotification = function(type) {
        if (type === 'Renters' || type === 'Property' || type === 'Homeowners') {
            $rootScope.vlocityMobileNotificationSensor.active = false;
            if (localStorage.vlocityMobileNotificationSensor) {
                localStorage.removeItem('vlocityMobileNotificationSensor');
            }
        }
        if (type === 'Auto') {
            $rootScope.vlocityMobileNotification = false;
        }
    };
}]);