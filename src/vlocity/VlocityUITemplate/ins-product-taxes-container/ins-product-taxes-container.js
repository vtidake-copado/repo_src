vlocity.cardframework.registerModule.controller('insProductTaxesContainerController', ['$scope', '$rootScope', '$timeout', 'dataService', 'insTaxesService', 'InsQuoteModalService', 'userProfileService', function (
    $scope, $rootScope, $timeout, dataService, insTaxesService, InsQuoteModalService, userProfileService) {
    'use strict';
    $rootScope.config = {
        show: true,
        taxAndFee: null
    };
    $scope.customLabels = {};
    $rootScope.isLoaded = true;
    $rootScope.notification = {};
    $rootScope.notification.active = false;

    const translationKeys = ['New', 'Add', 'Close', 'InsAddTaxesAndFees', 'Info', 'InsProductAddItemsSuccess', 'InsProductEnterMax', 'InsProductEnterMin', 'InsProductEnterStartValue', 'InsProductDeletedSuccessfully', 'InsProductNoItemsAssociated', 'InsProductSearch', 'InsProductSuccessfullyUpdated', 'Select','Update'];

    userProfileService.getUserProfile().then(function(user){
        let userLanguage = user.language.replace("_", "-") || user.language;
        dataService.fetchCustomLabels(translationKeys, userLanguage).then(
            function (translatedLabels) {
                $scope.customLabels = translatedLabels;
            }
        );
    })


    /*
    * Delete item from list
    */
    $scope.deleteItem = function () {
        $rootScope.isLoaded = false;
        const inputMap = {
            'productTaxAndFeeIds' : [$rootScope.config.taxAndFee.Id]
        };
        const optionsMap = {};
        const index = $scope.records.productTaxesAndFees.indexOf($rootScope.config.taxAndFee);
        let removedTaxAndFee = $rootScope.config.taxAndFee;
        $scope.records.productTaxesAndFees.splice(index, 1); 
        $rootScope.config.taxAndFee = $scope.records.productTaxesAndFees[index];
        if($scope.modalTaxesAndFees){ //if modal has records, add to records avaliable 
            removedTaxAndFee[$rootScope.nsPrefix + 'PriceListId__c'] = removedTaxAndFee.Id;
            removedTaxAndFee.isSelected = false; //set selected flag to false
            $scope.modalTaxesAndFees.taxesAndFees.push(removedTaxAndFee);
        }

        insTaxesService.invokeRemoteMethod($scope, 'InsuranceProductAdminHandler', 'deleteProductTaxesAndFees', inputMap, $scope.customLabels.InsProductDeletedSuccessfully, optionsMap).then(
            function () {
                var message = {
                    event: 'reload'
                };
                $rootScope.$broadcast('vlocity.layout.ins-product-taxes-container.events', message);
                $rootScope.isLoaded = true;
            },
            function (error) {
                $rootScope.isLoaded = true;
                console.error(error);
                deferred.reject(error);
            }
        );
    }

    /*
    * Update item from list
    */
    $scope.updateItem = function () {
        $rootScope.isLoaded = false;
        const inputMap = {
            'productTaxOrFee' : $rootScope.config.taxAndFee
        };
        const optionsMap = {};
        insTaxesService.invokeRemoteMethod($scope, 'InsuranceProductAdminHandler', 'updateProductTaxOrFee', inputMap, $scope.customLabels.InsProductSuccessfullyUpdated + ' ' + $rootScope.config.taxAndFee.Name, optionsMap).then(
            function () {
               $rootScope.isLoaded = true;
            }
        );
    };

    /* 
    * Update records in list view with new associated terms 
    * @param {Object} event
    * @param {Object} data
    */
    $rootScope.$on('via-ins-add-items', function(event, data){
        $scope.records.productTaxesAndFees = $scope.records.productTaxesAndFees.concat(data.data);
        $rootScope.config.taxAndFee = data.data[0];
        for(let i = 0; i < data.data.length; i++){
            let item = data.data[i];
            const index = $scope.modalTaxesAndFees.taxesAndFees.indexOf(item);
            $scope.modalTaxesAndFees.taxesAndFees.splice(index, 1);
        }
    });

    /* 
    * Set order term
    * @param {String} orderTerm
    */
    $scope.setOrderTerm = function (orderTerm) {
        if ($rootScope.orderTerm !== orderTerm) {
            $rootScope.orderAsc = true;
            $rootScope.orderTerm = orderTerm;
        } else {
            $rootScope.orderAsc = !$rootScope.orderAsc;
        }
    };

    /* 
    * Set scope
    * @param {Id} productId
    * @param {Array} records
    */
    $scope.initData = function (productId, records) {
        $scope.productId = productId;
        $scope.records = records;
    };

    /* 
    * Launch Add Taxes And Fees Modal
    */
    $scope.launchAddModal = function () {
        if (!$scope.modalTaxesAndFees) {
            const inputMap = {
                'productId': $scope.productId
            };
            const optionsMap = {};
            insTaxesService.launchModal($scope, 'InsuranceProductAdminHandler', 'getTaxesAndFees', inputMap, null, optionsMap).then(
                function () {
                    $scope.modalTaxesAndFees.title = $scope.customLabels.InsAddTaxesAndFees;
                    $scope.modalTaxesAndFees.customLabels = $scope.customLabels;
                    InsQuoteModalService.launchModal(
                        $scope,
                        'ins-product-taxes-modal',
                        $scope.modalTaxesAndFees,
                        '',
                        'ins-product-taxes-modal'
                    );
                },
                function (error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                });
        } else {
            InsQuoteModalService.launchModal(
                $scope,
                'ins-product-taxes-modal',
                $scope.modalTaxesAndFees,
                '',
                'ins-product-taxes-modal'
            );
        }
    }
}]);

vlocity.cardframework.registerModule.factory('insTaxesService', ['$http', 'dataSourceService', 'dataService', '$q', '$rootScope', 'InsValidationHandlerService', '$timeout', function ($http, dataSourceService, dataService, $q, $rootScope, InsValidationHandlerService, $timeout) {
    'use strict';
    let REMOTE_CLASS = 'InsurancePCRuntimeHandler';
    let DUAL_DATASOURCE_NAME = 'Dual';

    function getDualDataSourceObj(actionObj) {
        let datasource = {};
        let temp = '';
        let nsPrefix = fileNsPrefix().replace('__', '');

        if (actionObj.remote && actionObj.remote.remoteClass) {
            temp = REMOTE_CLASS;
            REMOTE_CLASS = actionObj.remote.remoteClass;
        }
        if (actionObj) {
            datasource.type = DUAL_DATASOURCE_NAME;
            datasource.value = {};
            datasource.value.remoteNSPrefix = nsPrefix;
            datasource.value.inputMap = actionObj.remote.params || {};
            datasource.value.remoteClass = REMOTE_CLASS;
            datasource.value.remoteMethod = actionObj.remote.params.methodName;
            datasource.value.endpoint = actionObj.rest.link;
            datasource.value.methodType = actionObj.rest.method;
            datasource.value.body = actionObj.rest.params;
        } else {
            console.log('Error encountered while trying to read the actionObject');
        }
        if (temp) {
            REMOTE_CLASS = temp;
        }
        return datasource;
    }

    return {
        invokeRemoteMethod: function (scope, remoteClass, remoteMethod, inputMap, message, optionsMap, isRefresh) {
            let deferred = $q.defer();
            let nsPrefix = fileNsPrefix().replace('__', '');
            let datasource = {};
            console.log('Calling:', remoteMethod);
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
                    if (message) {
                        $rootScope.notification.active = true;
                        $rootScope.notification.type = 'success';
                        $rootScope.notification.message = message;
                        $timeout(function () {
                            $rootScope.notification.active = false;
                        }, 2000);
                    }
                },
                function (error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        },
        launchModal: function (scope, remoteClass, remoteMethod, inputMap, message, optionsMap, isRefresh) {
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
                    scope.modalTaxesAndFees = data;
                },
                function (error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                    refreshList();
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        },
        /**Action : Use this method when the actions are straight forward based on actionObj.
         * @param {object} actionObj [Pass the action object]
         * @param {promise} [Result data]
         */
        invokeAction: function (actionObj, scope) {
            console.log(actionObj);
            let deferred = $q.defer();
            let datasource = getDualDataSourceObj(actionObj);
            dataSourceService.getData(datasource, null, null).then(
                function (data) {
                    console.log(data);
                    deferred.resolve(data);
                    $rootScope.isLoaded = true;
                },
                function (error) {
                    deferred.reject(error);
                    console.log(error);
                    InsValidationHandlerService.throwError(error);
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