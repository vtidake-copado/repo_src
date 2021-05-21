vlocity.cardframework.registerModule.controller('insProductTaxesModalController',
    ['$scope', '$rootScope', 'insTaxesModalService', '$timeout', function (
        $scope, $rootScope, insTaxesModalService, $timeout) {
        'use strict';
        /*
        * Method that calls remote method to associate selected taxAndFee with product
        * @param {Array} taxesAndFees list of all taxes and fees
        * @param {Id} productId
        */
        $scope.associateTaxesToProduct = function (taxesAndFees, productId) {
            let remoteClass = 'InsuranceProductAdminHandler';
            let remoteMethod = 'associateTaxesAndFees';
            let inputMap = { 'relationships': [] };
            let optionsMap = {};
            for (let i = 0; i < taxesAndFees.length; i++) {
                if (taxesAndFees[i].isSelected) {
                    let obj = {};
                    obj.productId = productId;
                    obj.taxAndFee = taxesAndFees[i];
                    inputMap.relationships.push(obj);
                }
            }
            if (inputMap.relationships.length) {
                $rootScope.isLoaded = false;
                insTaxesModalService.invokeRemoteMethod($scope, remoteClass, remoteMethod, inputMap, $scope.records.customLabels.InsProductAddItemsSuccess, optionsMap);
            }
            $scope.closeModal();
        }

        /*
        * Call method to close the modal after select
        */
        $scope.closeModal = function(){
            $timeout(function() {
                let modalBtn =  angular.element('.slds-modal__close')[0];
                modalBtn.click();
            })
        }


        /*
        * Navigate to price list
        */
        $scope.navigateTo = function() {
            console.log('navigate');
            if ((typeof sforce !== 'undefined') && (sforce !== null)) {
                sforce.one.createRecord($rootScope.nsPrefix + 'PriceList__c');
            } else {
                window.location.href = '/' + $rootScope.nsPrefix + 'PriceList__c';
            }
        };
    }]);


vlocity.cardframework.registerModule.factory('insTaxesModalService', ['$http', 'dataSourceService', 'dataService', '$q', '$rootScope', 'InsValidationHandlerService', '$timeout', function ($http, dataSourceService, dataService, $q, $rootScope, InsValidationHandlerService, $timeout) {
    'use strict';
    let refreshList = function (data) {
        var message = {
            'event': 'concat',
            'data': data
        };
        $rootScope.$broadcast('via-ins-add-items', message);
    };

    return {
        invokeRemoteMethod: function (scope, remoteClass, remoteMethod, inputMap, message, optionsMap) {
            let deferred = $q.defer();
            let nsPrefix = fileNsPrefix().replace('__', '');
            let datasource = {};
            console.log('Calling: ', remoteMethod);
            datasource.type = 'Dual';
            datasource.value = {};
            datasource.value.remoteNSPrefix = nsPrefix;
            datasource.value.remoteClass = remoteClass;
            datasource.value.remoteMethod = remoteMethod;
            datasource.value.inputMap = inputMap;
            datasource.value.optionsMap = optionsMap;
            datasource.value.apexRemoteResultVar = 'result.records';
            datasource.value.methodType = 'GET';
            datasource.value.endpoint = '/services/apexrest/' + nsPrefix + '/v2/campaigns/';
            datasource.value.apexRestResultVar = 'result.records';

            // no need to pass forceTk client below because on desktop, dual datasource will use ApexRemote
            // and on Mobile Hybrid Ionic, dual datasource will use ApexRest via forceng
            console.log('datasource', datasource);
            dataSourceService.getData(datasource, scope, null).then(
                function (data) {
                    console.log(data);
                    deferred.resolve(data);
                    $rootScope.notification.active = true;
                    $rootScope.notification.type = 'success';
                    $rootScope.notification.message = message;
                    let newAssociations = [];
                    for (let i = 0; i < inputMap.relationships.length; i++) {
                        let taxAndFee = inputMap.relationships[i].taxAndFee;
                        taxAndFee.Id = data.result[i];
                        newAssociations.push(taxAndFee);
                    }
                    refreshList(newAssociations);
                    $timeout(function () {
                        $rootScope.notification.active = false;
                    }, 2000);
                },
                function (error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                    refreshList();
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        }
    };
}]);

vlocity.cardframework.registerModule.factory('InsValidationHandlerService', ['$rootScope', '$sldsModal', '$timeout', function ($rootScope, $sldsModal, $timeout) {
    'use strict';
    return {
        throwError: function (error) {
            let statusCode = '';
            let errorMsgTitle = 'There has been an Error';
            if ($rootScope.vlocity.customLabels && $rootScope.vlocity.customLabels.INSProdSelectErrorTitle && $rootScope.vlocity.customLabels.INSProdSelectErrorTitle[$rootScope.vlocity.userLanguage]) {
                errorMsgTitle = $rootScope.vlocity.customLabels.INSProdSelectErrorTitle[$rootScope.vlocity.userLanguage];
            }
            if (!error.message) {
                error.message = 'No error message.';
            }
            if (error.statusCode) {
                statusCode = '(' + error.statusCode + '): ';
            }
            if (typeof error.type === 'string') {
                error.type = error.type.charAt(0).toUpperCase() + this.slice(1) + ' ';
            } else {
                error.type = '';
            }
            if (error.message.indexOf('Logged in?') > -1) {
                error.message = 'You have been logged out of Salesforce. Please back up any changes to your document and refresh your browser window to login again.';
                error.type = '';
                statusCode = '';
            }
            $rootScope.notification.active = true;
            $rootScope.notification.type = 'error';
            $rootScope.notification.message = error.type + statusCode + error.message;
            $timeout(function () {
                $rootScope.isLoaded = true;
            }, 500);
        }
    };
}]);