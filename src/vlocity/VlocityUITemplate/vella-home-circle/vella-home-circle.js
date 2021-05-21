vlocity.cardframework.registerModule.controller('vellaHomeCircleController', ['$scope', '$rootScope', '$state', 'vellaHomeCircleService', function($scope, $rootScope, $state, vellaHomeCircleService) {
    'use strict';
    function parseImageResponse(img) {
        var imgParts, url;
        if (!img) {
            return '';
        } else {
            imgParts = img.split('"');
            angular.forEach(imgParts, function(part, i) {
                if (part.indexOf('http') > -1) {
                    url = part.replace(/&amp;/g, '&');
                }
            });
            return url;
        }
    }

    function makeInsurableName(items) {
        var insurableName;
        angular.forEach(items, function(item, i) {
            if (i === 0) {
                insurableName = item.ItemName;
                if (items.length > 1) {
                    insurableName += ' and ';
                }
            } else if (i === 1) {
                insurableName += item.ItemName;
            } else if (i === 2) {
                insurableName += ' + ' + (items.length - 2) + ' more';
                return insurableName;
            }
        });
        return insurableName;
    }

    function combineItems(items) {
        var returnArray = [];
        var tempObj = {};
        var divideObj = {};
        angular.forEach(items, function(item, i) {
            if (!divideObj[item.SpecId]) {
                divideObj[item.SpecId] = [];
                divideObj[item.SpecId].push(item);
            } else {
                divideObj[item.SpecId].push(item);
            }
        });
        console.log('divideObj', divideObj);
        // Loop through division obj and create final array
        angular.forEach(divideObj, function(obj, i) {
            tempObj = {};
            tempObj.Name = makeInsurableName(obj);
            tempObj.Image = $rootScope.instanceUrl + '/servlet/servlet.FileDownload?file=' + obj[0].SpecImageId;
            tempObj.Description = obj[0].SpecDescription;
            tempObj.SpecName = obj[0].SpecName;
            tempObj.Count = obj.length;
            returnArray.push(tempObj);
        });
        return returnArray;
    }

    function getItemIds(SpecName) {
        var returnStr = '';
        angular.forEach($scope.circleObj.Item, function(item, i) {
            if (item.SpecName === SpecName) {
                if (returnStr.length) {
                    returnStr = returnStr + ',' + item.ItemId;
                } else {
                    returnStr = item.ItemId;
                }
            }
        });
        // return angular.toJson(returnArray);
        return returnStr;
    }

    $rootScope.vlocityMobileNotificationSensor = {
        active: false,
        message: ''
    };
    if (localStorage.vlocityMobileNotificationSensor) {
        $rootScope.vlocityMobileNotificationSensor = angular.fromJson(localStorage.getItem('vlocityMobileNotificationSensor'));
        console.log('after retrieval from localStorage:', $rootScope.vlocityMobileNotificationSensor);
    }
    $rootScope.$on('VlocityMobileNotification', function(event, data) {
        console.log('VlocityMobileNotification', event, data);
        if ($scope.circleObj[$rootScope.nsPrefix + 'Type__c'] === 'Renters' || $scope.circleObj[$rootScope.nsPrefix + 'Type__c'] === 'Property' || $scope.circleObj[$rootScope.nsPrefix + 'Type__c'] === 'Homeowners') {
            $rootScope.vlocityMobileNotificationSensor.active = true;
            $rootScope.vlocityMobileNotificationSensor.message = data.message;
            if (localStorage) {
                localStorage.setItem('vlocityMobileNotificationSensor', angular.toJson($rootScope.vlocityMobileNotificationSensor));
            }
            $scope.$apply();
        }
    });

    $scope.getObj = function(obj) {
        var items;
        console.log('in getObj', obj);
        $scope.circleObj = obj;
        if ($scope.circleObj.Item) {
            $scope.circleObj.items = combineItems($scope.circleObj.Item);
            console.log('$scope.circleObj.items', $scope.circleObj.items);
            $scope.circleObj.mobileType = 'Insurable';
        } else if ($scope.circleObj.AccountId && $scope.circleObj.Type && $scope.circleObj.Type !== 'Device') {
            if (!$rootScope.accountId) {
                $rootScope.accountId = $scope.circleObj.AccountId;
            }
            if (!$rootScope.accountName) {
                $rootScope.accountName = $scope.circleObj.AccountName;
                $rootScope.accountFirstName = $rootScope.accountName.split(' ')[0];
                $rootScope.accountLastName = $rootScope.accountName.split(' ')[1];
            }
            $scope.circleObj.mobileType = 'Policy';
            vellaHomeCircleService.getImage($scope, $scope.circleObj.AssetId).then(function(result) {
                if (result.length && result[0][$rootScope.nsPrefix + 'Image__c']) {
                    $scope.imageUrl = parseImageResponse(result[0][$rootScope.nsPrefix + 'Image__c']);
                    console.log($scope.imageUrl);
                } else {
                    vellaHomeCircleService.getImageFromProduct2($scope, $scope.circleObj.Product2Id).then(function(result2) {
                        if (result2.length) {
                            $scope.imageUrl = $rootScope.instanceUrl + '/servlet/servlet.FileDownload?file=' + result2[0].Id;
                            console.log($scope.imageUrl);
                        } else {
                            $scope.imageUrl = '';
                        }
                    }, function(error) {
                        $rootScope.vellaNotificationService.throwNotification(error);
                    });
                }
                $rootScope.isLoaded = true;
            }, function(error) {
                $rootScope.vellaNotificationService.throwNotification(error);
            });
        }
    };
    $scope.goToItem = function(layoutType, item, imageUrl) {
        $rootScope.isLoaded = false;
        console.log('goToItem', layoutType, item);
        $rootScope.cardData = {};
        if (layoutType === 'Insurable') {
            $rootScope.cardData.imageUrl = item.Image;
            $rootScope.cardData.Image = imageUrl;
            $rootScope.cardData.Name = item.Name;
            $rootScope.cardData.Description = item.Description;
            $rootScope.cardData.SpecName = item.SpecName;
            $rootScope.cardData.Count = item.Count;
            $rootScope.cardData.InsurablePage = true;
            $rootScope.ItemIds = getItemIds(item.SpecName);
            // STATIC FOR DEMO:
            if (item.SpecName === 'Pet') {
                $rootScope.rootProductCode = 'PET-INJ-ILL';
            } else if (item.SpecName === 'Valuable') {
                $rootScope.rootProductCode = 'Valuables';
            } else if (item.SpecName === 'Auto') {
                $rootScope.rootProductCode = 'autoComm';
            }
            console.log('$rootScope.ItemIds', $rootScope.ItemIds);
        } else {
            $rootScope.cardData.Type = item.Type;
            $rootScope.cardData.Image = imageUrl;
            if (item.Product2Id) {
                $rootScope.cardData.SpecCode = item.ProductCode;
                $rootScope.cardData.SpecName = item.ProductName;
                if (item.ProductCode && item.ProductCode.toLowerCase().indexOf('pet') > -1) {
                    $rootScope.cardData.showSwipe = 'Pet';
                } else if (item.ProductCode && item.ProductCode.toLowerCase().indexOf('valuable') > -1) {
                    $rootScope.cardData.showSwipe = 'Valuable';
                } else if (item.ProductCode && item.ProductCode.toLowerCase().indexOf('auto') > -1) {
                    $rootScope.cardData.showSwipe = 'Auto';
                } else {
                    $rootScope.cardData.showSwipe = false;
                }
                if (item.ProductCode && item.ProductCode.toLowerCase().indexOf('auto') > -1) {
                    $rootScope.cardData.autoUsage = 'Auto';
                } else {
                    $rootScope.cardData.autoUsage = false;
                }
            }
        }
        console.log('$rootScope.cardData', $rootScope.cardData);
        $state.go('app.univ', {type: layoutType, objectId: $scope.circleObj.AssetId});
    };
}]);
vlocity.cardframework.registerModule.factory('vellaHomeCircleService', ['$rootScope', '$q', 'dataSourceService', function($rootScope, $q, dataSourceService) {
    'use strict';
    return {
        getImage: function(scope, assetId) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'Query';
            datasource.value = {
                query: 'SELECT ' + $rootScope.nsPrefix + 'Image__c FROM ' + $rootScope.nsPrefix + 'AssetInsuredItem__c WHERE ' + $rootScope.nsPrefix + 'PolicyAssetId__c = \'' + assetId + '\'',
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: '',
                remoteMethod: '',
                inputMap: {}
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
        getImageFromProduct2: function(scope, product2Id) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'Query';
            datasource.value = {
                query: 'SELECT Id FROM Attachment WHERE ParentId = \'' + product2Id + '\' AND Name like \'prodImage_%\' AND ContentType like \'image%\'',
                remoteNSPrefix: $rootScope.nsPrefix,
                remoteClass: '',
                remoteMethod: '',
                inputMap: {}
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