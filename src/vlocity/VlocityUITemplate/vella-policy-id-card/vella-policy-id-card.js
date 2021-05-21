vlocity.cardframework.registerModule.controller('vellaPolicyIdCardController', ['$scope', '$rootScope', 'vellaPolicyIdCardService', function($scope, $rootScope, vellaPolicyIdCardService) {
    'use strict';
    $scope.getInsuredItems = function() {
        vellaPolicyIdCardService.getInsuredItems($scope, $scope.params.id).then(function(result) {
            $scope.insuredItems = result;
            console.log('getInsuredItems:', $scope.insuredItems);
            $rootScope.isLoaded = true;
        }, function(error) {
            console.log('There was an error:', error);
        });
    };
}]);
vlocity.cardframework.registerModule.factory('vellaPolicyIdCardService', ['$rootScope', '$q', 'dataSourceService', 'pageService', function($rootScope, $q, dataSourceService, pageService) {
    'use strict';
    return {
        getInsuredItems: function(scope, assetId) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'ApexRemote';
            datasource.value = {
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: 'InsuranceAssetHandler',
                remoteMethod: 'getInsuredItems',
                inputMap: {
                    assetId: assetId
                }
            };
            dataSourceService.getData(datasource, scope, null).then(
                function(data) {
                    deferred.resolve(data);
                },
                function(error) {
                    console.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        }
    };
}]);