vlocity.cardframework.registerModule.controller('vellaPolicyCoveragesController', ['$scope', '$rootScope', 'vellaPolicyCoveragesService', function($scope, $rootScope, vellaPolicyCoveragesService) {
    'use strict';
    $scope.getCoveragesDetails = function(obj) {
        if (!$rootScope.vellaPolicyCoveragesDefaultImg) {
            vellaPolicyCoveragesService.getDefaultCoverageImg($scope).then(function(result) {
                $rootScope.vellaPolicyCoveragesDefaultImg = result[0].Id;
                $rootScope.coverages = vellaPolicyCoveragesService.formatCoverageData(obj);
                console.log('$rootScope.coverages', $rootScope.coverages, 'default img Id', $rootScope.vellaPolicyCoveragesDefaultImg);
            }, function(error) {
                console.log('error retrieving default coverage image', error);
            });
        } else {
            $rootScope.coverages = vellaPolicyCoveragesService.formatCoverageData(obj);
            console.log('$rootScope.coverages', $rootScope.coverages);
        }
        if (!$rootScope.cardData.showSwipe) {
            $rootScope.isLoaded = true;
        }
    };
}]);
vlocity.cardframework.registerModule.factory('vellaPolicyCoveragesService', ['$rootScope', '$q', 'dataSourceService', function($rootScope, $q, dataSourceService) {
    'use strict';
    function createCoverageMap(coverage) {
        var coveragesMap = {};
        coveragesMap.name = coverage.Name;
        if (coverage.ImageId) {
            coveragesMap.image = $rootScope.instanceUrl + coverage.ImageId;
        } else {
            coveragesMap.image = $rootScope.instanceUrl + '/servlet/servlet.FileDownload?file=' + $rootScope.vellaPolicyCoveragesDefaultImg;
        }
        return coveragesMap;
    }
    function getUserValuesLabel(values, userValues) {
        var i, label;
        for (i = 0; i < values.length; i++) {
            if (values[i].value && values[i].value === userValues) {
                label = values[i].label;
            } else {
                label = userValues;
            }
        }
        return label;
    }
    return {
        getDefaultCoverageImg: function(scope) {
            var deferred = $q.defer();
            var datasource = {};
            datasource.type = 'Query';
            datasource.value = {
                query: 'SELECT Id FROM Document where developerName=\'prodImage_vella_default_png\'',
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
        formatCoverageData: function(coverages) {
            var formattedCoverages = {
                coveragesMap: [],
                optionalCoveragesMap: [],
                coverageAmounts: []
            };
            var i, j, k, attrCats, prodAttrs, tempCoverageAmounts;
            if (coverages && coverages.records) {
                for (i = 0; i < coverages.records.length; i++) {
                    if (!coverages.records[i].isOptional) {
                        formattedCoverages.coveragesMap = formattedCoverages.coveragesMap.concat(createCoverageMap(coverages.records[i]));
                    } else {
                        formattedCoverages.optionalCoveragesMap = formattedCoverages.optionalCoveragesMap.concat(createCoverageMap(coverages.records[i]));
                    }
                    tempCoverageAmounts = {};
                    if (coverages.records[i].attributeCategories && coverages.records[i].attributeCategories.records) {
                        attrCats = coverages.records[i].attributeCategories.records;
                        for (j = 0; j < attrCats.length; j++) {
                            prodAttrs = attrCats[j].productAttributes.records;
                            if (prodAttrs) {
                                tempCoverageAmounts.name = coverages.records[i].Name;
                                tempCoverageAmounts.value = {};
                                for (k = 0; k < prodAttrs.length; k++) {
                                    if (prodAttrs[k].code.toLowerCase().indexOf('limit') > -1) {
                                        tempCoverageAmounts.value.limit = getUserValuesLabel(prodAttrs[k].values, prodAttrs[k].userValues);
                                    }
                                    if (prodAttrs[k].code.toLowerCase().indexOf('coverage') > -1) {
                                        tempCoverageAmounts.value.coverage = getUserValuesLabel(prodAttrs[k].values, prodAttrs[k].userValues);
                                    }
                                }
                                formattedCoverages.coverageAmounts = formattedCoverages.coverageAmounts.concat(tempCoverageAmounts);
                            }
                        }
                    }
                }
            }
            return formattedCoverages;
        }
    };
}]);