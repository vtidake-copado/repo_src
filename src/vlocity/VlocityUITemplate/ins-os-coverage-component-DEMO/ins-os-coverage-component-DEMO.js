/* jshint esversion: 6 */
let insConfigCustomEventName = 'vloc-os-ins-config-product-set-' + Math.round((new Date()).getTime() / 1000);
let insConfigLoadedOnce;
baseCtrl.prototype.setSelectedProducts = function(control) {
    let event = new CustomEvent(insConfigCustomEventName, {'detail': control.vlcSI[control.itemsKey]});
    baseCtrl.prototype.$scope.currentConfigElementName = control.name;
    if (!baseCtrl.prototype.$scope.insConfigControlRef) {
        baseCtrl.prototype.$scope.insConfigControlRef = {};
    }
    baseCtrl.prototype.$scope.insConfigControlRef[baseCtrl.prototype.$scope.currentConfigElementName] = control;
    if (baseCtrl.prototype.vlocOSInsConfigProductSet && baseCtrl.prototype.vlocOSInsConfigProductSet.timestamp !== control.vlcSI[control.itemsKey][0].timestamp) {
        document.dispatchEvent(event);
    }
    if (!baseCtrl.prototype.vlocOSInsConfigProductSet) {
        baseCtrl.prototype.vlocOSInsConfigProductSet = {};
    }
    baseCtrl.prototype.vlocOSInsConfigProductSet.root = control.vlcSI[control.itemsKey];
};

vlocity.cardframework.registerModule.controller('insCoveragesCtrl', ['$scope', '$rootScope', '$timeout', '$q', '$filter', function($scope, $rootScope, $timeout, $q, $filter) {
    'use strict';
    // Need to clear out rules object so it can track data within this scope:
    $rootScope.attributeUserValues = {};
    $rootScope.evalProductsArray = [];
    // Instantiating sortedCoverages map that will contain products stored by key that is repeated over in the UI
    $scope.sortedCoverages = {};
    // Template Config Options:
    $scope.insCoveragesConfig = {
        showParentProduct: true, // Show Parent Product in UI
        remoteMethod: false, // Boolean to decide whether we can call buttonClick from JS (set to true in setSelectedOption)
        callButtonClick: true, // Manually turn the automatic remote call off even if the class and method are set
        coverageAccordion: true, // Turn on/off accordion on coverages
        coverageAccordionMinAttrs: 2, // The number of minimum coverage attributes needed (throughout all categories) to trigger an accordion if attrCatAccordion is false
        attrCatAccordion: false, // Turn on/off accordion and category name for attribute categories (the accordion will automatically be off if only 1 category, but category name will remain if this is true). To keep category names, but disable the accordions, set 'coverageAccordionMinAttrs' to an unattainably high number
        attrCatAccordionMinCats: 2 // The number of minimum attribute categories needed to trigger a category accordion if attrCatAccordion is true
    };
    $scope.bpTreeResponse = {};
    // Flags to determine whether to recalculate coverages
    $scope.calcConfig = {
        disableAutoCalculate: false,
        triggerCalculate: false,
        calculationDone: true
    };

    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.propSetMap.currencyCode) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.propSetMap.currencyCode;
    } else if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    // Listening for a new product selection if the user goes previous and selects a new product
    function listenForConfigEvent(e) {
        // Unflattened products/coverages
        $scope.productsList = e.detail;
        // Need to clear out rules object so it can track data within this scope:
        $rootScope.attributeUserValues = {};
        $rootScope.evalProductsArray = [];
        // Instantiating sortedCoverages map that will contain products stored by key that is repeated over in the UI
        $scope.sortedCoverages = {};
        document.removeEventListener(insConfigCustomEventName, listenForConfigEvent);
        insConfigCustomEventName = 'vloc-os-ins-config-product-set-' + Math.round((new Date()).getTime() / 1000);
        document.addEventListener(insConfigCustomEventName, listenForConfigEvent);
        // If these coverages are used in the multi-auto flow, we need to refresh this function on back/forth
        if ($scope.initMultiAuto) {
            $scope.initMultiAuto();
        }
        $scope.createData($scope.productsList, baseCtrl.prototype.$scope.bpTree.response, true);
    }
    if (!insConfigLoadedOnce) {
        document.addEventListener(insConfigCustomEventName, listenForConfigEvent);
    } else {
        insConfigCustomEventName = 'vloc-os-ins-config-product-set-' + Math.round((new Date()).getTime() / 1000);
        document.addEventListener(insPsCustomEventName, listenForConfigEvent);
    }

    $scope.changeCoverageChain = {
        moreQueued: [],
        currentSetValues: [] // stored as product.ProductCode + '.' + attribute.code
    };
    document.addEventListener('vloc-ins-attribute-rule-set-value', function(e) {
        let prodDotAttr = e.detail.product.ProductCode + '.' + e.detail.attribute.code;
        let idx = $scope.changeCoverageChain.currentSetValues.indexOf(prodDotAttr);
        if (idx > -1 && e.detail.attribute.ruleSetValue) {
            return;
        } else if (idx > -1 && !e.detail.attribute.ruleSetValue) {
            $scope.changeCoverageChain.currentSetValues.splice(idx, 1);
            $scope.changeCoverageChain.moreQueued.splice(idx, 1);
        }
        $scope.changeCoverageChain.currentSetValues.push(prodDotAttr);
        $scope.changeCoverageChain.moreQueued.push({
            product: e.detail.product,
            attribute: e.detail.attribute
        });
    });

    function generateHashKey(idxs, factor) {
        let hashKey = 'insobject:' + (parseInt(idxs) + 1) * factor;
        return hashKey + factor + Math.ceil(Math.random() * 100000);
    }

    // Adds hash keys to products, also syncs prices
    /**
     * @param {Array} products Current level of products
     * @param {Function} [callback]
     * @param {Number} [factor] Used for hash generation
     * @param {String} [passedProductName] Used for adding parent product name
     */
    function addHashKeys(products, callback, factor, passedProductName) {
        const isRootProduct = products[0].RecordTypeName__c === 'Product' || products[0][$scope.nsPrefix + 'RecordTypeName__c'] === 'Product';
        if (isRootProduct) {
            $scope.productsList[0].Price = products[0].Price;
            if (products[0].CalculatedPriceData) {
                $scope.productsList[0].CalculatedPriceData = products[0].CalculatedPriceData;
            }
            if (products[0].totalSumInsured) {
                $scope.productsList[0].totalSumInsured = products[0].totalSumInsured;
            }
            if (products[0].RawPriceData) {
                $scope.productsList[0].RawPriceData = products[0].RawPriceData;
            }
        }
        factor = factor || 1;
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            // Need to make a dummy $$hashKey because OS needs it, but I can't use the angular generated ones
            // because I need to use track by in my ng-repeats to retain databinding on buttonClick for Rules
            product.$$hashKey = product.$$hashKey || generateHashKey(i, factor);
            if (passedProductName) {
                product.parentProductName = passedProductName;
            }
            if (_.has(product, 'attributeCategories.records.length')) {
                for (let j = 0; j < product.attributeCategories.records.length; j++) {
                    const attrCat = product.attributeCategories.records[j];
                    attrCat.$$hashKey = attrCat.$$hashKey || generateHashKey(i + j, factor);
                    if (_.has(attrCat, 'productAttributes.records.length')) {
                        for (let k = 0; k < attrCat.productAttributes.records.length; k++) {
                            const prodAttr = attrCat.productAttributes.records[k];
                            if (!prodAttr.$$hashKey && prodAttr.constructor === Object) {
                                prodAttr.$$hashKey = generateHashKey(i + j + k, factor);
                            }
                            if (prodAttr.userValues && prodAttr.userValues !== null && prodAttr.userValues.constructor === Array) {
                                for (let l = 0; l < prodAttr.userValues.length; l++) {
                                    const userValue = prodAttr.userValues[l];
                                    if (!userValue.$$hashKey && userValue.constructor === Object) {
                                        userValue.$$hashKey = generateHashKey(i + j + k + l, factor);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Child Products
            if (_.has(product, 'childProducts.records.length')) {
                addHashKeys(product.childProducts.records, callback, factor * 3, product.instanceKey || product.Name);
            } else if (callback && i === products.length - 1) {
                callback(products);
            }
        }
    }

    // Helper function to loop through service result
    function loopThroughAttributes(products, isChildProducts) {
        let selectedCount = 0;
        let nonCoverageProducts = [];
        let returnObj = {};
        for (let i = 0; i < products.length; ++i) {
            let product = products[i];
            product.originalIndex = i;
            // Need to remove the child products that are not of RecordTypeName__c === "CoverageSpec" so the rest of
            // the UI data setup will work properly
            if (isChildProducts && ((!product.RecordTypeName__c && !product[$scope.nsPrefix + 'RecordTypeName__c']) || (product.RecordTypeName__c !== 'CoverageSpec' && product[$scope.nsPrefix + 'RecordTypeName__c'] !== 'CoverageSpec'))) {
                nonCoverageProducts.push(i);
            } else if (product.attributeCategories) {
                let attrCats = product.attributeCategories.records;
                if (attrCats) {
                    if (!product.numberCategories) {
                        product.numberCategories = attrCats.length;
                    } else {
                        product.numberCategories += attrCats.length;
                    }
                    for (let j = 0; j < attrCats.length; j++) {
                        let attrCat = attrCats[j];
                        if (attrCat.productAttributes) {
                            let prodAttrs = attrCat.productAttributes.records;
                            if (prodAttrs) {
                                if (!product.numberAttributes) {
                                    product.numberAttributes = prodAttrs.length;
                                } else {
                                    product.numberAttributes += prodAttrs.length;
                                }
                                for (let k = 0; k < prodAttrs.length; k++) {
                                    let prodAttr = prodAttrs[k];
                                    prodAttr.originalProductIndex = i;
                                    prodAttr.originalCategoryIndex = j;
                                    prodAttr.originalAttributeIndex = k;
                                    if (prodAttr.userValues && prodAttr.userValues !== null && typeof prodAttr.userValues === 'object' && prodAttr.userValues.length) {
                                        selectedCount = 0;
                                        for (let l = 0; l < prodAttr.userValues.length; l++) {
                                            let userValue = prodAttr.userValues[l];
                                            for (let key in userValue) {
                                                if (userValue[key]) {
                                                    selectedCount++;
                                                }
                                            }
                                        }
                                        prodAttr.multiSelectLabel = selectedCount + ' Selected';
                                    }
                                    // If dropdown has only 1 option, show as readonly
                                    if (prodAttr.inputType === 'dropdown' && prodAttr.values && prodAttr.values.length === 1) {
                                        prodAttr.readonly = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (product.childProducts && product.childProducts.records && isChildProducts) {
                return loopThroughAttributes(product.childProducts.records, true);
            }
        }
        returnObj = {
            products: products,
            nonCoverageCount: nonCoverageProducts.length
        };
        return returnObj;
    }

    // Sorts by root product, insured items, coverages
    /**
     * @param {Object} x
     * @param {Object} y
     */
    function sortCoverages(x, y) {
        if (x.RecordTypeName__c === 'Product' || x[$scope.nsPrefix + 'RecordTypeName__c'] === 'Product') {
            return -1;
        } else if (y.RecordTypeName__c !== 'CoverageSpec' && y[$scope.nsPrefix + 'RecordTypeName__c'] !== 'CoverageSpec') {
            return 1;
        }
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

    // Format and sort coverages so sortedCoverages can be repeated over in the UI (called on init)
    /**
     * @param {Array} products 
     * @param {Object} [initial] Product set used for adding the root product in basic coverages flow
     * @param {Function} [sortFunc]
     */
    function formatData(products, initial, sortFunc) {
        let coveragesAfterLoop;
        let foundFirstOptional = false;
        let productsReference = loopThroughAttributes(products).products;
        if (!sortFunc) {
            sortFunc = sortCoverages;
        }
        if (productsReference[0].childProducts && productsReference[0].childProducts.records) {
            coveragesAfterLoop = loopThroughAttributes(productsReference[0].childProducts.records, true);
        } else {
            coveragesAfterLoop = loopThroughAttributes(productsReference, true);
        }
        // We have to make a copy of coverages here because we're sorting them (a few lines below).
        // We need to retain the original order of childProducts in the main dataset in order to parse
        // attributes properly later on (in changeCoverage). $scope.sortedCoverages is looped over
        // separately than the main dataset.
        const coverages = angular.copy(coveragesAfterLoop.products);
        const coveragesCount = coverages.length - coveragesAfterLoop.nonCoverageCount;
        $scope.evaluatedCoverageCounter = {
            coverages: 0,
            lastNonOptionalIdx: 0
        };
        const sortedCoveragesKey = coverages[0].parentInstanceKey || coverages[0].parentProductName || coverages[0].Name;
        $scope.sortedCoverages[sortedCoveragesKey] = [];

        if (coverages && !$scope.sortedCoverages[sortedCoveragesKey].length) {
            $scope.sortedCoverages[sortedCoveragesKey] = coverages.sort(sortFunc);

            for (let i = 0; i < $scope.sortedCoverages[sortedCoveragesKey].length; i++) {
                let sortedCoverage = $scope.sortedCoverages[sortedCoveragesKey][i];
                if (sortedCoverage.RecordTypeName__c === 'CoverageSpec' || sortedCoverage[$scope.nsPrefix + 'RecordTypeName__c'] === 'CoverageSpec') {
                    $scope.evaluatedCoverageCounter.coverages++;
                    if (sortedCoverage.firstOptional) {
                        delete sortedCoverage.firstOptional;
                    }
                    if (sortedCoverage.lastNonOptional) {
                        delete sortedCoverage.lastNonOptional;
                    }
                    if (sortedCoverage.isSelected) {
                        $scope.evaluatedCoverageCounter.lastNonOptionalIdx = i;
                    }
                    if (sortedCoverage.isOptional) {
                        sortedCoverage.isOriginalOptional = true;

                        if (sortedCoverage.isSelected) {
                            sortedCoverage.isAddedOptional = true;
                        }
                    }
                    if (sortedCoverage.isOptional && !sortedCoverage.isSelected && !foundFirstOptional) {
                        sortedCoverage.firstOptional = true;
                        foundFirstOptional = true;
                    }
                    if ($scope.evaluatedCoverageCounter.coverages === coveragesCount) {
                        $scope.sortedCoverages[sortedCoveragesKey][$scope.evaluatedCoverageCounter.lastNonOptionalIdx].lastNonOptional = true;
                    }
                }
            }
            // Adds root product to top of sortedCoverages (does not apply for multi item and life templates)
            if (initial && !initial[0].hasInstanceKeys && initial[0].childProducts && initial[0].childProducts.records) {
                // Can't have childProducts or it creates an infinite loop of childProducts since
                // the parent product is at the top of the sortedCoverages array
                const initialCopy = angular.copy(initial);
                delete initialCopy[0].childProducts;
                $scope.sortedCoverages[sortedCoveragesKey].unshift(initialCopy[0]);
                if ($scope.sortedCoverages[sortedCoveragesKey][0].RecordTypeName__c === 'Product' || $scope.sortedCoverages[sortedCoveragesKey][0][$scope.nsPrefix + 'RecordTypeName__c'] === 'Product') {
                    $scope.sortedCoverages[sortedCoveragesKey][0].parentProduct = true;
                }
                if (!$scope.evaluatedCoverageCounter.coverages) {
                    $scope.sortedCoverages[sortedCoveragesKey][0].lastNonOptional = true;
                }
            }
        } else {
            $scope.sortedCoverages[sortedCoveragesKey] = productsReference;
            if ($scope.sortedCoverages[sortedCoveragesKey][0].RecordTypeName__c === 'Product' || $scope.sortedCoverages[sortedCoveragesKey][0][$scope.nsPrefix + 'RecordTypeName__c'] === 'Product') {
                $scope.sortedCoverages[0].parentProduct = true;
            }
        }
        // Used for rechecking when user navigates back and forth
        if (initial) {
            if (!baseCtrl.prototype.vlocOSInsConfigProductSet) {
                baseCtrl.prototype.vlocOSInsConfigProductSet = {};
            }
            baseCtrl.prototype.vlocOSInsConfigProductSet = $scope.sortedCoverages;
            baseCtrl.prototype.vlocOSInsConfigProductSet.timestamp = initial[0].timestamp;
        }
        console.log('$scope.sortedCoverages', $scope.sortedCoverages);
    }

    // When recalculating the price, OmniScript returns the data json to us, but we need to
    // reformat that data's changes into our Angular binded data. We know that the only thing
    // that will change is the Price field, so we kind of manually just update those prices below
    // in an effort to not overwrite any rule evaluations that have already taken place.
    /**
     * @param {Array} products Current level of products
     * @param {Boolean} [isCoverages] Set to true when products is the last level of childProducts (i.e., coverages)
     * @param {Number} [summedCoverages] Total price 
     * @param {Array} [originalProductSet]
     */
    function updatePrices(products, isCoverages, summedCoverages, originalProductSet) {
        summedCoverages = summedCoverages || 0;
        originalProductSet = originalProductSet || products;

        for (let i = 0, l = products.length; i < l; i++) {
            const product = products[i];
            let originalProduct = product;
            if (product.pathFromRoot) {
                originalProduct = _.get(originalProductSet, product.pathFromRoot);
            }
            if (product.hasOwnProperty('Price') && !isCoverages) {
                originalProduct.Price = product.Price;
                // This part only matters in a multi-item flow. childInsuredItemName will only exist
                // if this template is included as a child component of ins-os-multi-item
                if (baseCtrl.prototype.insuredItemNames && baseCtrl.prototype.insuredItemNames.childInsuredItemName === product.Name) {
                    if (product.Price === '') {
                        product.Price = 0;
                    }
                    summedCoverages += product.Price;
                }
            } else if (originalProduct.Price && isCoverages) {
                // When the products passed in are $scope.sortedCoverages, we want to do the opposite
                // because we've already updated originalProductSet's prices
                product.Price = originalProduct.Price;
            } else {
                originalProduct.Price = '';
            }
            console.log('originalProduct', originalProduct);
            if (product.childProducts && product.childProducts.records) {
                // if the childProducts have no childProducts, we're at the last level which always includes the coverages
                let foundChildProducts = false;
                for (let j = 0; j < product.childProducts.records.length; j++) {
                    const child = product.childProducts.records[j];
                    if (child.childProducts) {
                        foundChildProducts = true;
                        break;
                    }
                }
                if (!foundChildProducts) {
                    isCoverages = true;
                }
                updatePrices(product.childProducts.records, isCoverages, summedCoverages, originalProductSet);
            }
        }
        console.log('products after updatePrices', products);
        if (summedCoverages && !isCoverages && originalProductSet && (originalProductSet[0].RecordTypeName__c === 'Product' || originalProductSet[0][$scope.nsPrefix + 'RecordTypeName__c'] === 'Product')) {
            originalProductSet[0].Price = summedCoverages;
        }
        return products;
    }

    // Helper function to format remoteResp and update prices
    /**
     * @param {Object} remoteResp Response from remote method
     * @param {Object} [product] Coverage (not available from recalculate button)
     * @param {Object} productsFromAddHashKeys Coverages with hash keys
     * @param {String} [shouldFormatData] Parent product's instanceKey (only for multi-item)
     * @param {Boolean} [pricesUpdated] Decides whether to reprice
     * @param {Object} [response] bpTree.response
     * @param {Object} [control] SI Element control
     * @param {Object} [scp] Element scope
     * @param {String} [currentTextValue] User input
     * @param {Function} [sortFunc]
     */
    function changeCoverageHelper(remoteResp, product, productsFromAddHashKeys, shouldFormatData, pricesUpdated, response, control, scp, currentTextValue, sortFunc) {
        // shouldFormatData gets passed as the parent product's instanceKey so we can use
        // it as the key in $scope.sortedCoverages. This happens in multi-item when copying
        // one product to another
        if (shouldFormatData) {
            formatData($scope.sortedCoverages[shouldFormatData], null, sortFunc);
        }
        // Cannot just re-run formatData() because it wipes out the rules evaluations
        // Pass remoteResp[control.name] to updatePrices because it'll have the hashKeys,
        // but the return from hashKeys is the last level of childProducts, not the whole
        // dataset
        if (!pricesUpdated) {
            // Update prices for control object
            $scope.productsList = updatePrices(remoteResp[control.name]);
            control.response = $scope.productsList;
            control.vlcSI[control.itemsKey] = $scope.productsList;
            // Re-sort coverages
            formatData(productsFromAddHashKeys, control.response);
        }
        scp.aggregate(scp, control.index, control.indexInParent, true, -1);
        if ($scope.changeCoverageChain.moreQueued.length) {
            $scope.changeCoverage(response, control, scp, $scope.changeCoverageChain.moreQueued[0].product, $scope.changeCoverageChain.moreQueued[0].attribute, currentTextValue);
            $scope.changeCoverageChain.currentSetValues.splice(0, 1);
            $scope.changeCoverageChain.moreQueued.splice(0, 1);
        }
        $scope.calcConfig.calculationDone = true;
    }

    function getValueLabel(attribute) {
        if (!attribute) return;
        let formattedUserValues = '';
        for (let i = 0; i < attribute.values.length; i++) {
            if (attribute.values[i].value === attribute.userValues) {
                formattedUserValues = attribute.values[i].label;
            }
        }
        return formattedUserValues;
    }

    // Calls OmniScript buttonClick function, will perform remote action (and optional preProcess method) defined on the Selectable Item
    // that houses this template
    /**
     * @param {Object} control Element control
     * @param {Object} scp Element scope
     * @param {Object|undefined} selectedItem In Selectable Items El case, the item selected by the user where they trigger the remote call
     * @param {String} operation The operation of the remote call ('Delete', 'Add', etc.)
     * @param {Function|undefined} customizer The customized function to be called once the remote call promise comes back
     */
    function remoteInvoke(control, scp, selectedItem, operation, customizer) {
        const deferred = $q.defer();
        // Have to propagate control.response back to dataJSON before buttonClick
        scp.aggregate(scp, control.index, control.indexInParent, true, -1);
        if (control.propSetMap.preProcessClass && control.propSetMap.preProcessMethod) {
            const remoteClass = control.propSetMap.remoteClass;
            const remoteMethod = control.propSetMap.remoteMethod;
            // Override remoteClass and remoteMethod for first buttonClick call
            control.propSetMap.remoteClass = control.propSetMap.preProcessClass;
            control.propSetMap.remoteMethod = control.propSetMap.preProcessMethod;

            scp.buttonClick($scope.bpTreeResponse, control, scp, selectedItem, operation, customizer, function(response1) {
                // Preprocess method returns configureProduct object so assign it back to payload for second buttonClick call
                const bpTreeResponseKey = 'configureProduct';
                $scope.bpTreeResponse[bpTreeResponseKey] = response1;
                control.propSetMap.remoteClass = remoteClass;
                control.propSetMap.remoteMethod = remoteMethod;
                
                scp.buttonClick($scope.bpTreeResponse, control, scp, selectedItem, operation, customizer, function(response2) {
                    deferred.resolve(response2);
                });
            });
        } else {
            scp.buttonClick($scope.bpTreeResponse, control, scp, selectedItem, operation, customizer, function(remoteResp) {
                deferred.resolve(remoteResp);
            });
        }

        return deferred.promise;
    }

    function isCorrectCoverages(product, coverages) {
        // For single product template
        if (!product || !product.parentInstanceKey) {
            return true;
        }
        // For multi-item template, select correct set of coverages
        if (coverages[0].parentInstanceKey === product.parentInstanceKey) {
            return true;
        }
        return false;
    }

    $scope.decideCoverageCardClassNames = function(coverage) {
        let classNames = '';
        if (coverage.parentProduct && $scope.insCoveragesConfig.showParentProduct) {
            classNames = classNames + ' parent-product';
        }
        if (coverage.isOriginalOptional) {
            classNames = classNames + ' optional-coverage';
        }
        if (coverage.lastNonOptional) {
            classNames = classNames + ' last-non-optional';
        }
        if (coverage.isAddedOptional) {
            classNames = classNames + ' added-optional-coverage';
        }
        if (!$scope.evaluatedCoverageCounter.coverages && (coverage.RecordTypeName__c === 'Product' || coverage[$scope.nsPrefix + 'RecordTypeName__c'] === 'Product')) {
            classNames = classNames + ' only-root';
        }
        if (coverage.showTypeHeader) {
            classNames = classNames + ' show-type-header';
        }
        return classNames;
    };

    $scope.formatUserValues = function(attribute) {
        if (attribute.dataType === 'currency') {
            attribute.formattedUserValues = $filter('currency')(attribute.userValues, $scope.currencyCode, 0);
        } else if (attribute.dataType === 'percentage') {
            if (attribute.inputType === 'dropdown') {
                attribute.formattedUserValues = getValueLabel(attribute) + '%';
            } else {
                attribute.formattedUserValues = attribute.userValues + '%';
            }
        } else if (attribute.dataType === 'date') {
            attribute.formattedUserValues = $scope.formatDate(attribute.userValues);
        } else if (attribute.dataType === 'datetime') {
            attribute.formattedUserValues = $scope.formatDate(attribute.userValues, true);
        } else {
            if (attribute.inputType === 'dropdown') {
                attribute.formattedUserValues = getValueLabel(attribute);
            } else {
                attribute.formattedUserValues = attribute.userValues;
            }
        }
        return attribute.formattedUserValues;
    };

    // Adds paths to root product, coverages and attributes in control.vlcSI[control.itemsKey],
    // 
    // then assigns to $scope.productsList
    /**
     * @param {Array} products control.vlcSI[control.itemsKey]
     * @param {Object} response baseCtrl.$scope.bpTree.response
     * @param {String} [subsequentVisit] If the user goes back and selects a new product
     */
    $scope.createData = function(products, response, subsequentVisit) {
        $scope.productsList = products;
        $scope.bpTreeResponse = response;
        console.log('products:\n', products, '\nresponse:\n', response);
        // Create object to power "Same as..." and changing the driver
        if (!$scope.consolidatedData) {
            $scope.consolidatedData = {
                childInsuredItems: {},
                grandChildInsuredItems: {}
            };
        } 
        const rootProduct = products[0];
        rootProduct.pathFromRoot = '[0]';
        rootProduct.pathFromChild = '[0]';
        rootProduct.instanceKeyChildren = 0;
        if (rootProduct.attributeCategories && rootProduct.attributeCategories.records) {
            const attrCategories = rootProduct.attributeCategories.records;
            for (let i = 0; i < attrCategories.length; i++) {
                if (attrCategories[i].productAttributes) {
                    const prodAttributes = attrCategories[i].productAttributes.records;
                    for (let j = 0; j < prodAttributes.length; j++) {
                        prodAttributes[j].pathFromRoot = 'attributeCategories.records[' + i + '].productAttributes.records[' + j + ']';
                        prodAttributes[j].pathFromChild = 'attributeCategories.records[' + i + '].productAttributes.records[' + j + ']';
                    }
                }
            }
        }
        // Assume 1 root product (flow doesn't make sense with more than 1)
        if (rootProduct.childProducts && rootProduct.childProducts.records) {
            const childProducts = rootProduct.childProducts.records;
            rootProduct.childProductsCount = childProducts.length;
            // Loop over childProducts
            for (let i = 0; i < childProducts.length; i++) {
                let instanceKey = childProducts[i].instanceKey;
                childProducts[i].pathFromRoot = '[0].childProducts.records[' + i + ']';
                if (instanceKey) {
                    rootProduct.instanceKeyChildren++;
                    if ($scope.multiPersonSameAsData) {
                        $scope.multiPersonSameAsData.push({
                            label: 'Same as ' + instanceKey,
                            name: instanceKey,
                        });
                    }
                }
                if (baseCtrl.prototype.insuredItemNames && (childProducts[i].Name === baseCtrl.prototype.insuredItemNames.childInsuredItemName || childProducts[i].productName === baseCtrl.prototype.insuredItemNames.childInsuredItemName)) {
                    // instanceKey should be Name if no instanceKey
                    instanceKey = instanceKey || childProducts[i].Name;
                    // Need to add an indication on the root product that this flow contains instanceKeys
                    if (rootProduct.RecordTypeName__c === 'Product' || rootProduct[$scope.nsPrefix + 'RecordTypeName__c'] === 'Product') {
                        rootProduct.hasInstanceKeys = true;
                    }
                    const tempObj = {
                        name: instanceKey,
                        id: childProducts[i].Id,
                        indexInJson: i,
                        coverages: childProducts[i].childProducts.records
                    };
                    if (!$scope.consolidatedData.childInsuredItems[instanceKey]) {
                        $scope.consolidatedData.childInsuredItems[instanceKey] = {};
                    }
                    $scope.consolidatedData.childInsuredItems[instanceKey] = tempObj;
                }
                if (childProducts[i].attributeCategories && childProducts[i].attributeCategories.records) {
                    const attrCategories = childProducts[i].attributeCategories.records;
                    for (let j = 0; j < attrCategories.length; j++) {
                        if (attrCategories[j].productAttributes) {
                            const prodAttributes = attrCategories[j].productAttributes.records;
                            for (let k = 0; k < prodAttributes.length; k++) {
                                prodAttributes[k].pathFromRoot = 'childProducts.records[' + i + '].attributeCategories.records[' + j + '].productAttributes.records[' + k + ']';
                                prodAttributes[k].pathFromChild = 'attributeCategories.records[' + j + '].productAttributes.records[' + k + ']';
                            }
                        }
                    }
                }
                if (childProducts[i].childProducts && childProducts[i].childProducts.records) {
                    const grandChildProducts = childProducts[i].childProducts.records;
                    childProducts[i].childProductsCount = grandChildProducts.length;
                    for (let k = 0; k < grandChildProducts.length; k++) {
                        grandChildProducts[k].pathFromRoot = '[0].childProducts.records[' + i + '].childProducts.records[' + k + ']';
                        if (!grandChildProducts[k].parentInstanceKey) {
                            grandChildProducts[k].parentInstanceKey = instanceKey;
                        }
                        grandChildProducts[k].formattedParentInstanceKey = grandChildProducts[k].parentInstanceKey.replace(/\s/g, '-').toLowerCase();
                        if (grandChildProducts[k].attributeCategories && grandChildProducts[k].attributeCategories.records) {
                            const attrCategories = grandChildProducts[k].attributeCategories.records;
                            for (let m = 0; m < attrCategories.length; m++) {
                                if (attrCategories[m].productAttributes && attrCategories[m].productAttributes.records) {
                                    const prodAttributes = attrCategories[m].productAttributes.records;
                                    for (let o = 0; o < prodAttributes.length; o++) {
                                        prodAttributes[o].parentProductCode = grandChildProducts[k].ProductCode;
                                        prodAttributes[o].pathFromRoot = 'childProducts.records[' + k + '].attributeCategories.records[' + m + '].productAttributes.records[' + o + ']';
                                        prodAttributes[o].pathFromChild = 'attributeCategories.records[' + m + '].productAttributes.records[' + o + ']';
                                        const tempObj = {
                                            name: grandChildProducts[k].productName || grandChildProducts[k].Name,
                                            productCode: grandChildProducts[k].ProductCode,
                                            categoryCode: attrCategories[m].Code__c,
                                            attributeCode: prodAttributes[o].code,
                                            pathFromRoot: prodAttributes[o].pathFromRoot,
                                            pathFromChild: prodAttributes[o].pathFromChild
                                        };
                                        if (grandChildProducts[k].instanceKey) {
                                            tempObj.instanceKey = grandChildProducts[k].instanceKey;
                                        }
                                        if (grandChildProducts[k].parentInstanceKey) {
                                            tempObj.parentInstanceKey = grandChildProducts[k].parentInstanceKey;
                                        }
                                        if (!$scope.consolidatedData.grandChildInsuredItems[instanceKey]) {
                                            $scope.consolidatedData.grandChildInsuredItems[instanceKey] = {};
                                        }
                                        if (!$scope.consolidatedData.grandChildInsuredItems[instanceKey][grandChildProducts[k].ProductCode]) {
                                            $scope.consolidatedData.grandChildInsuredItems[instanceKey][grandChildProducts[k].ProductCode] = [];
                                        }
                                        $scope.consolidatedData.grandChildInsuredItems[instanceKey][grandChildProducts[k].ProductCode].push(tempObj);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log('$scope.consolidatedData', $scope.consolidatedData);
        if (subsequentVisit) {
            $scope.setSelectedOption($scope.controlRef, $scope.productsList[0], $scope.optionRef, $scope.scpReference);
        }
        console.log('$scope.productsList', $scope.productsList);
    };

    // Initial data formatting
    /**
     * @param {Object} control Element control
     * @param {Object} p Product
     * @param {Object} option default OS property
     * @param {Object} scp Element scope
     * @param {Function} [sortFunc]
     */
    $scope.setSelectedOption = function(control, p, option, scp, sortFunc) {
        if (control === undefined || control === null) {
            return;
        }
        console.log('control', control);
        console.log('%c' + p.Name + ' Data:', 'font-size: 14px; color: aqua; font-style: italic;', p);
        control.vlcSI[control.itemsKey][0].timestamp = new Date().getTime();
        $scope.controlRef = control;
        $scope.optionRef = option;
        $scope.scpReference = scp;
        if (control.propSetMap.hasOwnProperty('disableAutoCalculate')) {
            $scope.calcConfig.disableAutoCalculate = control.propSetMap.disableAutoCalculate;
        }

        addHashKeys($scope.productsList, function(coverages) {
            // For each product in productsList, addHashKeys returns the last level of childProducts
            // Call formatData to sort each set of coverages
            formatData(coverages, control.vlcSI[control.itemsKey], sortFunc);
        });
        // Assign control.response for OS aggregate calls
        control.response = $scope.productsList;
        if (control.propSetMap.dataJSON) {
            // scope of the selectable item element in OS, index of the element, parent index of element, optional (true), optional (-1)
            console.log('scp from setSelectedOption', scp);
            scp.aggregate(scp, control.index, control.indexInParent, true, -1);
        }
        if (control.propSetMap.remoteClass && control.propSetMap.remoteMethod) {
            $scope.insCoveragesConfig.remoteMethod = true;
        }
    };

    // Called when the user changes a coverage or clicks the recalculate button
    /**
     * @param {Object} response JSON input (bpTree.response)
     * @param {Object} control SI Element control
     * @param {Object} scp Element scope
     * @param {Object} [product] Coverage (not available from recalculate button)
     * @param {Object} [attribute] Coverage attribute
     * @param {String} [currentTextValue] User input
     * @param {String} [shouldFormatData] Parent product's instanceKey (only for multi-item)
     */
    $scope.changeCoverage = function(response, control, scp, product, attribute, currentTextValue, shouldFormatData) {
        // When method is called from single coverage change
        if (product && attribute) {
            const productInResponse = _.get(control.response, product.pathFromRoot);
            const attributeInResponse = _.get(productInResponse, attribute.pathFromChild);
            attributeInResponse.userValues = attribute.userValues;
        }
    
        if ($scope.calcConfig.disableAutoCalculate) {
            if (!$scope.calcConfig.triggerCalculate) {
                $scope.calcConfig.calculationDone = false;
                $timeout(function() {
                    // Prevent next step until repricing is done
                    angular.element('#' + control.name).scope().loopform.$setValidity('recalculated', false);
                    console.log('Calculate price before moving forward');
                });
                // Return since call didn't come from recalculate button
                return;
            }
            $scope.calcConfig.triggerCalculate = false;
        }
    
        // Need this to happen on the next digest cycle to give the rules time to evaluate
        const pricesUpdated = false;
        $timeout(function() {
            if (product) {
                if (product.hasOwnProperty('errorMessage') && product.errorMessage) {
                    angular.element('#' + control.name).scope().loopform.$setValidity('rules', false);
                    console.log('set step to invalid because an error message appeared', attribute);
                } else {
                    angular.element('#' + control.name).scope().loopform.$setValidity('rules', true);
                    console.log('set step to valid because an error message did not appear', attribute);
                }
            }
        });
        if ($scope.insCoveragesConfig.callButtonClick && $scope.insCoveragesConfig.remoteMethod) {
            if (product && product.parentInstanceKey && $scope.consolidatedData && !$scope.multiPersonTemplate) {
                const indexInJson = $scope.consolidatedData.childInsuredItems[product.parentInstanceKey].indexInJson;
                const coverageLocation = $scope.productsList[0].childProducts.records[indexInJson];
                coverageLocation.customizeIcon = '../resource/' + baseCtrl.prototype.$scope.nsPrefix + 'InsMultiItemImages/orange-customize-icon.svg';
                coverageLocation.currentCoverageConfiguration = 'Custom Coverage';
            }
            if (currentTextValue || currentTextValue === 0) {
                if (attribute.userValues && attribute.userValues !== currentTextValue) {
                    remoteInvoke(control, scp, undefined, 'typeAheadSearch', undefined)
                        .then(function(remoteResp) {
                            if (remoteResp[control.name]) {
                                let selectedCoverages;
                                addHashKeys(remoteResp[control.name], function(coverages) {
                                    if (isCorrectCoverages(product, coverages)) {
                                        selectedCoverages = coverages;
                                    }
                                });
                                changeCoverageHelper(remoteResp, product, selectedCoverages, shouldFormatData, pricesUpdated, response, control, scp, currentTextValue);
                            }
                        })
                        .catch(angular.noop);
                }
            } else {
                remoteInvoke(control, scp, undefined, 'typeAheadSearch', undefined)
                    .then(function(remoteResp) {
                        if (remoteResp[control.name]) {
                            let selectedCoverages;
                            addHashKeys(remoteResp[control.name], function(coverages) {
                                if (isCorrectCoverages(product, coverages)) {
                                    selectedCoverages = coverages;
                                }
                            });
                            changeCoverageHelper(remoteResp, product, selectedCoverages, shouldFormatData, pricesUpdated, response, control, scp, currentTextValue);
                        }
                    })
                    .catch(angular.noop);
            }
        }
        $timeout(function() {
            angular.element('#' + control.name).scope().loopform.$setValidity('recalculated', true);
            console.log('Price up to date');
        });
        console.log('changeCoverage done');
    };

    $scope.selectOptionalCoverage = function(product, response, control, scp, sortFunc) {
        if (!product.isOptional) {
            console.log('not optional', product);
            return;
        }
        const productInResponse = _.get(control.response, product.pathFromRoot);
        productInResponse.isSelected = !productInResponse.isSelected;
        productInResponse.isAddedOptional = !productInResponse.isAddedOptional;
        product.isAddedOptional = !product.isAddedOptional;
        if (!$scope.multiPersonTemplate) {
            // In the life template, we're using the default checkbox input so when it is clicked by the user,
            // the ng-model updates isSelected. In other flows, the checkbox is actually the label styled as a 
            // large checkbox, so the click never registers on the input so we need to update isSelected manually
            product.isSelected = !product.isSelected;
            // Move product on page before repricing
            formatData($scope.sortedCoverages[product.parentInstanceKey || product.parentProductName], null, sortFunc);
        }
        
        if ($scope.calcConfig.disableAutoCalculate) {
            $scope.calcConfig.calculationDone = false;
            $timeout(function() {
                // Prevent next step until repricing is done
                angular.element('#' + control.name).scope().loopform.$setValidity('recalculated', false);
                console.log('Calculate price before moving forward');
            });
            // Return since call didn't come from recalculate button
            return;
        }
        
        if ($scope.insCoveragesConfig.callButtonClick && $scope.insCoveragesConfig.remoteMethod) {
            remoteInvoke(control, scp, undefined, 'typeAheadSearch', undefined)
                .then(function(remoteResp) {
                    let selectedCoverages;
                    addHashKeys(remoteResp[control.name], function(coverages) {
                        if (isCorrectCoverages(product, coverages)) {
                            selectedCoverages = coverages;
                        }
                    });
                    $rootScope.attributeUserValues = {}; // Need to clear out rules object
                    changeCoverageHelper(remoteResp, product, selectedCoverages, null, false, response, control, scp);
                })
                .catch(angular.noop);
        }
    };

    $scope.doAccordion = function(child) {
        if (!$scope.insCoveragesConfig.coverageAccordion) {
            return false;
        } else if (child.parentProduct) {
            return false;
        } else {
            if (!$scope.insCoveragesConfig.attrCatAccordion) {
                if (child.numberAttributes && child.numberAttributes < $scope.insCoveragesConfig.coverageAccordionMinAttrs) {
                    return false;
                } else if (child.numberAttributes) {
                    return true;
                } else {
                    return false;
                }
            } else {
                if (child.numberCategories && child.numberCategories < $scope.insCoveragesConfig.attrCatAccordionMinCats) {
                    return false;
                } else if (child.numberCategories) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    };

    $scope.addCheckboxValue = function(value, response, control, scp, child, attribute) {
        let selectedCount = 0;
        for (let i = 0; i < attribute.userValues; i++) {
            let userValue = attribute.userValues[i];
            if (value.value in userValue) {
                userValue[value.value] = !userValue[value.value];
            }
            for (let key in userValue) {
                if (userValue[key]) {
                    selectedCount++;
                }
            }
        }
        attribute.multiSelectLabel = selectedCount + ' Selected';
        $scope.changeCoverage(response, control, scp, child, attribute);
        console.log('multiselect userValues', attribute.userValues);
        console.log('$scope.sortedCoverages', $scope.sortedCoverages);
    };

    // Only for multiselect dropdowns
    $scope.countSelected = function(attribute) {
        if (attribute.userValues && attribute.userValues.constructor === Array) {
            attribute.multiSelectCount = attribute.userValues.length;
        } else {
            attribute.userValues = [];
            attribute.multiSelectCount = 0;
        }
    };

    // Only for multiselect dropdowns
    $scope.toggleValue = function(attribute, value, index, response, control, scp, child) {
        if (value.ruleSetValue) {
            return;
        }
        if (!attribute.userValues) {
            attribute.userValues = [];
        }
        if (attribute.userValues.indexOf(value.value) > -1) {
            attribute.userValues.splice(attribute.userValues.indexOf(value.value), 1);
        } else {
            attribute.userValues.push(value.value);
        }
        $scope.countSelected(attribute);
        $scope.changeCoverage(response, control, scp, child, attribute);
    };

    $rootScope.insOSCoveragesDropdowns = {};
    $rootScope.toggleDropdown = function(attribute) {
        if ($rootScope.insOSCoveragesDropdowns[attribute.attributeId]) {
            $rootScope.insOSCoveragesDropdowns[attribute.attributeId] = false;
        } else {
            $rootScope.insOSCoveragesDropdowns[attribute.attributeId] = true;
        }
    };

    $scope.formatDate = function(date, isDatetime) {
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

    $scope.stopPropagation = function(event) {
        event.stopPropagation();
    };

    $scope.formatId = function(arr) {
        const formattedStrings = arr.map(function(str) {
            if (str || str === 0) {
                return str.toString().replace(/\s+/g, '-');
            }
        });
        return formattedStrings.join('-');
    };
}]);

vlocity.cardframework.registerModule.directive('insOsIncludeTemplate', function($templateRequest, $compile) {
    'use strict';
    return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: false,
        link: function($scope, element, attrs) {
            let templatePath = attrs.insOsIncludeTemplate;
            $templateRequest(templatePath).then(function(response) {
                let contents = element.html(response).contents();
                $compile(contents)($scope.$new(false, $scope.$parent));
            });
        }
    };
});

vlocity.cardframework.registerModule.directive('insOsDropdownHandler', function($document) {
    'use strict';
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            let focused = false;
            let initial = false;
            const elementEvents = attrs.useFocus === 'true' || attrs.useFocus === undefined ? 'click focus' : 'click';
            const parentElement = attrs.parentElement ? angular.element(attrs.parentElement) : element;
            const onClick = function(event) {
                const isChild = parentElement.has(event.target).length > 0;
                const isSelf = parentElement[0] == event.target;
                const isInside = isChild || isSelf;
                let className = event.target.className;
                if (event.target.parentElement) {
                    className = className + ' ' + event.target.parentElement.className;
                }
                if (initial && isInside) {
                    return;
                }
                if (event.target.nodeName === 'path') {
                    className = event.target.parentElement.parentElement.className;
                } else if (event.target.nodeName === 'svg') {
                    className = event.target.parentElement.className;
                }
                if ((!isInside && className.indexOf(attrs.restrictElement) < 0) || (isInside && className.indexOf(attrs.restrictElement) < 0 && !attrs.hasOwnProperty('ngClick'))) {
                    scope.$apply(attrs.insOsDropdownHandler);
                    $document.off('click', onClick);
                    focused = false;
                }
            };
            element.on(elementEvents, function() {
                if (!focused) {
                    scope.$apply(attrs.insOsDropdownHandler);
                    $document.on('click', onClick);
                    initial = true;
                    focused = true;
                }
            });
        }
    };
});

vlocity.cardframework.registerModule.directive('insOsCalcHeight', ['$timeout', function($timeout) {
    'use strict';
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            const watchElementsClassNames = [
                '.vloc-ins-coverages-heading',
                '.vloc-ins-coverages-card-inner-wrapper'
            ];
            scope.$watch(
                // This function returns the value that is watched in the next function.
                // Collecting the length of child elements that would affect the height of this container.
                function() {
                    let watchElementsLength = 0;
                    watchElementsLength = watchElementsLength + element[0].children.length;
                    for (let i = 0; i < watchElementsClassNames.length; i++) {
                        let watchElementsClassName = watchElementsClassNames[i];
                        if ($(element[0]).find(watchElementsClassName) && $(element[0]).find(watchElementsClassName).length) {
                            watchElementsLength = watchElementsLength + $(element[0]).find(watchElementsClassName).length;
                        }
                    }
                    return watchElementsLength;
                },
                function(newValue, oldValue) {
                    let containerHeight = 0;
                    if (newValue !== oldValue || !attrs.style) {
                        $timeout(function() {
                            for (let i = 0; i < element[0].children.length; i++) {
                                containerHeight += $(element[0].children[i]).outerHeight(true);
                            }
                            containerHeight = containerHeight + 'px';
                            console.log('updated container height to: ', containerHeight);
                            $(element[0]).css({height: containerHeight});
                        }, 1000);
                    }
                }
            );
        }
    };
}]);