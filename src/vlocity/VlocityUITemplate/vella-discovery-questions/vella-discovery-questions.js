vlocity.cardframework.registerModule.controller('vellaDiscoveryQuestionsController', ['$scope', '$location', 'IonicService', function($scope, $location, IonicService) {
    'use strict';
    $scope.launchAction = function(action) {
        if (action.url) {
            $location.path(action.url);
        } else {
            IonicService.popup.confirm({
                title: 'Launch Action',
                template: 'There is no URL set for this action.'
            });
        }
    };
}]);