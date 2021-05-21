vlocity.cardframework.registerModule.controller('vellaSwipeController', ['$scope', '$rootScope', '$ionicHistory', '$state', 'vellaSwipeService', function($scope, $rootScope, $ionicHistory, $state, vellaSwipeService) {
    'use strict';
    function getAge(dob) {
        var birthday = new Date(dob);
        var ageDifMs = Date.now() - birthday.getTime();
        var ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    $scope.init = function(obj, records) {
        console.log('swipe obj', obj);
        $scope.currentType = $state.params.type;
        if (obj) {
            if (!$rootScope.insurableItemCount) {
                $rootScope.insurableItemCount = 0;
                if (records) {
                    $rootScope.cardData.Count = records.length;
                }
            }
            if (obj.Name.fieldValue) {
                $rootScope.cardData.insuredItem = true;
                if (records) {
                    $rootScope.cardData.insuredItemCount = records.length;
                }
            } else {
                $rootScope.cardData.insuredItem = false;
            }
            $scope.insurableItem = {
                Name: obj.Name.fieldValue || obj.Name,
                Price: obj.Price,
                SpecName: obj[$rootScope.nsPrefix + 'SpecProductName__c'],
                Value: null,
                Breed: null,
                Dob: null
            };
            angular.forEach(obj.attributeCategories.records, function(attrCat, i) {
                if (attrCat.productAttributes && attrCat.productAttributes.records) {
                    angular.forEach(attrCat.productAttributes.records, function(prodAttr, j) {
                        if (prodAttr.code === 'petBreed') {
                            $scope.insurableItem.Breed = prodAttr.userValues;
                        }
                        if (prodAttr.code === 'valueValue') {
                            $scope.insurableItem.Value = prodAttr.userValues;
                        }
                        if (prodAttr.code === 'petBirthdate') {
                            $scope.insurableItem.Dob = prodAttr.userValues;
                            $scope.insurableItem.Age = getAge($scope.insurableItem.Dob);
                        }
                    });
                }
            });
            console.log('$scope.insurableItem', $scope.insurableItem);
            $rootScope.insurableItemCount++;
            if ($rootScope.cardData.Count === $rootScope.insurableItemCount) {
                $rootScope.isLoaded = true;
                $rootScope.insurableItemCount = undefined;
            }
        }
    };

    $scope.createInsuredItemFromUnbound = function(item) {
        var methodName;
        $rootScope.isLoaded = false;
        if ($state.params.type === 'Policy') {
            vellaSwipeService.createInsuredItemFromUnbound($scope, item.Id, $state.params.objectId).then(function(result) {
                console.log('createInsuredItemFromUnbound result:', result);
                $rootScope.$broadcast('reloadLayout', 'vella-policy', true);
            }, function(error) {
                console.log('createInsuredItemFromUnbound error:', error);
                $rootScope.isLoaded = true;
            });
        } else if ($state.params.type === 'Insurable') {
            methodName = $scope.insurableItem.SpecName === 'Pet' ? 'VellaUnboundPet_CreateUpdatePolicy' : 'VellaUnboundValuable_CreateUpdatePolicy';
            vellaSwipeService.createPolicyFromInsurable($scope, item.Id, methodName).then(function(result) {
                console.log('createPolicyFromInsurable result:', result);
                $rootScope.cardData.showSwipe = $scope.insurableItem.SpecName;
                $rootScope.skipInsurableLayout = true;
                // $rootScope.$broadcast('reloadLayout', 'vella-insurable', true);
                $state.go('app.univ', {type: 'Policy', objectId: result.IPResult.policyId});
            }, function(error) {
                console.log('createPolicyFromInsurable error:', error);
                $rootScope.isLoaded = true;
            });
        }
    };

    $scope.deleteInsuredItem = function(item) {
        $rootScope.isLoaded = false;
        vellaSwipeService.deleteInsuredItem($scope, item.Id.fieldValue).then(function(result) {
            console.log('deleteInsuredItem result:', result);
            $ionicHistory.clearCache();
            if ($rootScope.cardData.insuredItemCount === 1) {
                $rootScope.cardData.insuredItemCount = 0;
            }
            if (result.IPResult.NewPrice) {
                $rootScope.$broadcast('reloadLayout', 'vella-policy', true);
            } else {
                $state.go('app.univ', {type: 'Home'});
            }
        }, function(error) {
            console.log('deleteInsuredItem error:', error);
            $rootScope.isLoaded = true;
        });
    };

    $scope.filterCard = function(obj) {
        if (obj[$rootScope.nsPrefix + 'ProductName__c']) {
            if ($rootScope.cardData.SpecName === obj[$rootScope.nsPrefix + 'ProductName__c']) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    };

    $scope.onSwipe = function(event) {
        console.log('swiped right', event);
    };
}]);
vlocity.cardframework.registerModule.factory('vellaSwipeService', ['$rootScope', '$q', 'dataSourceService', function($rootScope, $q, dataSourceService) {
    'use strict';
    return {
        createPolicyFromInsurable: function(scope, itemId, methodName) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'ApexRemote';
            datasource.value = {
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: 'IntegrationProcedureService',
                remoteMethod: methodName,
                inputMap: {
                    ItemId: itemId
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
        },
        createInsuredItemFromUnbound: function(scope, itemId, assetId) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'ApexRemote';
            datasource.value = {
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: 'IntegrationProcedureService',
                remoteMethod: 'VellaValuable_CreateInsuredItemFromUnbound',
                inputMap: {
                    ItemId: itemId,
                    PolicyId: assetId
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
        },
        deleteInsuredItem: function(scope, itemId) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'ApexRemote';
            datasource.value = {
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: 'IntegrationProcedureService',
                remoteMethod: 'VellaValuable_DeleteInsuredItem',
                inputMap: {
                    InsuredItemId: itemId
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