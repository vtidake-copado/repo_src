vlocity.cardframework.registerModule.controller('InsCoverageModelRuntimeRowController',
    ['$scope', '$rootScope', 'InsCoverageModelRuntimeService', '$timeout', 'dataService', 'InsRulesEvaluationService', 'userProfileService', function (
        $scope, $rootScope, InsCoverageModelRuntimeService, $timeout, dataService, InsRulesEvaluationService, userProfileService) {
        'use strict';

        $scope.row = {};
        $scope.customLabels = {};
        $rootScope.isLoaded = true;
        var visualForceOrigin = window.origin;
        visualForceOrigin = visualForceOrigin.split('--');
        var lexOrigin = visualForceOrigin[0] + '.lightning.force.com';

        const translationKeys = ['Name', 'InsCoveragesPremium', 'InsButtonMore', 'InsButtonLess', 'InsButtonShowMore',
            'InsButtonShowLess', 'InsAssetInfo', 'Save', 'Selected', 'InsQuoteOptionalCoverages', 'InsCoverageNoCoverages',
            'InsProductUpdatedQuoteMessage', 'InsProductFee', 'InsProductTax', 'InsProductTotalPrice'];

        userProfileService.getUserProfile().then(function(user){
            let userLanguage = user.language.replace("_", "-") || user.language;
            dataService.fetchCustomLabels(translationKeys, userLanguage).then(
                function (translatedLabels) {
                    $scope.customLabels = translatedLabels;
                }
            );
        })

        $scope.checkFieldType = function (fieldType) {
            return fieldType === "['UnitPrice']['fieldValue']";
        };

        $scope.vlocValueRow = function (dataType) {
            return dataType.toLowerCase();
        };

        function checkLocaleFormat(locale) {
            const localeLongFormat = /^[a-z]{2}[-][a-z]{2}$/g;
            const localeShortFormat = /^[a-z]{2}$/g;
            const isLocaleFormatted = localeLongFormat.test(locale) || localeShortFormat.test(locale);
            if (!isLocaleFormatted) {
                locale = locale.match(/[a-z]{2}[-][a-z]{2}/g)[0] || locale.match(/^[a-z]{2}$/g)[0];
            }
            return locale;
        }

        $scope.formatCurrency = function (amount, currencyCode) {
            let locale = checkLocaleFormat($rootScope.vlocity.userAnLocale);
            if (amount != null) {
                if (!currencyCode) {
                    currencyCode = $rootScope.vlocity.userCurrency;
                }
                return amount.toLocaleString(locale, { style: 'currency', currency: currencyCode });
            }
        };

        $scope.setIndex = function (records) {
            let count = 0;
            if (records) {
                for (let i = 0; i < records.length; i++) {
                    if (records[i].lineRecordType === 'CoverageSpec' || records[i][$rootScope.nsPrefix + 'RecordTypeName__c'] === 'CoverageSpec') {
                        count += 1;
                        records[i].index = count;
                    }
                }
            }
            $scope.count = count - 1;
            $rootScope.count = count;
        };


        $scope.setAttr = function (row, index) {
            $rootScope.config.attr = Object.assign({}, row);
            row.selected = true;
            $rootScope.index = index;
        };


        //Listenter that executes ChangeCoverage fn after rules have been evluated
        //ensures the rules directive has run and now can invoke remote methods without procesing simulatenously with rules
        /**
         * @param {Object} e event
         * @param {Object} data containing product and attribute sent from insRules directive for changeCoverage
         */
        $rootScope.$on('fire-onsave-event', function (e, data) {
            if (!$rootScope.updating && data.product) {
                console.log('fire-onsave-event', data);
                $scope.updateQLI(data.product.action, data.attribute.userValues, data.attribute.code, data.product);
            }
        });

        /*
        * Calls action obj, if returned, else invoke remote method
        * Method also broadcasts method to adjustments component to refresh
        * @param {Object} action Action Object
        * @param {String} userValues
        * @param {String} attributeCode
        * @param {Object} product
        */
        $scope.updateQLI = function (action, value, code, productRecord) {
            $rootScope.updating = true;
            if (!productRecord.QuoteId) {
                return;
            }
            $rootScope.isLoaded = false;
            let inputMap = {}, optionsMap = {};
            if (action && action.updateChildLine) {
                inputMap = action.updateChildLine.remote.params;
            } else {
                inputMap.quoteId = productRecord.QuoteId.fieldValue;
                inputMap.quoteLineId = productRecord.Id.fieldValue;
            }
            inputMap.reprice = true;  //change value to false to turn of reprice
            inputMap.attributeValues = {};
            inputMap.attributeValues[code] = value;
            optionsMap.runRules = true;
            InsCoverageModelRuntimeService.invokeRemoteMethod($scope, $scope.quoteId, 'InsurancePCRuntimeHandler', 'updateChildLine', inputMap, optionsMap);
            var message = "ReloadAdjustments";
            parent.postMessage(message, lexOrigin);
        };


        $scope.toggleOverflow = function (event) {
            var toggleEl = $(event.currentTarget).next();
            if (toggleEl.hasClass('overflow-unset')) {
                toggleEl.removeClass('overflow-unset');
            } else {
                $timeout(function () {
                    toggleEl.addClass('overflow-unset');
                }, 400);
            }
        };

        // Only for multiselect dropdowns
        $scope.countSelected = function (attribute) {
            if (attribute.userValues && attribute.userValues.constructor === Array) {
                attribute.multiSelectCount = attribute.userValues.length;
            } else {
                attribute.userValues = [];
                attribute.multiSelectCount = 0;
            }
        };

        // Only for multiselect dropdowns
        $scope.toggleValue = function (attribute, value, ruleSetValue, record) {
            if (ruleSetValue) {
                return;
            }
            if (attribute.userValues && attribute.userValues.constructor === Array && attribute.userValues[0] && attribute.userValues[0].constructor === Object) {
                angular.forEach(attribute.userValues, function (userValue, i) {
                    angular.forEach(userValue, function (userValueObj, key) {
                        if (key === value.value) {
                            attribute.userValues[i][value.value] = userValueObj;
                        }
                    });
                });
            } else {
                if(Array.isArray(attribute.userValues)) {
                    if (attribute.userValues.indexOf(value.value) > -1) {
                        attribute.userValues.splice(attribute.userValues.indexOf(value.value), 1);
                    } else {
                        attribute.userValues.push(value.value);
                    }
                }
                $scope.countSelected(attribute);
            }
            InsRulesEvaluationService.invokeAttributeRules(attribute, record); //manually invokes rules

        };

        $scope.removeQLI = function (record) {
            $rootScope.isLoaded = false;
            var inputMap = {
                quoteLineId: record.Id.fieldValue,
                itemRecordType: 'CoverageSpec',
                minCount: 1
            };
            const optionsMap = {
                reprice: true //change to reprice false to turn off reprice
            };
            if (!record.hasOwnProperty('Price') && record.UnitPrice) { //when removing qli check to make sure price node is populated
                record.Price = record.UnitPrice.fieldValue;
            }
            InsCoverageModelRuntimeService.invokeRemoteMethod($scope, $scope.quoteId, 'InsurancePCRuntimeHandler', 'deleteChildLine', inputMap, optionsMap);
            record.productId = record.Product2Id.fieldValue;
            var message = "ReloadAdjustments";
            parent.postMessage(message, lexOrigin);
            $timeout(function () {
                if (!record.isGrandChild) {
                    $rootScope.optionalCoverages.push(record);
                }
            });
        };

        $scope.addCoverage = function (coverage, index) {
            $rootScope.isLoaded = false;
            let attributeMap = {};
            if (coverage.attributeCategories) {
                for (let i = 0; i < coverage.attributeCategories.records.length; i++) {
                    let category = coverage.attributeCategories.records[i];
                    for (let j = 0; j < category.productAttributes.records.length; j++) {
                        let attr = category.productAttributes.records[j];
                        if (attr.userValues && attr.userValues.value) {
                            attributeMap[attr.code] = attr.userValues.value;
                        } else {
                            attributeMap[attr.code] = attr.userValues;
                        }
                    }
                }
            }
            const inputMap = {
                quoteId: $scope.quoteId,
                prodRecordType: 'CoverageSpec',
                productId: coverage.productId,
                attributeValues: attributeMap
            };
            if (coverage[$rootScope.nsPrefix + 'SubParentItemId__c']) {
                inputMap.subParentId = coverage[$rootScope.nsPrefix + 'SubParentItemId__c'].fieldValue;
            }
            const optionsMap = {
                reprice: true //change to reprice : false to turn off reprice.
            }
            const message = "ReloadAdjustments";
            parent.postMessage(message, lexOrigin);
            InsCoverageModelRuntimeService.invokeRemoteMethod($scope, $scope.quoteId, 'InsurancePCRuntimeHandler', 'addChildLine', inputMap, optionsMap);
            $rootScope.optionalCoverages.splice(index, 1);
        };

        $scope.addRemoveQLI = function (record) {
            if (record.isSelected) {
                $scope.addCoverage(record);
            } else {
                $scope.removeQLI(record);
            }
        };


        /* Get Optional Coverages
         * @param {Object} record Records to get optional coverage
         */
        $scope.getOptionalCoverages = function (records) {
            $rootScope.optionalCoverages = [];
            if (records && records.childProducts) {
                if (records.childProducts.records) {
                    for (var i = 0; i < records.childProducts.records.length; i++) {
                        if (records.childProducts.records[i].isOptional && !records.childProducts.records[i].isSelected &&
                            records.childProducts.records[i][$rootScope.nsPrefix + 'RecordTypeName__c'] === 'CoverageSpec') {
                            $rootScope.optionalCoverages.push(records.childProducts.records[i]);
                        }
                    }
                }
            }
        };


    }]);

vlocity.cardframework.registerModule.factory('InsCoverageModelRuntimeService', ['dataSourceService', '$q', '$timeout', '$rootScope', 'InsValidationHandlerService', 'dataService', 'userProfileService', function (dataSourceService, $q, $timeout, $rootScope, InsValidationHandlerService, dataService, userProfileService) {
    'use strict';
    var REMOTE_CLASS = 'InsurancePCRuntimeHandler';
    var DUAL_DATASOURCE_NAME = 'Dual';
    var insideOrg = false;
    var errorContainer = {};

    const translationKeys = ['InsProductUpdatedQuoteMessage'];
    let customLabels = {};

    userProfileService.getUserProfile().then(function(user){
        let userLanguage = user.language.replace("_", "-") || user.language;
        dataService.fetchCustomLabels(translationKeys, userLanguage).then(
            function (translatedLabels) {
                customLabels = translatedLabels;
            }
        )
    });

    var refreshList = function (skipBroadcast) {
        var message = {
            event: 'reload'
        };
        if (!skipBroadcast) {
            $rootScope.$broadcast('vlocity.layout.ins-quote-coverages.events', message);
        }
        $timeout(function () {
            $rootScope.notification.type = 'success';
            $rootScope.notification.active = true;
            $rootScope.notification.message = $rootScope.vlocity.getCustomLabel('InsProductUpdatedQuoteMessage') || 'Successfully updated quote';
            if (skipBroadcast) {
                $rootScope.isLoaded = true;
            }
            $timeout(function () {
                $rootScope.notification.active = false;
            }, 1500);
        }, 1500);
    };

    function getDualDataSourceObj(actionObj) {
        var datasource = {};
        var temp = '';
        var nsPrefix = fileNsPrefix().replace('__', '');

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
        invokeRemoteMethod: function (scope, quoteId, remoteClass, remoteMethod, inputMap, optionsMap) {
            var deferred = $q.defer();
            var nsPrefix = fileNsPrefix().replace('__', '');
            var datasource = {};
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
            datasource.value.endpoint = '/services/apexrest/' + nsPrefix + '/v2/campaigns/' + quoteId;
            datasource.value.apexRestResultVar = 'result.records';

            // no need to pass forceTk client below because on desktop, dual datasource will use ApexRemote
            // and on Mobile Hybrid Ionic, dual datasource will use ApexRest via forceng
            console.log('datasource', datasource);
            dataSourceService.getData(datasource, scope, null).then(
                function (data) {
                    console.log(data);
                    deferred.resolve(data);
                    if (remoteMethod === 'updateChildLine') {
                        refreshList(true);
                    } else {
                        refreshList();
                    } 
                    let records;
                    if(scope.records && scope.records.records){
                        records = scope.records.records[0];
                    } else {
                        records = scope.records;
                    }
                    if (data.result.calculatedPrice && records) { //replaceCalcPrice
                        if (records.Id) {
                            let key = records.Id;
                            if (records.Id.fieldValue) {
                                key = records.Id.fieldValue;
                            }
                            records.UnitPrice.fieldValue = data.result.calculatedPrice[key];
                        }
                        if (records.childProducts) {
                            for (let i = 0; i < records.childProducts.records.length; i++) {
                                let key = records.childProducts.records[i].Id;
                                if (typeof (key) === 'object') {
                                    key = key.fieldValue;
                                }
                                if (key) {
                                    records.childProducts.records[i].UnitPrice.fieldValue = data.result.calculatedPrice[key];
                                }
                                if (records.childProducts.records[i].childProducts) {
                                    for (let j = 0; j < records.childProducts.records[i].childProducts.records.length; j++) {
                                        let k = records.childProducts.records[i].childProducts.records[j].Id;
                                        if (typeof (k) === 'object') {
                                            k = k.fieldValue;
                                        }
                                        if (k) {
                                            records.childProducts.records[i].childProducts.records[j].UnitPrice.fieldValue = data.result.calculatedPrice[k];
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (data.result.calculatedTaxesAndFees && records) { //replaceTaxAndFees
                        if (records.Id) {
                            let key = records.Id;
                            if (records.Id.fieldValue) {
                                key = records.Id.fieldValue;
                            }
                            if (records[$rootScope.nsPrefix + 'TaxAmount__c']) {
                                records[$rootScope.nsPrefix + 'TaxAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[key].taxAmount;
                            }
                            if (records[$rootScope.nsPrefix + 'FeeAmount__c']) {
                                records[$rootScope.nsPrefix + 'FeeAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[key].feeAmount;
                            }
                        }
                        if (records.childProducts) {
                            for (let i = 0; i < records.childProducts.records.length; i++) {
                                let key = records.childProducts.records[i].Id;
                                if (typeof (key) === 'object') {
                                    key = key.fieldValue;
                                }
                                if (key) {
                                    let setProduct = records.childProducts.records[i];
                                    if (setProduct[$rootScope.nsPrefix + 'TaxAmount__c'] && data.result.calculatedTaxesAndFees[key]) {
                                        setProduct[$rootScope.nsPrefix + 'TaxAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[key].taxAmount;
                                    }
                                    if (setProduct[$rootScope.nsPrefix + 'FeeAmount__c'] && data.result.calculatedTaxesAndFees[key]) {
                                        setProduct[$rootScope.nsPrefix + 'FeeAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[key].feeAmount;
                                    }
                                }
                                if (records.childProducts.records[i].childProducts) {
                                    for (let j = 0; j < records.childProducts.records[i].childProducts.records.length; j++) {
                                        let k = records.childProducts.records[i].childProducts.records[j].Id;
                                        if (typeof (k) === 'object') {
                                            k = k.fieldValue;
                                        }
                                        if (k) {
                                            let setProduct = records.childProducts.records[i].childProducts.records[j];
                                            if(setProduct[$rootScope.nsPrefix + 'TaxAmount__c']) {
                                                setProduct[$rootScope.nsPrefix + 'TaxAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[k].taxAmount;
                                            }
                                            if(setProduct[$rootScope.nsPrefix + 'FeeAmount__c']) {
                                                setProduct[$rootScope.nsPrefix + 'FeeAmount__c'].fieldValue = data.result.calculatedTaxesAndFees[k].feeAmount;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    let updatedAttributes = data.result.updatedAttrs;
                    for(let rulesCode in $rootScope.backendSetValueMap){
                        $rootScope.backendSetValueMap[rulesCode] = false;
                    }
                    if (updatedAttributes) { //Replace Set Values
                        for (let rulesCode in updatedAttributes) {
                            if ($rootScope.attrsMap[rulesCode]) {
                                let value = $rootScope.attrsMap[rulesCode].userValues;
                                let valueExpression = updatedAttributes[rulesCode];
                                if (typeof value !== typeof valueExpression) { //types have to match for dropdown
                                    if (typeof value === 'number') {
                                        valueExpression = parseFloat(valueExpression);
                                    } else if (typeof value === 'string') {
                                        if (valueExpression !== null && valueExpression !== undefined) {
                                            valueExpression = valueExpression.toString();
                                        }
                                    } else if (valueExpression !== null && valueExpression !== undefined && typeof value === 'boolean') {
                                        if (valueExpression.toString().toLowerCase() === 'true' || valueExpression.toString().toLowerCase() === 'false') {
                                            valueExpression = (valueExpression.toString().toLowerCase() === 'true');
                                        } else {
                                            console.error('Attribute Rules: Cannot set non-boolean value on boolean dataType. Your ' +
                                                '"Set Value" value needs to be true or false on a checkbox boolean attribute.', value);
                                        }
                                    }
                                }
                                $rootScope.attrsMap[rulesCode].userValues = valueExpression;
                                $rootScope.attrsMap[rulesCode].ruleSetValue = true;
                                $rootScope.backendSetValueMap[rulesCode] = true;
                            }
                        }
                    }
                    for(let rulesCode in $rootScope.backendSetValueMap){
                        if(!$rootScope.backendSetValueMap[rulesCode]){
                            $rootScope.attrsMap[rulesCode].ruleSetValue = false;
                            $rootScope.attrsMap[rulesCode].readOnly = false;
                            delete $rootScope.backendSetValueMap[rulesCode];
                        }
                    }
                    $rootScope.updating = false;
                },
                function (error) {
                    console.error(error);
                    deferred.reject(error);
                    InsValidationHandlerService.throwError(error);
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        }
    };
}]);