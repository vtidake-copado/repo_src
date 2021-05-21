vlocity.cardframework.registerModule.controller('insOsPlanCompareModalCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
    'use strict';

    // $scope variables
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    //Attribute Group Type Label Map
    $scope.attributeGroupTypeLabels = {
        'In-Network': '- In',
        'Out-Of-Network': '- Out'
    };


    /* Format userValue if date type
    * @params {Date} date obj or string (fn handles both)
    * @params {Boolean} isDateTime whether or not to display time
    */
    $scope.formatDate = function (date, isDatetime) {
        let formattedDate = null;
        if (!date) {
            console.error('This date is invalid', date);
            return formattedDate;
        } else {
            let monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            if (moment) {
                monthNames = moment.months();
                formattedDate = moment(date).format('MMMM Do YYYY');
                if (isDatetime) {
                    formattedDate = moment(date).format('MMM. Do YYYY, h:mm a');
                }
            } else {
                const dateObj = new Date(date);
                if (Object.prototype.toString.call(dateObj) === '[object Date]') {
                    if (isNaN(dateObj.getTime())) {
                        if (typeof date === 'string' && date.indexOf('.') > -1) {
                            date = date.split('.')[0];
                            return $scope.formatDate(date);
                        }
                    }
                } else {
                    console.error('This date is invalid', date);
                }
                formattedDate = monthNames[dateObj.getUTCMonth()] + ' ' + dateObj.getUTCDate() + ' ' + dateObj.getUTCFullYear();

                if (isDatetime) {
                    formattedDate = formattedDate + ' ' + dateObj.toLocaleTimeString();
                }
            }
        }
        return formattedDate;
    };


    // Local functions
    function formatContent(products) {
        console.log('formatContent', products);
        var formattedContent = {
            topRow: [],
            attributeRows: [],
            attributeIndices: {}
        };
        angular.forEach(products, function (product, productIterator) {
            if (product[baseCtrl.prototype.$scope.nsPrefix + 'RecordTypeName__c'] !== 'RatingFactSpec' && product.RecordTypeName__c !== 'RatingFactSpec') {
                formattedContent.topRow.push({
                    ProductCode: product.ProductCode,
                    Name: product.Name || product.productName,
                    Id: product.Id,
                    Price: product.Price,
                    disabledByRateBand: product.disabledByRateBand,
                    tier: product.tier,
                    productData: product
                });
                if (product.attributeCategories && product.attributeCategories.records) {
                    angular.forEach(product.attributeCategories.records, function (attributeCategory) {
                        if (attributeCategory.productAttributes && attributeCategory.productAttributes.records) {
                            angular.forEach(attributeCategory.productAttributes.records, function (productAttribute) {
                                if (!productAttribute.hidden) {
                                    if (!productAttribute.formattedValues && productAttribute.values && productAttribute.values[0].value && productAttribute.userValues && (productAttribute.multiselect || productAttribute.inputType === 'radio' || productAttribute.inputType === 'dropdown')) {
                                        productAttribute.formattedValues = [];
                                        let selected = [];
                                        if (!Array.isArray(productAttribute.userValues)) { //userValues can be a single value
                                            selected.push(productAttribute.userValues);
                                        } else {
                                            for (let i = 0; i < productAttribute.userValues.length; i++) {//could have an array of Objs or an array of Strings/Integers
                                                let value = productAttribute.userValues[i];
                                                let valueType = typeof value;
                                                if (valueType !== 'object' || value === null) {
                                                    selected.push(value);
                                                } else {
                                                    for (let key in value) { //multiselect checkbox - get keys with true [{value1: true}, {value2: false}]
                                                        if (value[key]) {
                                                            selected.push(key);
                                                        }
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
                                    if (formattedContent.attributeIndices.hasOwnProperty(productAttribute.code)) {
                                        if (!formattedContent.attributeRows[formattedContent.attributeIndices[productAttribute.code]][product.ProductCode]) {
                                            formattedContent.attributeRows[formattedContent.attributeIndices[productAttribute.code]].attributeValues[productIterator] = {
                                                ProductCode: product.ProductCode,
                                                attributeCode: productAttribute.code,
                                                userValues: productAttribute.userValues,
                                                dataType: productAttribute.dataType,
                                                inputType: productAttribute.inputType,
                                                attributeGroupType: productAttribute.attributeGroupType,
                                                hidden: productAttribute.hidden,
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
                                            attributeGroupType: productAttribute.attributeGroupType,
                                            categoryName: attributeCategory.Name
                                        });
                                        const attributeRowsLength = formattedContent.attributeRows.length;
                                        formattedContent.attributeRows[attributeRowsLength - 1].attributeValues[productIterator] = {
                                            ProductCode: product.ProductCode,
                                            attributeCode: productAttribute.code,
                                            userValues: productAttribute.userValues,
                                            dataType: productAttribute.dataType,
                                            inputType: productAttribute.inputType,
                                            attributeGroupType: productAttribute.attributeGroupType,
                                            hidden: productAttribute.hidden,
                                            multiselect: productAttribute.multiselect,
                                            formattedValues: productAttribute.formattedValues
                                        };
                                        formattedContent.attributeRows[attributeRowsLength - 1].productCodes.push(product.ProductCode);
                                        formattedContent.attributeIndices[productAttribute.code] = attributeRowsLength - 1;
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
        // Sort by category displaySequence first, then by attribute displaySequence, then by label
        formattedContent.attributeRows = formattedContent.attributeRows.sort(function (x, y) {
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

    /* Function to init compare modal - formattedConent and childConent are used to display the table
    * @params {obj} records list of products to formatted and displayed for comparison
    */
    $scope.initCompareModal = function (records) {
        $scope.formattedContent = formatContent(records);
        $scope.formattedChildContent = [];
        let childProducts = {};
        if (records) { //Collect a map of {productid : [coverage1, coverage2]} to use the same formatting function
            for (let i = 0; i < records.length; i++) {
                if (records[i].childProducts) {
                    for (let j = 0; j < records[i].childProducts.records.length; j++) {
                        let coverage = records[i].childProducts.records[j];
                        coverage.compared = true;
                        let key = coverage.productId || coverage.Id;
                        if (key) {
                            childProducts[key] = childProducts[key] || [];
                            childProducts[key].push(coverage);
                        }
                    }
                }
            }
        }
        console.log(childProducts);
        for (let key in childProducts) {
            if (childProducts[key].length !== records.length) { //make sure the length of the records (columns) matches
                let difference = records.length - childProducts[key].length; //how many childProducts you have in your array - ensures same formatting
                for (let i = 0; i < difference; i++) {
                    childProducts[key].push([]);
                }
            }
            $scope.formattedChildContent.push(formatContent(childProducts[key])); //use same function to format
        }
        $scope.$apply();
    };

    $scope.decideHtmlClasses = function () {
        var htmlClass = '';
        var constantClasses = 'slds-large-size--1-of-' + ($scope.formattedContent.topRow.length + 2) + ' slds-small-size--1-of-' + $scope.formattedContent.topRow.length + ' nds-large-size--1-of-' + ($scope.formattedContent.topRow.length + 2) + ' nds-small-size--1-of-' + $scope.formattedContent.topRow.length;
        if ($scope.formattedContent.topRow.length === 1) {
            htmlClass = constantClasses + ' slds-max-small-size--1-of-1 nds-max-small-size--1-of-1';
        } else if ($scope.formattedContent.topRow.length > 1) {
            htmlClass = constantClasses + ' slds-max-small-size--1-of-2 nds-max-small-size--1-of-2';
        }
        return htmlClass;
    };

    $scope.selectProductFromCompare = function (product) {
        var selectProductEvent = new CustomEvent('vloc-ins-os-product-details-compare-modal-select-product', {
            detail: {
                ProductCode: product.ProductCode
            }
        });
        document.dispatchEvent(selectProductEvent);
        $scope.cancel();
    };
}]);