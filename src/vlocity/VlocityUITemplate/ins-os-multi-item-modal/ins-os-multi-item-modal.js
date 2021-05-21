/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insMultiItemModalCtrl', ['$scope', function($scope) {
    'use strict';
    $scope.drivers = baseCtrl.prototype.$scope.bpTree.response.insuredItems[baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName];

    // Initialize drivers data for modal
    /**
     * @param {Object} content control.vlcSI[control.itemsKey]
     */
    $scope.initMultiItemModal = function(content) {
        // This will be child vehicle product
        $scope.childProduct = _.get(content.recSet, content.recSet[0].editDrivers.pathFromRoot);
        // driverData controls the modal UI
        $scope.driverData = {
            productInstanceKey: $scope.childProduct.instanceKey,
            [$scope.childProduct.instanceKey]: {
                primaryParty: {},
                otherParties: $scope.childProduct.otherParties || [],
                productPathFromRoot: $scope.childProduct.pathFromRoot
            }
        };
        // The radio input model comes from $scope.drivers so we need to match that when a primary driver exists
        if ($scope.childProduct.primaryParty) {
            for (let i = 0; i < $scope.drivers.length; i++) {
                const driver = $scope.drivers[i];
                if (driver.instanceKey === $scope.childProduct.primaryParty.instanceKey) {
                    $scope.driverData[$scope.childProduct.instanceKey].primaryParty = driver;
                    break;
                }
            }
        }
    };

    // Add or remove non primary driver
    /**
     * @param {Object} driver
     */
    $scope.toggleRegularDriver = function(driver) {
        const vehicleDriverData = $scope.driverData[$scope.childProduct.instanceKey];
        const otherDriverInstanceKeys = vehicleDriverData.otherParties.map(function(obj) {
            return obj.instanceKey;
        });
        const driverIndex = otherDriverInstanceKeys.indexOf(driver.instanceKey);
        if (driverIndex > -1) {
            vehicleDriverData.otherParties.splice(driverIndex, 1);
        } else if (vehicleDriverData.primaryParty.instanceKey !== driver.instanceKey) {
            vehicleDriverData.otherParties.push(driver);
        }
    };

    // Determine whether to show checkbox as checked
    /**
     * @param {Object} driver
     */
    $scope.isDriverSelected = function(driver) {
        if ($scope.driverData[$scope.childProduct.instanceKey].primaryParty.instanceKey === driver.instanceKey) {
            return true;
        }
        const driverInstanceKeys = $scope.driverData[$scope.childProduct.instanceKey].otherParties.map(function(obj) {
            return obj.instanceKey;
        });
        return driverInstanceKeys.indexOf(driver.instanceKey) > -1;
    };

    // Use a custom event to send the configured data back to the multi-item template to process:
    $scope.saveDataToMainJson = function() {
        let event = new CustomEvent('ins-os-multi-item-modal-send-data', {
            detail: {
                driverData: $scope.driverData
            }
        });
        document.dispatchEvent(event);
        $scope.cancel(); // closes modal
    };
}]);