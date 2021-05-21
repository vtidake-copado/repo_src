vlocity.cardframework.registerModule.controller('insOsProductRulesReviewCtrl', ['$scope', function($scope) {
    'use strict';
    $scope.initProductRulesReview = function(control) {
        console.log('control', control);
        $scope.rulesList = [];
        if(control.vlcSI[control.itemsKey][0]) {
            for(let instanceKey in control.vlcSI[control.itemsKey][0]) {
                if(control.vlcSI[control.itemsKey][0][instanceKey]) {
                    $scope.rulesList = $scope.rulesList.concat(control.vlcSI[control.itemsKey][0][instanceKey]);
                }
            }
        }
    };
}]);