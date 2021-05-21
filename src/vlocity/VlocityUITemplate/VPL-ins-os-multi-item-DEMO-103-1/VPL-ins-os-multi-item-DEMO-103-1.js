/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insMultiItemCtrl', ['$scope', '$rootScope', '$q', '$controller', '$timeout', function($scope, $rootScope, $q, $controller, $timeout) {
    'use strict';
    // insCoveragesCtrl is the JS Angular controller in ins-os-coverages-component which
    // is the component for coverages
    angular.extend(this, $controller('insCoveragesCtrl', {$scope: $scope}));
    // Specific to multi-item:
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
        const insuredItemKeys = Object.keys(baseCtrl.prototype.$scope.bpTree.response.insuredItems);
        if (insuredItemKeys.length === 2) {
            if (baseCtrl.prototype.$scope.bpTree.response.insuredItems[insuredItemKeys[0]][0].isPrimary) {
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
        // Reformat the data so we can access it to show vehicle images:
        $scope.insuredItemsFormatted = {};
        let childInsuredItems = baseCtrl.prototype.$scope.bpTree.response.insuredItems[baseCtrl.prototype.insuredItemNames.childInsuredItemName];
        if (childInsuredItems.length) {
            for (let i = 0; i < baseCtrl.prototype.$scope.bpTree.response.insuredItems[baseCtrl.prototype.insuredItemNames.childInsuredItemName].length; i++) {
                let child = baseCtrl.prototype.$scope.bpTree.response.insuredItems[baseCtrl.prototype.insuredItemNames.childInsuredItemName][i];
                childInsuredItemsHelper(child);
            }
        } else {
            childInsuredItemsHelper(childInsuredItems);
        }
        console.log('$scope.insuredItemsFormatted', $scope.insuredItemsFormatted);
    };
    $scope.initMultiAuto();
    $scope.customTemplates = baseCtrl.prototype.$scope.bpTree.propSetMap.elementTypeToHTMLTemplateMapping;
    $scope.rootProducts = [];

    // Listen for event from the Drivers modal:
    document.addEventListener('ins-os-multi-item-modal-send-data', function(e) {
        let driverData = e.detail.driverData;
        if (driverData && driverData[driverData.productInstanceKey]) {
            let product = _.get($scope.productsList, driverData[driverData.productInstanceKey].productPathFromRoot);
            product.primaryParty = driverData[driverData.productInstanceKey].primaryParty;
            product.otherParties = driverData[driverData.productInstanceKey].otherParties;
            $scope.changeDrivers(product, driverData[driverData.productInstanceKey], $scope, $scope.controlRef);
        }
    });

    function childInsuredItemsHelper(child) {
        if (child.BodyClass.toLowerCase().indexOf('convertible') > -1) {
            child.VehicleType = child.VehicleType + ' CONVERTIBLE';
        }
        if (child.BodyClass.toLowerCase().indexOf('coupe') > -1) {
            child.VehicleType = child.VehicleType + ' COUPE';
        }
        $scope.insuredItemsFormatted[child.instanceKey] = child;
    }

    function updatePath(item, operation) {
        let parts = item.pathFromRoot.split('records');
        let pieces = parts[1].split('.');
        let oldIndex = parseInt(pieces[0].replace(/[^0-9]/g, ''));
        if (operation === '+') {
            parts[1] = '[' + (oldIndex + 1) + '].' + pieces[1] + '.';
        } else if (operation === '-') {
            parts[1] = '[' + (oldIndex - 1) + '].' + pieces[1] + '.';
        } else if (typeof operation === 'number') {
            parts[1] = '[' + operation + '].' + pieces[1] + '.';
        }
        item.pathFromRoot = parts.join('records');
        return item;
    }

    function updateDriverAttributes(product, driver, vehicle) {
        const instanceKey = product.parentInstanceKey || product.instanceKey || product.Name;
        for (let gcKey in $scope.consolidatedData.grandChildInsuredItems[instanceKey]) {
            let items = $scope.consolidatedData.grandChildInsuredItems[instanceKey][gcKey];
            console.log('items in loop', items);
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                if (item.name === baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName) {
                    for (let key in driver) {
                        if (item.attributeCode === key) {
                            let attribute = {};
                            if (!vehicle) {
                                attribute = _.get(product, item.pathFromRoot);
                                if (!attribute) {
                                    attribute = _.get(product, updatePath(item, '-').pathFromRoot);
                                }
                            } else {
                                attribute = _.get(vehicle, updatePath(item, '+').pathFromRoot);
                            }
                            console.log(attribute, key);
                            attribute.userValues = driver[key];
                        }
                    }
                }
            }
        }
        return product;
    }

    function getDriverProductcode(product) {
        const instanceKey = product.parentInstanceKey || product.instanceKey;
        let driverProductCode = '';
        for (let gcKey in $scope.consolidatedData.grandChildInsuredItems[instanceKey]) {
            let items = $scope.consolidatedData.grandChildInsuredItems[instanceKey][gcKey];
            console.log('items in loop', items);
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                if (item.name === baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName) {
                    driverProductCode = item.productCode;
                }
            }
        }
        product.driverProductCode = driverProductCode;
        return driverProductCode;
    }

    function populateDriverData(product, driverData) {
        const deferred = $q.defer();
        const primary = driverData.primaryParty;
        const instanceKey = product.parentInstanceKey || product.instanceKey;
        let driverProduct = {};
        let existingDrivers = [];
        let driverProductCode = product.driverProductCode || getDriverProductcode(product);
        if (product.childProducts && product.childProducts.records) {
            // First loop to delete all DRIVER children except 1
            let foundFirstDriver = false;
            let indicesToRemove = [];
            let onlyDriverProduct = {
                product: null,
                index: 0
            };
            for (let i = 0; i < product.childProducts.records.length; i++) {
                let child = product.childProducts.records[i];
                if (child.ProductCode === driverProductCode) {
                    if (!foundFirstDriver) {
                        if (child.Name === child.instanceKey) {
                            child.Name = child.productName;
                        }
                        if (child.instanceKey) {
                            delete child.instanceKey;
                        }
                        if (child.hasOwnProperty('isPrimaryChild')) {
                            delete child.isPrimaryChild;
                        }
                        onlyDriverProduct.product = child;
                        onlyDriverProduct.index = i;
                        foundFirstDriver = true;
                    } else {
                        indicesToRemove.push(i); // cannot splice here, so store to splice later
                    }
                }
            }
            // Updating the pathFromRoot below assumes that the Driver product is the last in the list,
            // So after we reduce it to one driver, we need to move it to the bottom:
            if (onlyDriverProduct.product) {
                product.childProducts.records.splice(onlyDriverProduct.index, 1);
                product.childProducts.records.push(onlyDriverProduct.product);
            }
            // Remove the extra driver products (has to be a separate loop because we're splicing the set)
            // Have to loop backwards or the indices shift and it won't work:
            for (let i = indicesToRemove.length - 1; i >= 0; i--) {
                product.childProducts.records.splice(indicesToRemove[i], 1);
                product.childProducts.totalSize--;
                product.childProductsCount--;
            }
            // Update pathFromRoot
            for (let i = 0; i < $scope.consolidatedData.grandChildInsuredItems[instanceKey][driverProductCode].length; i++) {
                let item = $scope.consolidatedData.grandChildInsuredItems[instanceKey][driverProductCode][i];
                updatePath(item, product.childProductsCount - 1);
            }
            // Now repopulate the only driver with the primary data:
            product = updateDriverAttributes(product, primary);
            // Now loop for other drivers
            for (let i = 0; i < product.childProducts.records.length; i++) {
                let child = product.childProducts.records[i];
                if (child.ProductCode === driverProductCode) {
                    // If the user removed a driver, we need to remove that driver's
                    // insured item, so we start keeping track of what we had before here:
                    if (child.instanceKey) {
                        existingDrivers.push(child.instanceKey);
                    }
                    if (!child.hasOwnProperty('instanceKey')) {
                        child.instanceKey = primary.instanceKey;
                        child.isPrimaryChild = !child.isPrimaryChild;
                    }
                    if (!child.instanceKey || child.isPrimaryChild) {
                        driverProduct = child;
                    }
                }
            }
        }
        if (Object.keys(driverProduct).length) {
            let split = driverProduct.pathFromRoot.split('records');
            split.pop();
            const pathToChildRecords = split.join('records') + 'records';
            let referenceToChildRecords = _.get($scope.productsList, pathToChildRecords);
            for (let i = 0; i < driverData.otherParties.length; i++) {
                let otherDriver = driverData.otherParties[i];
                if (existingDrivers.indexOf(otherDriver.instanceKey) < 0) {
                    // assume matching index
                    let otherDriverInstanceKey = driverData.otherPartyInstanceKeys[i];
                    if (otherDriverInstanceKey !== driverData.primaryParty.instanceKey) {
                        let newDriver = angular.copy(driverProduct);
                        newDriver.instanceKey = otherDriverInstanceKey;
                        delete newDriver.isPrimaryChild;
                        // creating the new path from root:
                        let pathSplit = newDriver.pathFromRoot.split('records');
                        let oldIndex = parseInt(pathSplit.pop().replace(/[^0-9]/g, ''));
                        newDriver.pathFromRoot = pathSplit.join('records') + 'records[' + (oldIndex + 1) + ']';
                        referenceToChildRecords.push(newDriver);
                        product.childProducts.totalSize++;
                        product.childProductsCount++;
                        referenceToChildRecords[referenceToChildRecords.length - 1] = updateDriverAttributes(newDriver, otherDriver, product);
                    }
                } else {
                    existingDrivers.splice(existingDrivers.indexOf(otherDriver.instanceKey), 1);
                }
            }
            if (existingDrivers.length) {
                // remove the leftover existing drivers because it means the user removed them in the modal:
                for (let i = 0; i < existingDrivers.length; i++) {
                    if (product.childProducts && product.childProducts.records) {
                        for (let j = 0; j < product.childProducts.records.length; j++) {
                            if (product.childProducts.records[j].instanceKey === existingDrivers[i] && !product.childProducts.records[j].isPrimaryChild) {
                                product.childProducts.records.splice(j, 1);
                                product.childProducts.totalSize--;
                                product.childProductsCount--;
                            }
                        }
                    }
                }
            }
        }
        deferred.resolve(product);
        return deferred.promise;
    }

    $scope.editDrivers = function(scp, control, childProduct) {
        control.vlcSI[control.itemsKey][0].vlcCompSelected = true;
        control.vlcSI[control.itemsKey][0].editDrivers = {
            instanceKey: childProduct.instanceKey,
            pathFromRoot: childProduct.pathFromRoot
        };
        baseCtrl.prototype.$scope.currentElementName = control.name;
        baseCtrl.prototype.$scope.openModal(scp, control);
    };

    $scope.changeDrivers = function(product, driverData, scp, control) {
        console.log(product, driverData);
        if (!product || !driverData || !product.childProducts || !product.childProducts.records.length) return;
        populateDriverData(product, driverData).then(function() {
            $scope.changeCoverage(baseCtrl.prototype.$scope.bpTree.response, control, scp, product);
            console.log('after populateDriverData:', $scope.productsList, control);
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