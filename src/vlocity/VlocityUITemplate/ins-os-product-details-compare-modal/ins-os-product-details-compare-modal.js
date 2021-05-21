vlocity.cardframework.registerModule.controller('insOsProductDetailsCompareModalCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
    'use strict';
    baseCtrl.prototype.$scope.insEnrollmentFlow = false;
    if (baseCtrl.prototype.$scope.bpTree.children[baseCtrl.prototype.$scope.insPsControlRef
        [baseCtrl.prototype.$scope.currentElementName].rootIndex - 1].propSetMap.remoteClass === 'EnrollmentHandler') {
        baseCtrl.prototype.$scope.insEnrollmentFlow = true;
    }

    // $scope variables
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    // Local functions
    function formatContent(products) {
        var formattedContent = {
            topRow: [],
            attributeRows: [],
            attributeIndices: {}
        };
        angular.forEach(products, function(product, productIterator) {
            formattedContent.topRow.push({
                ProductCode: product.ProductCode,
                Name: product.Name,
                Id: product.Id,
                Price: product.Price,
                disabledByRateBand: product.disabledByRateBand
            });
            if (product.attributeCategories && product.attributeCategories.records) {
                angular.forEach(product.attributeCategories.records, function(attributeCategory) {
                    if (attributeCategory.productAttributes && attributeCategory.productAttributes.records) {
                        angular.forEach(attributeCategory.productAttributes.records, function(productAttribute) {
                            if (!productAttribute.formattedValues && productAttribute.values && productAttribute.values[0].value && productAttribute.userValues && (productAttribute.multiselect || productAttribute.inputType === 'radio' || productAttribute.inputType === 'dropdown')) {
                                productAttribute.formattedValues = [];
                                let selected = [];
                                if (!productAttribute.userValues.length) { //userValues can be a single value
                                    selected.push(productAttribute.userValues);
                                }
                                for (let i = 0; i < productAttribute.userValues.length; i++) {//could have an array of Objs or an array of Strings/Integers 
                                    let value = productAttribute.userValues[i];
                                    let valueType = typeof value;
                                    if (valueType !== 'object') {
                                        selected.push(value);
                                    } else {
                                        for (let key in value) { //multiselect checkbox - get keys with true [{value1: true}, {value2: false}]
                                            if (value[key]) {
                                                selected.push(key);
                                            }
                                        }
                                    }
                                }
                                for (let i = 0; i < selected.length; i++) {
                                    for (let j = 0; j < productAttribute.values.length; j++) {
                                        if (selected[i].toString() === productAttribute.values[j].value.toString()) {
                                            productAttribute.formattedValues.push(productAttribute.values[j].label);
                                        }
                                    }
                                }
                            }
                            if(productAttribute.dataType === 'date'){
                                productAttribute.userValues = $scope.formatDate(productAttribute.userValues);
                            }
                            if(productAttribute.dataType === 'datetime'){
                                productAttribute.userValues = $scope.formatDateTime(productAttribute.userValues);
                            }
                            var attributeRowsLength;
                            if (formattedContent.attributeIndices.hasOwnProperty(productAttribute.code)) {
                                if (!formattedContent.attributeRows[formattedContent.attributeIndices[productAttribute.code]][product.ProductCode]) {
                                    formattedContent.attributeRows[formattedContent.attributeIndices[productAttribute.code]].attributeValues[productIterator] = {
                                        ProductCode: product.ProductCode,
                                        attributeCode: productAttribute.code,
                                        userValues: productAttribute.userValues,
                                        dataType: productAttribute.dataType,
                                        inputType: productAttribute.inputType, 
                                        formattedValues: productAttribute.formattedValues
                                    };
                                    formattedContent.attributeRows[formattedContent.attributeIndices[productAttribute.code]].productCodes.push(product.ProductCode);
                                }
                            } else {
                                formattedContent.attributeRows.push({
                                    label: productAttribute.label,
                                    productCodes: [],
                                    attributeValues: Array.apply(null, Array(products.length)).map(function () {
                                        return {
                                            ProductCode: '',
                                            attributeCode: '',
                                            userValues: '--',
                                            dataType: null,
                                            inputType: null
                                        };
                                    }),
                                    categoryDisplaySequence: attributeCategory.displaySequence,
                                    attributeDisplaySequence: productAttribute.displaySequence,
                                    categoryName: attributeCategory.Name
                                });
                                attributeRowsLength = formattedContent.attributeRows.length;
                                formattedContent.attributeRows[attributeRowsLength - 1].attributeValues[productIterator] = {
                                    ProductCode: product.ProductCode,
                                    attributeCode: productAttribute.code,
                                    userValues: productAttribute.userValues,
                                    dataType: productAttribute.dataType,
                                    inputType: productAttribute.inputType, 
                                    formattedValues: productAttribute.formattedValues
                                };
                                formattedContent.attributeRows[attributeRowsLength - 1].productCodes.push(product.ProductCode);
                                formattedContent.attributeIndices[productAttribute.code] = attributeRowsLength - 1;
                            }
                        });
                    }
                });
            }
        });
        // Sort by category displaySequence first, then by attribute displaySequence, then by label
        formattedContent.attributeRows = formattedContent.attributeRows.sort(function(x, y) {
            if (x.categoryDisplaySequence === y.categoryDisplaySequence) {
                if (x.attributeDisplaySequence < y.attributeDisplaySequence) {
                    return -1;
                } else {
                    return 1;
                }
            } else if (x.categoryDisplaySequence < y.categoryDisplaySequence) {
                return -1;
            } else if (x.categoryDisplaySequence > y.categoryDisplaySequence) {
                return 1;
            } else {
                if (x.label < y.label) {
                    return -1;
                } else {
                    return 1;
                }
            }
        });
        return formattedContent;
    }

    // $scope functions
    $scope.initCompareModal = function(content) {
        $scope.formattedContent = formatContent(content.recSet);
        $scope.$apply();
        console.log('formattedContent', $scope.formattedContent);
    };

    $scope.decideHtmlClasses = function() {
        var htmlClass = '';
        var constantClasses = 'slds-large-size--1-of-' + ($scope.formattedContent.topRow.length + 2) + ' slds-small-size--1-of-' + $scope.formattedContent.topRow.length + ' nds-large-size--1-of-' + ($scope.formattedContent.topRow.length + 2) + ' nds-small-size--1-of-' + $scope.formattedContent.topRow.length;
        if ($scope.formattedContent.topRow.length === 1) {
            htmlClass = constantClasses + ' slds-max-small-size--1-of-1 nds-max-small-size--1-of-1';
        } else if ($scope.formattedContent.topRow.length > 1) {
            htmlClass = constantClasses + ' slds-max-small-size--1-of-2 nds-max-small-size--1-of-2';
        }
        return htmlClass;
    };

    $scope.selectProductFromCompare = function(product) {
        var selectProductEvent = new CustomEvent('vloc-ins-os-product-details-compare-modal-select-product', {
            detail: {
                ProductCode: product.ProductCode
            }
        });
        document.dispatchEvent(selectProductEvent);
        $scope.cancel();
    };

    /* 
    * Format Date
    */
    $scope.formatDate = function(date) {
        const userTimeZone = $rootScope.vlocity.userTimeZone;
        const userLocale = $rootScope.vlocity.userAnLocale;
        console.log('userTimeZone', userTimeZone);
        console.log('userLocale', userLocale);
        const d = new Date(date);
        let formattedDate;
        if (userLocale && userTimeZone) {
            formattedDate = d.toLocaleDateString(userLocale, { timeZone: userTimeZone });
        } else {
            formattedDate = (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();
        }
        return formattedDate;
    };
  
    /* 
    * Format DateTime
    */
    $scope.formatDateTime = function(date) {
        const userTimeZone = $rootScope.vlocity.userTimeZone;
        const userLocale = $rootScope.vlocity.userAnLocale;
        var options = { timeZone: userTimeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour:"2-digit", minute: '2-digit'};
        const d = new Date(date);
        let formattedDate;
        if (userLocale && userTimeZone) {
            formattedDate = d.toLocaleDateString(userLocale, options);
        } else {
            formattedDate = (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();
        }
        return formattedDate;
    };
}]);