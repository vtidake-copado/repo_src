vlocity.cardframework.registerModule.controller('vellaDiscoveryQuestionsController', ['$scope', '$rootScope', '$location', 'IonicService', function($scope, $rootScope, $location, IonicService) {
    'use strict';
    $scope.initData = function(obj) {
        $scope.question = obj;
        $scope.intelAction = {
            url: obj.info[$rootScope.nsPrefix + 'Url__c']
        };
    };

    $scope.launchAction = function(url) {
        if (url) {
            $location.path(url);
        } else {
            IonicService.popup.confirm({
                title: 'Launch Action',
                template: 'There is no URL set for this action.'
            });
        }
    };
}]);