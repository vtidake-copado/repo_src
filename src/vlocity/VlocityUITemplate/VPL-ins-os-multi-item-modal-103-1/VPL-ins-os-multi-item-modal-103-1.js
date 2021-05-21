/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insMultiItemModalCtrl', ['$scope', function($scope) {
    'use strict';
    $scope.drivers = baseCtrl.prototype.$scope.bpTree.response.insuredItems[baseCtrl.prototype.insuredItemNames.grandChildInsuredItemName];
    $scope.initMultiItemModal = function(content) {
        console.log('modal content:', content);
        // This will be child vehicle product
        $scope.childProduct = _.get(content.recSet, content.recSet[0].editDrivers.pathFromRoot);
        // driverData controls the modal UI
        $scope.driverData = {
            productInstanceKey: $scope.childProduct.instanceKey,
            [$scope.childProduct.instanceKey]: {
                primaryParty: {},
                otherParties: $scope.childProduct.otherParties || [],
                otherPartyInstanceKeys: [],
                productPathFromRoot: $scope.childProduct.pathFromRoot
            }
        };
        // If the user previously selected a primary driver, we need to reflect that when they reopen
        // the modal:
        if ($scope.childProduct.primaryParty) {
            for (let i = 0; i < $scope.drivers.length; i++) {
                let driver = $scope.drivers[i];
                if (driver.instanceKey === $scope.childProduct.primaryParty.instanceKey) {
                    $scope.driverData[$scope.childProduct.instanceKey].primaryParty = driver;
                }
            }
        }
        // If the user previously selected other drivers, we need to reflect that when they reopen the
        // modal:
        if ($scope.childProduct.otherParties && $scope.childProduct.otherParties.length) {
            for (let i = 0; i < $scope.childProduct.otherParties.length; i++) {
                $scope.driverData[$scope.childProduct.instanceKey].otherPartyInstanceKeys.push($scope.childProduct.otherParties[i].instanceKey);
            }
        }
    };

    $scope.toggleRegularDriver = function(driver) {
        let driverIndex = $scope.driverData[$scope.childProduct.instanceKey].otherPartyInstanceKeys.indexOf(driver.instanceKey);
        if (driverIndex > -1) {
            $scope.driverData[$scope.childProduct.instanceKey].otherPartyInstanceKeys.splice(driverIndex, 1);
            // assume matching index
            $scope.driverData[$scope.childProduct.instanceKey].otherParties.splice(driverIndex, 1);
        } else {
            $scope.driverData[$scope.childProduct.instanceKey].otherPartyInstanceKeys.push(driver.instanceKey);
            // assume matching index
            $scope.driverData[$scope.childProduct.instanceKey].otherParties.push(driver);
        }
        console.log('driverData', $scope.driverData);
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