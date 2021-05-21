/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insMultiItemCtrl', ['$scope', '$rootScope', '$q', '$controller', '$timeout', function($scope, $rootScope, $q, $controller, $timeout) {
    'use strict';
    // insCoveragesCtrl is the JS Angular controller in ins-os-coverages-component which
    // is the component for coverages
    angular.extend(this, $controller('insCoveragesCtrl', {$scope: $scope}));
    $scope.vehicleTypes = {
        'PASSENGER CAR': {
            'fileName': 'passenger-car.svg'
        },
        'PASSENGER CAR CONVERTIBLE': {
            'fileName': 'convertible.svg'
        },
        'PASSENGER CAR COUPE': {
            'fileName': 'coupe.svg'
        },
        'MULTIPURPOSE PASSENGER VEHICLE': {
            'fileName': 'multipurpose-passenger-vehicle.svg'
        },
        'MULTIPURPOSE PASSENGER VEHICLE (MPV)': {
            'fileName': 'multipurpose-passenger-vehicle.svg'
        },
        'TRUCK': {
            'fileName': 'truck.svg'
        },
        'BUS': {
            'fileName': 'bus.svg'
        },
        'MOTORCYCLE': {
            'fileName': 'motorcycle.svg'
        },
        'MOTOR DRIVEN CYCLE': {
            'fileName': 'motor-driven-cycle.svg'
        },
        'TRAILER': {
            'fileName': 'trailer.svg'
        },
        'LOW-SPEED VEHICLE': {
            'fileName': 'low-speed-vehicle.svg'
        },
        'LOW-SPEED VEHICLE (LSV)': {
            'fileName': 'low-speed-vehicle.svg'
        }
    };
    baseCtrl.prototype.insuredItemNames = {};
    $scope.initMultiAuto = function() {
        // We're assuming there will only be two keys returned:
        const insuredItems = baseCtrl.prototype.$scope.bpTree.response.insuredItems;
        const insuredItemKeys = Object.keys(insuredItems);
        if (insuredItemKeys.length === 2) {
            // isParent is true for child items (autos) and false for grandchild items (drivers)
            if (insuredItems[insuredItemKeys[0]][0].isParent || insuredItems[insuredItemKeys[0]][0].isPrimary) {
                baseCtrl.prototype.insuredItemNames.childInsuredItemName = insuredItemKeys[0];
                baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName = insuredItemKeys[1];
            } else {
                baseCtrl.prototype.insuredItemNames.childInsuredItemName = insuredItemKeys[1];
                baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName = insuredItemKeys[0];
            }
        // Just in case the script needs to return more than 2 keys, the child and grandChild can
        // be defined in the OmniScript seed data JSON:
        } else if (insuredItemKeys.length > 2) {
            baseCtrl.prototype.insuredItemNames = {
                childInsuredItemName: baseCtrl.prototype.$scope.bpTree.propSetMap.seedDataJSON.childInsuredItemName,
                grandChildInsuredItemName: baseCtrl.prototype.$scope.bpTree.propSetMap.seedDataJSON.grandChildInsuredItemName
            };
        }
        // Reformat vehicle data for vehicle images
        $scope.insuredItemsFormatted = {};
        const childInsuredItems = insuredItems[baseCtrl.prototype.insuredItemNames.childInsuredItemName];
        for (let i = 0; i < childInsuredItems.length; i++) {
            const child = childInsuredItems[i];
            childInsuredItemsHelper(child);
        }
    };
    $scope.multiItemTemplate = true;
    $scope.initMultiAuto();
    $scope.customTemplates = baseCtrl.prototype.$scope.bpTree.propSetMap.elementTypeToHTMLTemplateMapping;
    $scope.rootProducts = [];

    // Listen for event from the Drivers modal
    document.addEventListener('ins-os-multi-item-modal-send-data', function(e) {
        const driverData = e.detail.driverData;
        if (driverData && driverData[driverData.productInstanceKey]) {
            const product = _.get($scope.productsList, driverData[driverData.productInstanceKey].productPathFromRoot);
            product.primaryParty = driverData[driverData.productInstanceKey].primaryParty;
            product.otherParties = driverData[driverData.productInstanceKey].otherParties;
            $scope.changeDrivers(product, driverData[driverData.productInstanceKey], $scope, $scope.controlRef);
        }
    });

    // Update vehicle type and add to insuredItemsFormatted for vehicle images
    /**
     * @param {Object} child Vehicle
     */
    function childInsuredItemsHelper(child) {
        if (child.BodyClass.toLowerCase().indexOf('convertible') > -1) {
            child.VehicleType += ' CONVERTIBLE';
        }
        if (child.BodyClass.toLowerCase().indexOf('coupe') > -1) {
            child.VehicleType += ' COUPE';
        }
        $scope.insuredItemsFormatted[child.instanceKey] = child;
    }

    // Update pathFromRoot with new index
    /**
     * @param {Object} item Attribute or child product
     * @param {Number} idx New index
     * @param {Boolean} [isChildProduct] Update child product path
     */
    function updatePathFromRoot(item, idx, isChildProduct) {
        const parts = item.pathFromRoot.split('records');
        if (isChildProduct) {
            // pathFromRoot === "[*].childProducts.records[*].childProducts.records[*]"
            parts[2] = '[' + idx + ']';
        } else {
            // pathFromRoot === "childProducts.records[*].attributeCategories.records[*].productAttributes.records[*]"
            const pieces = parts[1].split('.');
            parts[1] = '[' + idx + '].' + pieces[1] + '.';
        }
        item.pathFromRoot = parts.join('records');
    }

    // Update product with new driver attributes
    /**
     * @param {Object} vehicleProduct Child of root product
     * @param {Object} driverProduct Newly created driver product
     * @param {Object} driverData Data from insuredItems
     */
    function setDriverAttributes(vehicleProduct, driverProduct, driverData) {
        driverProduct.instanceKey = driverData.instanceKey;
        driverProduct.Name = driverData.instanceKey;
        const driverAttributes = driverProduct.attributeCategories.records[0].productAttributes.records;
        angular.forEach(driverAttributes, function(attr) {
            updatePathFromRoot(attr, vehicleProduct.childProducts.records.length - 1);
            // Sync new userValue
            if (driverData[attr.code]) {
                attr.userValues = driverData[attr.code];
            }
        });
    }

    // Set driver data for vehicle
    /**
     * @param {Object} product Vehicle
     * @param {Object} driverData Primary and other drivers
     */
    function populateDriverData(product, driverData) {
        const deferred = $q.defer();
        // Separate out all driver products
        let genericDriverProduct;
        const filteredChildProducts = [];
        for (let i = 0; i < product.childProducts.records.length; i++) {
            const childProduct = product.childProducts.records[i];
            if (childProduct.ProductCode === 'DRIVER') {
                if (!genericDriverProduct) {
                    // Repurpose single driver product as generic
                    childProduct.Name = '';
                    if (childProduct.hasOwnProperty('isPrimaryChild')) {
                        delete childProduct.isPrimaryChild;
                    }
                    genericDriverProduct = childProduct;
                }
            } else {
                filteredChildProducts.push(childProduct);
            }
        }
        product.childProducts.records = filteredChildProducts;
        // Add product for primary driver
        const primaryDriverData = driverData.primaryParty;
        const primaryDriverProduct = angular.copy(genericDriverProduct);
        primaryDriverProduct.isPrimaryChild = true;
        product.childProducts.records.push(primaryDriverProduct);
        // Repopulate vehicle with primary driver data
        setDriverAttributes(product, primaryDriverProduct, primaryDriverData);
        // Add secondary drivers
        for (let i = 0; i < driverData.otherParties.length; i++) {
            const secondaryDriverData = driverData.otherParties[i];
            const secondaryDriverProduct = angular.copy(genericDriverProduct);
            product.childProducts.records.push(secondaryDriverProduct);
            setDriverAttributes(product, secondaryDriverProduct, secondaryDriverData);
        }
        // Update paths to sync with new childProducts order
        angular.forEach(product.childProducts.records, function(childProduct, idx) {
            updatePathFromRoot(childProduct, idx, true);
        });

        deferred.resolve(product);
        return deferred.promise;
    }

    $scope.openDriversModal = function(scp, control, childProduct) {
        control.vlcSI[control.itemsKey][0].vlcCompSelected = true;
        control.vlcSI[control.itemsKey][0].editDrivers = {
            instanceKey: childProduct.instanceKey,
            pathFromRoot: childProduct.pathFromRoot
        };
        baseCtrl.prototype.$scope.currentElementName = control.name;
        baseCtrl.prototype.$scope.openModal(scp, control);
    };

    // Handle updated driver selections from modal
    /**
     * @param {Object} product Vehicle
     * @param {Object} driverData Primary and other drivers
     */
    $scope.changeDrivers = function(product, driverData, scp, control) {
        if (!product || !driverData || !product.childProducts || !product.childProducts.records.length) {
            return;
        }
        populateDriverData(product, driverData).then(function() {
            $scope.changeCoverage(baseCtrl.prototype.$scope.bpTree.response, control, scp, product);
        });
    };

    $scope.copyCoverageValues = function(product, siblingProduct, response, control, scp) {
        console.log('current product in copyCoverageValues', product);
        console.log('siblingProduct', siblingProduct);
        $rootScope.attributeUserValues = {};
        let setOptionalCoverageCopied = null;
        if ($scope.sortedCoverages[siblingProduct.name] && $scope.sortedCoverages[product.instanceKey]) {
            for (let i = 0; i < $scope.sortedCoverages[siblingProduct.name].length; i++) {
                const siblingCoverage = $scope.sortedCoverages[siblingProduct.name][i];
                for (let j = 0; j < $scope.sortedCoverages[product.instanceKey].length; j++) {
                    let currentCoverage = $scope.sortedCoverages[product.instanceKey][j];
                    if (currentCoverage.ProductCode === siblingCoverage.ProductCode) {
                        // Check isOptional and isSelected
                        if (siblingCoverage.isOptional && currentCoverage.isOptional) {
                            currentCoverage.isSelected = siblingCoverage.isSelected;
                            setOptionalCoverageCopied = currentCoverage.parentInstanceKey;
                        }
                        if ($scope.consolidatedData.grandChildInsuredItems[currentCoverage.parentInstanceKey][currentCoverage.ProductCode]) {
                            for (let k = 0; k < $scope.consolidatedData.grandChildInsuredItems[currentCoverage.parentInstanceKey][currentCoverage.ProductCode].length; k++) {
                                let currentAttribute = _.get(currentCoverage, $scope.consolidatedData.grandChildInsuredItems[currentCoverage.parentInstanceKey][currentCoverage.ProductCode][k].pathFromChild);
                                const siblingAttribute = _.get(siblingCoverage, $scope.consolidatedData.grandChildInsuredItems[siblingCoverage.parentInstanceKey][siblingCoverage.ProductCode][k].pathFromChild);
                                console.log(currentAttribute.label + '/' + currentCoverage.Name + ' in copyCoverageValues loop', currentAttribute, currentCoverage);
                                currentAttribute.values = siblingAttribute.values;
                                currentAttribute.userValues = siblingAttribute.userValues;
                                if (siblingAttribute.rules) {
                                    currentAttribute.rules = siblingAttribute.rules;
                                }
                                if (siblingAttribute.hiddenByRule) {
                                    currentAttribute.hiddenByRule = siblingAttribute.hiddenByRule;
                                }
                                if (siblingAttribute.ruleSetValue) {
                                    currentAttribute.ruleSetValue = siblingAttribute.ruleSetValue;
                                }
                            }
                        }
                    }
                }
            }
            product.currentCoverageConfiguration = 'Same as ' + siblingProduct.name;
            product.customizeIcon = '../resource/' + baseCtrl.prototype.$scope.nsPrefix + 'InsMultiItemImages/same-as-icon.svg';
        }
        if ($scope.changeCoverage) {
            // This is located in ins-os-coverage-component
            $timeout(function() {
                $scope.changeCoverage(response, control, scp, null, null, null, setOptionalCoverageCopied);
            });
        }
    };
}]);

vlocity.cardframework.registerModule.directive('insOnError', function() {
    return {
        link: function(scope, element, attrs) {
            element.bind('error', function() {
                if (attrs.src !== attrs.insOnError) {
                    attrs.$set('src', attrs.insOnError);
                }
            });
        }
    }
});