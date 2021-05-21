baseCtrl.prototype.setInsEnrSumData = function(control) {
    var event = new CustomEvent('vloc-ins-enr-sum-data-change', { 'detail': control.vlcSI[control.itemsKey] });
    baseCtrl.prototype.$scope.insEnrSumControlRef = control;
    document.dispatchEvent(event);
};
vlocity.cardframework.registerModule.controller('insOsEnrolleeSummaryCtrl', ['$scope', '$rootScope', '$timeout', '$injector', function($scope, $rootScope, $timeout, $injector) {
    'use strict';
    var InsRulesEvaluationService;
    if (angular.element('script[src*="InsRules"]').length) {
        InsRulesEvaluationService = $injector.get('InsRulesEvaluationService');
    }

    //*** instantiate $scope variables ***//
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    //*** START LOGIC ***//
    $rootScope.$watch('attributeUserValues', function(newValue, oldValue) {
        var keysLength = 0;
        if (newValue) {
            delete newValue.undefined;
            keysLength = Object.keys(newValue).length;
            if (keysLength >= $scope.rootAndChildrenProductsKeys.length) {
                // Have to do evaluation in JS because the data is manipulated here:
                if ($rootScope.evalProductsArray && $rootScope.evalProductsArray.length) {
                    InsRulesEvaluationService.doProductLoop($rootScope.evalProductsArray, true, false, true, true, null, function() {
                        doSelectionProductLoop($scope.enrolledProducts);
                    });
                }
                $timeout(function() {
                    getParentAttributes($scope.enrolledProducts);
                });
            }
        }
    });

    //*** START LOGIC ***//
    document.addEventListener('vloc-ins-enr-sum-data-change', function(e) {
        $scope.init(e.detail);
    });

    function doSelectionProductLoop(products, initLoop) {
        console.log('products', products);
        angular.forEach(products, function(product, i) {
            if (initLoop) {
                product.vlcSelected = true;
                if (product.ProductCode && $scope.rootAndChildrenProductsKeys.indexOf(product.ProductCode) < 0) {
                    $scope.rootAndChildrenProductsKeys.push(product.ProductCode);
                }
            }
            if (product.childProducts && product.childProducts.records && product.childProducts.records.length) {
                angular.forEach(product.childProducts.records, function(childProduct, j) {
                    if (initLoop && (childProduct.RecordTypeName__c === 'CoverageSpec' || childProduct[baseCtrl.prototype.$scope.nsPrefix + 'RecordTypeName__c'] === 'CoverageSpec') && childProduct.ProductCode && $scope.rootAndChildrenProductsKeys.indexOf(childProduct.ProductCode) < 0) {
                        $scope.rootAndChildrenProductsKeys.push(childProduct.ProductCode);
                    }
                    if (initLoop && ($scope.initProducts && i === $scope.initProducts.length - 1) && (j === product.childProducts.records.length - 1)) {
                        $scope.completedProductAnalysis = true;
                    }
                });
            }
        });
    }

    function formatDate(date, isDatetime) {
        var dateObj, formattedDate;
        if (date) {
            dateObj = new Date(date);
            if (isDatetime) {
                formattedDate = dateObj.toLocaleString();
            } else {
                formattedDate = dateObj.toLocaleDateString();
            }
        }
        return formattedDate;
    }

    // Grabs the rest of the attributes if there are more than just the limit.
    function getAttributeData(attribute) {
        var attrData = {};
        var i, j, key;
        if (attribute.values && attribute.values[0].label && attribute.userValues && attribute.userValues.constructor !== Array) {
            for (i = 0; i < attribute.values.length; i++) {
                if (attribute.values[i].value === attribute.userValues) {
                    attrData.label = attribute.label;
                    attrData.valueLabel = attribute.values[i].label;
                }
            }
        } else if (attribute.values && attribute.values[0].label && attribute.userValues && attribute.userValues.constructor === Array) {
            for (j = 0; j < attribute.userValues.length; j++) {
                if (attribute.userValues[j].constructor === Object && !angular.equals(attribute.userValues[j], {})) {
                    for (key in attribute.userValues[j]) {
                        if (attribute.userValues[j][key]) {
                            attrData.label = attribute.label;
                            if (!attrData.valueLabel) {
                                attrData.valueLabel = key;
                            } else {
                                attrData.valueLabel = attrData.valueLabel + ', ' + key;
                            }
                        }
                    }
                } else {
                    attrData.label = attribute.label;
                    if (!attrData.valueLabel) {
                        attrData.valueLabel = attribute.userValues[j];
                    } else {
                        attrData.valueLabel = attrData.valueLabel + ', ' + attribute.userValues[j];
                    }
                }
            }
        } else {
            attrData.label = attribute.label;
            attrData.valueLabel = attribute.userValues;
            if (attribute.dataType === 'date') {
                attrData.valueLabel = formatDate(attribute.userValues);
            } else if (attribute.dataType === 'datetime') {
                attrData.valueLabel = formatDate(attribute.userValues, true);
            }
        }
        // console.log('attrData', attrData);
        return attrData;
    }

    // Gets the attributes from the parent product to print below the name and above the coverages:
    function getParentAttributes(products) {
        var i, j, k, l, product, attrCats, prodAttrs, dummyObj, values, labelAndValue;
        $scope.summaryParentAttrs = {};
        for (i = 0; i < products.length; i++) {
            product = products[i];
            if (!product.dummyProduct) {
                attrCats = product.attributeCategories.records;
                for (j = 0; j < attrCats.length; j++) {
                    prodAttrs = attrCats[j].productAttributes.records;
                    if (prodAttrs && prodAttrs.length) {
                        for (k = 0; k < prodAttrs.length; k++) {
                            if (!$scope.summaryParentAttrs[product.ProductCode]) {
                                $scope.summaryParentAttrs[product.ProductCode] = [];
                            }
                            labelAndValue = getAttributeData(prodAttrs[k]);
                            dummyObj = {};
                            dummyObj.label = labelAndValue.label;
                            dummyObj.dataType = prodAttrs[k].dataType;
                            dummyObj.inputType = prodAttrs[k].inputType;
                            dummyObj.valueLabel = labelAndValue.valueLabel;
                            dummyObj.attributeDisplaySequence = prodAttrs[k].displaySequence;
                            dummyObj.categoryDisplaySequence = attrCats[j].displaySequence;
                            dummyObj.categoryCode = attrCats[j].Code__c || attrCats[j][$scope.$scope.nsPrefix + 'Code__c'];
                            dummyObj.hiddenByRule = prodAttrs[k].hiddenByRule;
                            dummyObj.hidden = prodAttrs[k].hidden;
                            // If the attribute is customizable and there are values defined,
                            // we need to grab the label from the values that has a value equal
                            // to the userValues and use that.
                            values = prodAttrs[k].values;
                            if (values && values.length && !prodAttrs[k].readonly) {
                                for (l = 0; l < values.length; l++) {
                                    if (values[l].value === prodAttrs[k].userValues) {
                                        dummyObj.valueLabel = values[l].label;
                                    }
                                }
                            }
                            $scope.summaryParentAttrs[product.ProductCode].push(dummyObj);
                        }
                    }
                }
                // Sort by category displaySequence first, then by attribute displaySequence, then by label
                $scope.summaryParentAttrs[product.ProductCode] = $scope.summaryParentAttrs[product.ProductCode].sort(function(x, y) {
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
                if ($scope.enrollmentFlow) {
                    $scope.summaryParentAttrs[product.ProductCode].splice(3, $scope.summaryParentAttrs[product.ProductCode].length - 3);
                }
            }
        }
        console.log('$scope.summaryParentAttrs', $scope.summaryParentAttrs);
    }

    $scope.init = function(products) {
        $scope.summaryParentAttrs = {};
        $scope.rootAndChildrenProductsKeys = [];
        $scope.enrolledProducts = products;
        console.log('products', $scope.enrolledProducts);
        doSelectionProductLoop($scope.enrolledProducts, true);
        if (!InsRulesEvaluationService) {
            getParentAttributes($scope.enrolledProducts);
        }
    };

    $scope.getImageNameFromType = function(type) {
        if (!type) return;
        return type.toLowerCase().replace(/[_ ]/, '-');
    };

    $scope.getWhosCovered = function(product) {
        var whosCovered = 'You';
        if (product && product.dependents) {
            if (product.dependents.length) {
                angular.forEach(product.dependents, function(dependent, depIterator) {
                    if (dependent.FirstName && dependent.LastName) {
                        if (depIterator !== product.dependents.length - 1) {
                            whosCovered += ', ' + dependent.FirstName + ' ' + dependent.LastName;
                        } else {
                            whosCovered += ', & ' + dependent.FirstName + ' ' + dependent.LastName;
                        }
                    }
                });
            } else if (product.dependents.FirstName && product.dependents.LastName) {
                whosCovered += ' & ' + product.dependents.FirstName + ' ' + product.dependents.LastName;
            }
        }
        return whosCovered;
    };
}]);

vlocity.cardframework.registerModule.directive('insSummaryCalcHeight', ['$timeout', function($timeout) {
    'use strict';
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var watchElementsClassNames = [
                '.vloc-ins-enr-sum-product-data'
            ];
            scope.$watch(
                // This function is returns the value that is watched in the next function.
                // Collecting the length of child elements that would affect the height of this container.
                function() {
                    var watchElementsLength = 0;
                    angular.forEach(watchElementsClassNames, function(watchElementsClassName) {
                        if ($(element[0]).find(watchElementsClassName) && $(element[0]).find(watchElementsClassName).length) {
                            if ($(element[0]).find(watchElementsClassName).length < 5) {
                                watchElementsLength = watchElementsLength + $(element[0]).find(watchElementsClassName).length;
                            } else {
                                watchElementsLength = watchElementsLength + 5;
                            }
                        }
                    });
                    return watchElementsLength;
                },
                function(newValue, oldValue) {
                    var containerHeight = 0;
                    $timeout(function() {
                        if (newValue && newValue !== oldValue && !attrs.style) {
                            angular.forEach(element[0].children, function(child, i) {
                                if (i < newValue) {
                                    containerHeight += $(child).outerHeight(true);
                                } else {
                                    i = element[0].children.length;
                                }
                            });
                            containerHeight = containerHeight + 'px';
                            console.log('applied max-height: ' + containerHeight + ' to ', element[0]);
                            $(element[0]).css({'max-height': containerHeight});
                        }
                    }, 100);
                }
            );
        }
    };
}]);