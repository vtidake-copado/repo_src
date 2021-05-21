vlocity.cardframework.registerModule.controller('insCoveragesOsCtrl', ['$scope', '$rootScope', '$timeout', '$controller', function($scope, $rootScope, $timeout, $controller) {
    'use strict';
    // insCoveragesCtrl is the JS Angular controller in ins-os-coverages-component which
    // is the component for coverages
    angular.extend(this, $controller('insCoveragesCtrl', {$scope: $scope}));
    $scope.customTemplates = baseCtrl.prototype.$scope.bpTree.propSetMap.elementTypeToHTMLTemplateMapping;
}]);