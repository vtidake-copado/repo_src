var insPsCustomEventName = 'vloc-os-ins-product-selection-change-' + Math.round((new Date()).getTime() / 1000);
var insPsLoadedOnce;
baseCtrl.prototype.setSelectedProductSelectionProducts = function(control) {
    var event = new CustomEvent(insPsCustomEventName, { 'detail': control.vlcSI[control.itemsKey] });
    baseCtrl.prototype.$scope.currentElementName = control.name;
    if (!baseCtrl.prototype.$scope.insPsControlRef) {
        baseCtrl.prototype.$scope.insPsControlRef = {};
    }
    baseCtrl.prototype.$scope.insPsControlRef[baseCtrl.prototype.$scope.currentElementName] = control;
    insPsLoadedOnce = true;
    document.dispatchEvent(event);
};
vlocity.cardframework.registerModule.controller('insOsProductSelectionCtrl', ['$scope', '$rootScope', '$timeout', '$injector', function($scope, $rootScope, $timeout, $injector) {
    'use strict';
    var InsRulesEvaluationService;
    var trackSetValueAttrs = {};
    var foundCurrentStep = false; // used to track in waitForCurrentStep
    var rulesWatchTracker = {
        path: '',
        correctElement: false
    };
    if (angular.element('script[src*="InsRules"]').length) {
        InsRulesEvaluationService = $injector.get('InsRulesEvaluationService');
    }
    $scope.enrollmentFlow = false;
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }
    $scope.currentProducts = [];
    $scope.allProducts = [];
    $scope.selectedProduct = null;
    $scope.completedProductAnalysis = false;
    $scope.limitValues = {};

    //*** CUSTOMIZABLE VARIABLES ***//
    $scope.usePagination = true; // Turn on/off pagination (will automatically be turned off if enrollmentFlow)
    $scope.pageSize = 2; // Customize pagination page size (cannot be 0, must be an integer) (not applicable for enrollmentFlow)
    if (/Mobi/.test(navigator.userAgent)) {
        $scope.pageSize = 1;
    }

    //*** START LOGIC ***//
    // Listening for a new product selection if the user goes previous and selects a new product
    function listenForMainEvent(e) {
        var selectableItemRemoteClass = baseCtrl.prototype.$scope.bpTree.children[baseCtrl.prototype.$scope.insPsControlRef
        [baseCtrl.prototype.$scope.currentElementName].rootIndex - 1].propSetMap.remoteClass; // var represents OS selectable item remote class value for now
        $rootScope.attributeUserValues = {};
        document.removeEventListener(insPsCustomEventName, listenForMainEvent);
        insPsCustomEventName = 'vloc-os-ins-product-selection-change-' + Math.round((new Date()).getTime() / 1000);
        document.addEventListener(insPsCustomEventName, listenForMainEvent);
        if (selectableItemRemoteClass === 'EnrollmentHandler') {
            $scope.enrollmentFlow = true;
        }
        if ($scope.enrollmentFlow) {
            $scope.usePagination = false;
        }
        $scope.insPsInit(e.detail);

        /**
         * This watcher is used to catch the changes the underlying insRules parser is making.
         *
         * The comparison inside the watch is making sure we have a newValue and that we're on the
         * correct OS element (the one with this template).
         * The reason for this is because when this product selection template and the OS config template
         * are used in the same omniscript, this product selection JS is still able to execute and we don't
         * want it to unless we're actually on this template's OS element.
         */
        $rootScope.$watch('attributeUserValues', function(newValue, oldValue) {
            var keysLength = 0;
            var productSelectionActive = false;
            decideCorrectElement(function(result) {
                rulesWatchTracker = result;
                if (newValue && rulesWatchTracker.correctElement) {
                    delete newValue.undefined;
                    keysLength = Object.keys(newValue).length;
                    $timeout(function() {
                        getParentAttributes($scope.initProducts);
                    });
                }
            }, true);
        }, true);
    }
    if (!insPsLoadedOnce) {
        document.addEventListener(insPsCustomEventName, listenForMainEvent);
    } else {
        insPsCustomEventName = 'vloc-os-ins-product-selection-change-' + Math.round((new Date()).getTime() / 1000);
        document.addEventListener(insPsCustomEventName, listenForMainEvent);
    }

    // If in enrollment, and someone selects a plan from the compare modal, we need to listen
    // to this event
    document.addEventListener('vloc-ins-os-product-details-compare-modal-select-product', function(e) {
        var product = null;
        if (e.detail && e.detail.ProductCode) {
            angular.forEach($scope.currentProducts, function(currentProduct) {
                if (currentProduct.ProductCode === e.detail.ProductCode) {
                    product = currentProduct;
                }
            });
            if (product) {
                $scope.addSelectedProduct(undefined, baseCtrl.prototype.$scope.insPsControlRef[baseCtrl.prototype.$scope.currentElementName], product);
            }
        }
    });

    document.addEventListener('vloc-ins-attribute-rule-set-value', function(e) {
        var evtProductCode = e.detail.ProductCode;
        var evtAttribute = e.detail.attribute;
        if (!trackSetValueAttrs[evtProductCode]) {
            trackSetValueAttrs[evtProductCode] = [];
        }
        if (trackSetValueAttrs[evtProductCode].indexOf(evtAttribute.code) > -1) {
            return;
        } else {
            if (evtAttribute.ruleSetValue) {
                trackSetValueAttrs[evtProductCode].push(evtAttribute.code);
                if (evtAttribute.labelAndValue) {
                    doSelectionProductLoop($scope.initProducts);
                } else {
                    getParentAttributes($scope.initProducts);
                }
            }
        }
    });

    document.addEventListener('vloc-ins-attribute-rule-hide-value', function(e) {
        var evtProductCode = e.detail.ProductCode;
        var evtAttribute = e.detail.attribute;
        var labelAndValue;
        if (!evtAttribute.alreadyLoopedForHideValue) {
            angular.forEach(evtAttribute.values, function(value, evtAttributeIterator) {
                if (value.hiddenByRule) {
                    labelAndValue = $scope.getAttributeData(evtAttribute);
                    if (!evtAttribute.labelAndValue) {
                        evtAttribute.labelAndValue = {};
                    }
                    evtAttribute.labelAndValue.valueHiddenByRule = labelAndValue.valueHiddenByRule;
                    evtAttributeIterator = evtAttribute.values.length;
                    if (evtAttribute.labelAndValue.valueHiddenByRule) {
                        evtAttribute.alreadyLoopedForHideValue = true;
                    }
                }
            });
        }
    });

    document.addEventListener('vloc-ins-attribute-rule-hide', function(e) {
        var evtProductCode = e.detail.ProductCode;
        var evtAttribute = e.detail.attribute;
        if ($scope.parentAttrs[evtProductCode]) {
            angular.forEach($scope.parentAttrs[evtProductCode], function(parentAttr) {
                if (parentAttr.code === evtAttribute.code) {
                    parentAttr.hiddenByRule = evtAttribute.hiddenByRule;
                }
            });
        }
    });

    // Gets the attributes from the parent product to print below the name and above the coverages:
    function getParentAttributes(products) {
        var i, j, k, l, product, attrCats, prodAttrs, dummyObj, values, labelAndValue;
        $scope.parentAttrs = {};
        for (i = 0; i < products.length; i++) {
            product = products[i];
            if (!product.dummyProduct && product.attributeCategories && product.attributeCategories.records) {
                attrCats = product.attributeCategories.records;
                for (j = 0; j < attrCats.length; j++) {
                    if (attrCats[j].productAttributes && attrCats[j].productAttributes.records) {
                        prodAttrs = attrCats[j].productAttributes.records;
                        for (k = 0; k < prodAttrs.length; k++) {
                            if (!$scope.parentAttrs[product.ProductCode]) {
                                $scope.parentAttrs[product.ProductCode] = [];
                            }
                            labelAndValue = $scope.getAttributeData(prodAttrs[k]);
                            dummyObj = {};
                            dummyObj.label = labelAndValue.label;
                            dummyObj.dataType = prodAttrs[k].dataType;
                            dummyObj.code = prodAttrs[k].code;
                            dummyObj.inputType = prodAttrs[k].inputType;
                            dummyObj.valueLabel = labelAndValue.valueLabel;
                            dummyObj.valueHiddenByRule = labelAndValue.valueHiddenByRule;
                            dummyObj.attributeDisplaySequence = prodAttrs[k].displaySequence;
                            dummyObj.categoryDisplaySequence = attrCats[j].displaySequence;
                            dummyObj.categoryCode = attrCats[j].Code__c || attrCats[j][baseCtrl.prototype.$scope.nsPrefix + 'Code__c'];
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
                            $scope.parentAttrs[product.ProductCode].push(dummyObj);
                        }
                    }
                }
                // Sort by category displaySequence first, then by attribute displaySequence, then by label
                $scope.parentAttrs[product.ProductCode] = $scope.parentAttrs[product.ProductCode].sort(function(x, y) {
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
                    $scope.parentAttrs[product.ProductCode].splice(3, $scope.parentAttrs[product.ProductCode].length - 3);
                }
            }
        }
        console.log('$scope.parentAttrs', $scope.parentAttrs);
    }

    function doSelectionProductLoop(products, initLoop) {
        console.log('products', products);
        angular.forEach(products, function(product, i) {
            var foundFirstOptional = false;
            if (product.childProducts && product.childProducts.records && product.childProducts.records.length) {
                product.childProducts.records.sort(function(x, y) {
                    if (x.RecordTypeName__c !== 'CoverageSpec') {
                        return 1;
                    } else {
                        if (x.isSelected === y.isSelected) {
                            if (x.displaySequence === y.displaySequence) {
                                if (x.Name < y.Name) {
                                    return -1;
                                } else {
                                    return 1;
                                }
                            } else if (x.displaySequence < y.displaySequence) {
                                return -1;
                            } else {
                                return 1;
                            }
                        } else if (x.isSelected < y.isSelected) {
                            return 1;
                        } else {
                            return -1;
                        }
                    }
                });

                angular.forEach(product.childProducts.records, function(childProduct, j) {
                    var cpIdx = 0;
                    $scope.getLimitValue(childProduct);
                    if (initLoop && (i === $scope.initProducts.length - 1) && (j === product.childProducts.records.length - 1)) {
                        $scope.completedProductAnalysis = true;
                    }
                    // Add data so we know where coverages end and optional coverages start:
                    if (childProduct.isOptional) {
                        childProduct.isOriginalOptional = true;

                        if (childProduct.isSelected) {
                            childProduct.isAddedOptional = true;
                        }
                    }
                    if (childProduct.isOptional && !childProduct.isSelected && !foundFirstOptional) {
                        childProduct.firstOptional = true;
                        if (j === 0) {
                            cpIdx = 0;
                        } else {
                            cpIdx = j - 1;
                        }
                        product.childProducts.records[cpIdx].lastNonOptional = true;
                        foundFirstOptional = true;
                    } else if (childProduct.isSelected && !foundFirstOptional && j + 1 === product.childProducts.records.length) {
                        childProduct.lastNonOptional = true;
                    }
                });
                console.log('$scope.limitValues', $scope.limitValues);
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

    /**
     * Helper method for repeatable code, called in decideCorrectElement
     * @param {Object} currentStepChild
     * @param {Number} currentStepChildIdx
     */
    function decideCorrectElementHelper(currentStepChild, currentStepChildIdx) {
        var returnObj = {
            correctElement: false,
            path: ''
        };
        angular.forEach(currentStepChild.eleArray, function(osElement, idx) {
            if (osElement && osElement.type === 'Selectable Items' && osElement.children && !osElement.children.length && osElement.propSetMap && !osElement.propSetMap.remoteClass && !osElement.propSetMap.remoteMethod) {
                returnObj.path = 'currentStep.children[' + currentStepChildIdx + '].eleArray[' + idx + ']';
                returnObj.correctElement = true;
                return returnObj;
            }
        });
        return returnObj;
    }

    // OS asIndex is null until the step is instantiated which isn't immediate
    function waitForCurrentStep(callback) {
        $timeout(function() {
            var currentStep = baseCtrl.prototype.$scope.bpTree.children[baseCtrl.prototype.$scope.bpTree.asIndex];
            if (!foundCurrentStep) { // this is set to true in the else block below. it gets set back to false in decideCorrectElement
                if (!currentStep) {
                    waitForCurrentStep(callback);
                } else {
                    foundCurrentStep = true;
                    decideCorrectElement(callback);
                }
            }
        }, 100);
    }

    /**
     * Callback is called once we have a decision. We may have to wait for the baseCtrl.prototype.$scope.bpTree.asIndex
     * as it is null at times when proceding a step
     * @param {Function} callback
     * @param {Boolean} initial
     */
    function decideCorrectElement(callback, initial) {
        var currentStep = baseCtrl.prototype.$scope.bpTree.children[baseCtrl.prototype.$scope.bpTree.asIndex];
        var returnObj = {};
        var osElement;
        if (initial) {
            foundCurrentStep = false;
        }
        if (!currentStep) {
            waitForCurrentStep(callback);
        } else {
            if (!rulesWatchTracker.path) {
                angular.forEach(currentStep.children, function(currentStepChild, idx) {
                    returnObj = decideCorrectElementHelper(currentStepChild, idx);
                });
            } else {
                osElement = eval(rulesWatchTracker.path);
                if (osElement && osElement.type === 'Selectable Items' && osElement.children && !osElement.children.length && osElement.propSetMap && !osElement.propSetMap.remoteClass && !osElement.propSetMap.remoteMethod) {
                    returnObj.correctElement = true;
                } else {
                    returnObj.correctElement = false;
                    angular.forEach(currentStep.children, function(currentStepChild, idx) {
                        returnObj = decideCorrectElementHelper(currentStepChild, idx);
                    });
                }
            }
            return callback(returnObj);
        }
    }

    // When the template is loaded, we need to parse the products that get returned:
    $scope.insPsInit = function(products) {
        var i;
        var dummmyProductsNeeded = products.length % $scope.pageSize ? products.length % $scope.pageSize : 0;
        var dummyProducts = [];
        $scope.parentAttrs = {};
        $scope.enrollmentRateBands = {
            productRateBands: {},
            selectValues: [],
            selectValuesLabelList: [],
            chosen: ''
        };
        $scope.comparePlans = {
            plansInCompare: [],
            showBtn: false
        };
        if ($scope.usePagination && $scope.pageSize < products.length && dummmyProductsNeeded) {
            dummyProducts = Array.apply(null, Array(dummmyProductsNeeded)).map(function() { return { dummyProduct: true }; });
            products = products.concat(dummyProducts);
        }
        for (i = 0; i < products.length; i++) {
            products[i].vlcCompSelected = false;
            products[i].originalIndex = i;
            // Manually generating our own $$hashKey because Omniscript uses it as a comparison
            // and Angular removes it in an ng-repeat that uses 'track by' and we need both.
            products[i].$$hashKey = 'ins-custom-' + i;
            // Collect Rate Band information if we're in an enrollmentFlow:
            if ($scope.enrollmentFlow && products[i].RateBandTierPriceData) {
                $scope.enrollmentRateBands.productRateBands[products[i].ProductCode] = products[i].RateBandTierPriceData;
            }
            if (baseCtrl.prototype.$scope.insPsSelectedRateBand) {
                products[i].selectedRateBand = baseCtrl.prototype.$scope.insPsSelectedRateBand;
            }
        }
        if (!$scope.enrollmentRateBands.selectValues.length) {
            angular.forEach($scope.enrollmentRateBands.productRateBands, function(value, key) {
                angular.forEach(value, function(value2, key2) {
                    if ($scope.enrollmentRateBands.selectValuesLabelList.indexOf(key2) < 0) {
                        $scope.enrollmentRateBands.selectValuesLabelList.push(key2);
                        $scope.enrollmentRateBands.selectValues.push({
                            label: value2.Label,
                            value: key2,
                            sequence: value2.Sequence
                        });
                    }
                });
            });
            $scope.enrollmentRateBands.selectValues.sort(function(x, y) {
                if (x.sequence === y.sequence) {
                    if (x.label < y.label) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else if (x.sequence < y.sequence) {
                    return -1;
                } else {
                    return 1;
                }
            });
            if ($scope.enrollmentRateBands.selectValues.length) {
                $scope.enrollmentRateBands.chosen = $scope.enrollmentRateBands.selectValues[0].value;
            }
        }
        console.log('$scope.enrollmentRateBands', $scope.enrollmentRateBands);
        $scope.initProducts = products;
        doSelectionProductLoop($scope.initProducts, true);
        if (!InsRulesEvaluationService) {
            getParentAttributes($scope.initProducts);
        }
        if ($scope.usePagination) {
            $scope.allProducts = products;
            $scope.currentProducts = $scope.allProducts.slice(0, $scope.pageSize);
        } else {
            $scope.pageSize = products.length;
            $scope.currentProducts = products;
        }
        if ($scope.enrollmentRateBands.selectValues.length) {
            $scope.changeRateBand();
        }
    };

    // Gets called when clicking next/previous directional buttons at top
    $scope.paginateItems = function(direction) {
        var startIndex = 0;
        var currentProducts = $scope.currentProducts;
        if (direction === 'next') {
            startIndex = currentProducts[currentProducts.length - 1].originalIndex + 1;
        } else if (direction === 'prev') {
            startIndex = currentProducts[0].originalIndex - $scope.pageSize;
            if (startIndex < 0) {
                startIndex = 0;
            }
        }
        $scope.currentProducts = $scope.allProducts.slice(startIndex, startIndex + $scope.pageSize);
    };

    // Decides whether the directional button should be active or disabled based on
    // the location we're at in the whole set of products.
    $scope.showPageControl = function(direction) {
        var i;
        var show = false;
        var amountToSubtract = ($scope.allProducts.length % 2) + 1; // adding 1 for dummyProduct
        var lastIndex = $scope.allProducts.length - amountToSubtract;
        var lastIndexExists = [];
        if (direction === 'next') {
            if ($scope.currentProducts.length === 1 && $scope.pageSize > 1) {
                show = false;
            } else {
                for (i = 0; i < $scope.currentProducts.length; i++) {
                    if ($scope.currentProducts[i].originalIndex === lastIndex) {
                        lastIndexExists.push('yes');
                    } else {
                        lastIndexExists.push('no');
                    }
                }
                if (lastIndexExists.indexOf('yes') > -1) {
                    show = false;
                } else {
                    show = true;
                }
            }
        } else if (direction === 'prev') {
            if ($scope.currentProducts[0].originalIndex > 0) {
                show = true;
            } else {
                show = false;
            }
        }
        return show;
    };

    // Keeps track of the selected product locally so we can print at the top when paginating.
    $scope.addSelectedProduct = function(e, control, product) {
        if (e && e.target.className.indexOf('vloc-ins-selectable-item-compare-checkbox') > -1) {
            e.stopPropagation();
            return;
        } else {
            baseCtrl.prototype.$scope.onSelectItem(control, control.vlcSI[control.itemsKey][product.originalIndex], product.originalIndex, this, true);
            if ($scope.selectedProduct && $scope.selectedProduct.Id === product.Id) {
                $scope.selectedProduct = null;
            } else {
                $scope.selectedProduct = {
                    Name: product.Name,
                    Id: product.Id
                };
            }
        }
    };

    // Assumes an attribute code with 'limit' in the string is the main Limit value of the coverage:
    $scope.getLimitValue = function(child) {
        var i, j, k, attrCats, prodAttrs, values;
        if (child.attributeCategories && child.attributeCategories.records) {
            attrCats = child.attributeCategories.records;
            if (!(child.pciId in $scope.limitValues)) {
                $scope.limitValues[child.pciId] = {};
            }
            for (i = 0; i < attrCats.length; i++) {
                prodAttrs = attrCats[i].productAttributes.records;
                if (prodAttrs && prodAttrs.length) {
                    for (j = 0; j < prodAttrs.length; j++) {
                        if (prodAttrs[j].inputType !== 'equalizer' && prodAttrs[j].code.toLowerCase().indexOf('limit') > -1) {
                            values = prodAttrs[j].values;
                            $scope.limitValues[child.pciId]= prodAttrs[j];
                            if (values && values.length) {
                                for (k = 0; k < values.length; k++) {
                                    if (values[k].value === prodAttrs[j].userValues) {
                                        if($scope.limitValues[child.pciId].dataType === 'text'){
                                            $scope.limitValues[child.pciId].value = values[k].label;
                                        }
                                        $scope.limitValues[child.pciId].valueHiddenByRule = values[k].hiddenByRule;
                                    }
                                }
                            }
                        } else {
                            $scope.limitValues[child.pciId].value = '';
                        }
                    }
                }
            }
        }
    };

    // Grabs the rest of the attributes if there are more than just the limit.
    $scope.getAttributeData = function(attribute) {
        var attrData = {};
        var i, j, key, k, l;
        if (attribute.values && attribute.values[0].label && attribute.userValues && attribute.userValues.constructor !== Array) {
            for (i = 0; i < attribute.values.length; i++) {
                if (attribute.values[i].value === attribute.userValues) {
                    attrData.label = attribute.label;
                    attrData.valueLabel = attribute.values[i].label;
                    attrData.valueHiddenByRule = attribute.values[i].hiddenByRule;
                }
            }
        } else if (attribute.values && attribute.values[0].label && attribute.userValues && attribute.userValues.constructor === Array) {
            for (j = 0; j < attribute.userValues.length; j++) {
                if (attribute.userValues[j].constructor === Object && !angular.equals(attribute.userValues[j], {})) {
                    for (key in attribute.userValues[j]) {
                        if (attribute.userValues[j][key]) {
                            for (k = 0; k < attribute.values.length; k++) {
                                if (attribute.values[k].value == key) {
                                    attrData.label = attribute.label;
                                    attrData.valueHiddenByRule = attribute.values[k].hiddenByRule;
                                    if (!attribute.values[k].hiddenByRule) {
                                        if (!attrData.valueLabel) {
                                            attrData.valueLabel = attribute.values[k].label;
                                        } else {
                                            attrData.valueLabel = attrData.valueLabel + ', ' + attribute.values[k].label;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    attrData.label = attribute.label;
                    for (l = 0; l < attribute.values.length; l++) {
                        attrData.valueHiddenByRule = attribute.values[l].hiddenByRule;
                        if (attribute.userValues[j] == attribute.values[l].value && !attribute.values[l].hiddenByRule) {
                            if (!attrData.valueLabel) {
                                attrData.valueLabel = attribute.values[l].label;
                            } else {
                                attrData.valueLabel = attrData.valueLabel + ', ' + attribute.values[l].label;
                            }
                        }
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
    };

    $scope.getSelectableItemClass = function(product, index) {
        var htmlClass = 'slds-size--1-of-' + $scope.pageSize +
                        ' nds-size--1-of-' + $scope.pageSize +
                        ' slds-large-size--1-of-' + $scope.pageSize +
                        ' nds-large-size--1-of-' + $scope.pageSize +
                        ' slds-medium-size--1-of-' + Math.round(parseFloat($scope.pageSize / 2)) +
                        ' nds-medium-size--1-of-' + Math.round(parseFloat($scope.pageSize / 2)) +
                        ' slds-small-size--1-of-1 slds-max-small-size--1-of-1 nds-small-size--1-of-1 nds-max-small-size--1-of-1';
        if (product.dummyProduct) {
            htmlClass += ' slds-hidden nds-hidden';
        }
        if ($scope.currentProducts.length === 1) {
            htmlClass += ' vloc-ins-one-product';
        }
        if (product.similarToLastYear) {
            htmlClass += ' vloc-ins-has-similar-flag';
        }
        if (product.disabledByRateBand) {
            htmlClass += ' disabled-by-rate-band';
        }
        return htmlClass;
    };

    $scope.getParentAttributeClass = function(attribute, index) {
        var htmlClass = 'vloc-ins-parent-attr-regular';
        if (attribute.categoryCode.toLowerCase().indexOf('benefit') > -1) {
            if (attribute.dataType !== 'currency' && typeof attribute.valueLabel === 'boolean') {
                htmlClass = 'vloc-ins-parent-attr-non-regular vloc-ins-parent-attr-boolean';
            } else if (attribute.dataType === 'currency') {
                htmlClass = 'vloc-ins-parent-attr-non-regular vloc-ins-parent-attr-currency';
            }
        }
        if (index > 0) {
            htmlClass += ' vloc-ins-hide-on-small-screens vloc-ins-hide-on-large-screens';
        } else if (index > -1) {
            htmlClass += ' vloc-ins-hide-on-small-screens'
        }
        return htmlClass;
    };

    $scope.checkAttrValueLabel = function(attribute) {
        var returnObj = {
            showRegular: true,
            showCheck: false,
            showX: false
        };
        if (typeof attribute.valueLabel === 'boolean' && !$scope.enrollmentFlow) {
            if (attribute.valueLabel) {
                returnObj = {
                    showRegular: false,
                    showCheck: true,
                    showX: false
                };
            } else {
                returnObj = {
                    showRegular: false,
                    showCheck: false,
                    showX: true
                };
            }
        }
        return returnObj;
    };

    $scope.changeRateBand = function() {
        angular.forEach($scope.currentProducts, function(product) {
            var chosenBand = null;
            product.selectedRateBand = $scope.enrollmentRateBands.chosen;
            baseCtrl.prototype.$scope.insPsSelectedRateBand = $scope.enrollmentRateBands.chosen;
            if (product.ProductCode && $scope.enrollmentFlow && product.RateBandTierPriceData && $scope.enrollmentRateBands.chosen) {
                chosenBand = $scope.enrollmentRateBands.productRateBands[product.ProductCode][$scope.enrollmentRateBands.chosen];
                if (chosenBand && chosenBand.Price) {
                    product.Price = chosenBand.Price;
                    product.disabledByRateBand = false;
                } else {
                    product.disabledByRateBand = true;

                    if (product.vlcSelected) {
                        $scope.addSelectedProduct(undefined, baseCtrl.prototype.$scope.insPsControlRef[baseCtrl.prototype.$scope.currentElementName], product);
                    }
                }
            }
        });
        console.log('currentProducts', $scope.currentProducts);
    };

    $scope.viewPlanDetails = function(e, scp, control, product) {
        var isCompSelected = false;
        e.stopPropagation();
        angular.forEach($scope.currentProducts, function(currentProduct) {
            if (currentProduct.Id !== product.Id && currentProduct.vlcCompSelected) {
                currentProduct.vlcCompWasSelected = true;
                currentProduct.vlcCompSelected = false;
            }
        });
        if (product.vlcCompSelected) {
            isCompSelected = true;
        } else {
            product.vlcCompSelected = true;
        }
        baseCtrl.prototype.$scope.openModal(scp, control);
        $timeout(function() {
            if (!isCompSelected) {
                product.vlcCompSelected = false;
                $scope.$apply();
            }
            angular.forEach($scope.currentProducts, function(currentProduct) {
                if (currentProduct.Id !== product.Id && currentProduct.vlcCompWasSelected) {
                    delete currentProduct.vlcCompWasSelected;
                    currentProduct.vlcCompSelected = true;
                }
            });
        }, 250);
    };

    $scope.trackCompareChecks = function(product) {
        var plansInCompareIndex = -1;
        if ($scope.comparePlans.plansInCompare.length) {
            plansInCompareIndex = $scope.comparePlans.plansInCompare.indexOf(product.Id);
            if (plansInCompareIndex > -1) {
                $scope.comparePlans.plansInCompare.splice(plansInCompareIndex, 1);
            } else {
                $scope.comparePlans.plansInCompare.push(product.Id);
            }
        } else {
            $scope.comparePlans.plansInCompare.push(product.Id);
        }
        if ($scope.comparePlans.plansInCompare.length > 1) {
            $scope.comparePlans.showBtn = true;
        } else {
            $scope.comparePlans.showBtn = false;
        }
    };

    $scope.insPsOpenModal = function(scp, control) {
        baseCtrl.prototype.$scope.currentElementName = control.name;
        baseCtrl.prototype.$scope.openModal(scp, control);
    };
}]);