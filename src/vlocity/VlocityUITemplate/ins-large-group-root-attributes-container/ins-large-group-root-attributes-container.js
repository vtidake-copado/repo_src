/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insQLILargeGroupController', ['$scope', '$rootScope', '$timeout', '$q', '$filter', 'insQLILargeGroupService', 'dataService', 'userProfileService', function($scope, $rootScope, $timeout, $q, $filter, insQLILargeGroupService, dataService, userProfileService) {
    'use strict';
    $rootScope.isLoaded = true;
    $scope.productRecord  = {};

    // Template initialization
    /**
     * @param {Object} params url params
     */
    $scope.insQLILargeGroupInit = function(params) {
        $rootScope.productRootId = params[$rootScope.nsPrefix + 'rootProdId'];
        $rootScope.rootLineId = params[$rootScope.nsPrefix + 'rootLineId'];
    };

    const translationKeys = ['InsQuotesExpandAll', 'InsQuotesCollapseAll', 'Update', 'Selected', 'InsButtonShowMore', 'InsProductUpdatedAttrNameMessage'];
    let customLabels = {};

    userProfileService.getUserProfile().then(function(user){
        let userLanguage = user.language.replace("_", "-") || user.language;
        dataService.fetchCustomLabels(translationKeys, userLanguage).then(
            function(translatedLabels) {
                customLabels = translatedLabels;
            }
        );
    })


    //If coverage does not return action in backend, make our own object
    /*
    * @param {String} method  - remote method
    * @param {Object} coverage - for Id
    */
    let setActionObj = function(method, product) {
        let action = {
                updateChildLine: {
                    rest: {
                        'params': {},
                        'method': method,
                        'link': null
                    }
                }
            };
        action.updateChildLine.remote = {
                params: {
                    'quoteId': product.QuoteId,
                    'reprice': false,
                    'quoteLineId': product.Id,
                    'methodName': method,
                    'attributeValues': {}
                }
            };
        return action;
    };

    //Listenter that executes updateQLI fn after rules have been evluated
    /**
    * @param {Object} e event
    * @param {Object} data containing product and attribute sent from insRules directive for updateQLI
    */
    $rootScope.$on('fire-onsave-event', function(e, data) {
        console.log('fire-onsave-event', data);
        $scope.updateQLI(data.attribute);
    });

    //Update QLI
    /**
    * @param {Object} coverage
    * @param {Object} attribute - attribute that has been changed
    */
    $scope.updateQLI = function(attribute) {
        let action = $scope.productRecord.actions;
        if (!action) {
            action = setActionObj('updateChildLine', $scope.productRecord);
        }
        action.updateChildLine.remote.params.attributeValues[attribute.code] = attribute.userValues;
        insQLILargeGroupService.invokeAction(action.updateChildLine, $scope).then(function(response) {
            const message = ($rootScope.vlocity.getCustomLabel('InsProductUpdatedAttrNameMessage') || '').replace(/\{0\}/g, $scope.productRecord.productName);
            if (response) {
                $rootScope.notification.active = true;
                $rootScope.notification.type = 'success';
                $rootScope.notification.message = message || 'updated ' + $scope.productRecord.productName + ' successfully';
                $timeout(function() {
                    $rootScope.notification.active = false;
                }, 2000);
            }
        }); //call InvokeAction instead of InvokeRemoteMethod bc it handles reprice
    };


}]);

vlocity.cardframework.registerModule.factory('insQLILargeGroupService',['$http', 'dataSourceService', 'dataService', '$q', '$rootScope', 'InsValidationHandlerService', '$timeout', function($http, dataSourceService, dataService, $q, $rootScope, InsValidationHandlerService, $timeout) {
    'use strict';
    let REMOTE_CLASS = 'InsurancePCRuntimeHandler';
    let DUAL_DATASOURCE_NAME = 'Dual';
    let insideOrg = false;
    let errorContainer = {};

    let refreshList = function(type) {
        const message = {
            event: 'reload'
        };
        $rootScope.$broadcast('vlocity.layout.ins-quote-line-items-large-group.events', message);
        $rootScope.isLoaded = true;
    };

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
        invokeRemoteMethod: function(scope, remoteClass, remoteMethod, inputMap, message, optionsMap) {
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
                function(data) {
                    console.log(data);
                    deferred.resolve(data);
                    $rootScope.notification.active = true;
                    $rootScope.notification.type = 'success';
                    $rootScope.notification.message = message;
                    $timeout(function() {
                        $rootScope.notification.active = false;
                    }, 2000);
                    refreshList();
                }, function(error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                    refreshList();
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        },
        /**Action : Use this method when the actions are straight forward based on actionObj.
        * {[object]} actionObj [Pass the action object]
        * rn {promise} [Result data]
        */
        invokeAction: function(actionObj, scope) {
            console.log(actionObj);
            let deferred = $q.defer();
            let datasource = getDualDataSourceObj(actionObj);
            dataSourceService.getData(datasource, null, null).then(
                function(data) {
                    console.log(data);
                    deferred.resolve(data);

                    $rootScope.isLoaded = true;
                }, function(error) {
                    deferred.reject(error);
                    console.log(error);
                    InsValidationHandlerService.throwError(error);
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        }
    };
}]);

vlocity.cardframework.registerModule.factory('InsValidationHandlerService', ['$rootScope', '$sldsModal', '$timeout', function($rootScope, $sldsModal, $timeout) {
    'use strict';
    return {
        throwError: function(error) {
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
            $timeout(function() {
                $rootScope.isLoaded = true;
            }, 500);
        }
    };
}]);