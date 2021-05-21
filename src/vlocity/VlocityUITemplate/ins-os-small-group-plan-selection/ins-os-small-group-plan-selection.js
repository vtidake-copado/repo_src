let insSgpsCustomEventName;
/**
 * Evaluates when the stepInitKey in the OS Set Values step changes
 * @param {Object} control Element control
 */
baseCtrl.prototype.shouldReinitTemplate = function(control) {
    const bpTreeResponse = baseCtrl.prototype.$scope.bpTree.response;
    const insSgpsKey = baseCtrl.prototype.$scope.bpTree.propSetMap.insSgpsKey;
    const insSgpsNode = bpTreeResponse[insSgpsKey];
    const stepInitKey = control.name + 'Init';
    if (insSgpsNode[stepInitKey] !== bpTreeResponse[stepInitKey]) {
        return true;
    }
};

/**
 * Triggers reinitialization of step's template, with option to reinitialize shared cart data as well
 * @param {Object} control Element control
 */
baseCtrl.prototype.reinitTemplate = function(control) {
    const bpTreeResponse = baseCtrl.prototype.$scope.bpTree.response;
    const insSgpsKey = baseCtrl.prototype.$scope.bpTree.propSetMap.insSgpsKey;
    const insSgpsNode = bpTreeResponse[insSgpsKey];
    if (insSgpsNode.insSgpsCartInit !== bpTreeResponse.insSgpsCartInit) {
        control.cartReinit = true;
    }
    const event = new CustomEvent(insSgpsCustomEventName, {'detail': control});
    document.dispatchEvent(event);
};

vlocity.cardframework.registerModule.controller('insOsSmallGroupPlanSelectionCtrl', ['$scope', '$rootScope', '$timeout', '$q', '$sldsModal', function($scope, $rootScope, $timeout, $q, $sldsModal) {
    'use strict';
    const cartPageSize = 3;
    let bpTreeResponse;
    let scp;
    let remotePageSize;
    let remoteRespCountAll = 0;
    let remoteRespCountNew = 0;
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    function reinitEventHandler(e) {
        const control = e.detail;
        document.removeEventListener(insSgpsCustomEventName, reinitEventHandler);
        $scope.insSelectionInit(baseCtrl.prototype, control, control.cartReinit);
    }

    // Template initialization
    /**
     * @param {Object} baseCtrl OS baseCtrl
     * @param {Object} control Element control
     * @param {Boolean} [initializeCart] Flag when user moves back and forth from template step
     */
    $scope.insSelectionInit = function(baseCtrl, control, initializeCart) {
        insSgpsCustomEventName = 'vloc-os-ins-small-group-selection-' + control.name + Math.round((new Date()).getTime() / 1000);
        // Listens for template reinit
        document.addEventListener(insSgpsCustomEventName, reinitEventHandler);
        // OS dataJSON object
        bpTreeResponse = baseCtrl.$scope.bpTree.response;
        delete bpTreeResponse.lastRecordId;
        // OS scope
        scp = baseCtrl.$scope;
        console.log('insSelectionInit control', control);
        // Determines minimum number of plans that should be added to the page each time you request more
        remotePageSize = control.propSetMap.remoteOptions.pageSize;
        // This key must be defined in the OS Script Configuration JSON for the template to work
        const insSgpsKey = baseCtrl.$scope.bpTree.propSetMap.insSgpsKey;
        // This creates a custom node in the dataJSON to track plan selections across multiple OS steps
        bpTreeResponse[insSgpsKey] = bpTreeResponse[insSgpsKey] || {};
        $scope.insSgpsNode = bpTreeResponse[insSgpsKey];
        // This key must be defined in an OS Set Values step before the template step
        $scope.insSgpsNode.insSgpsCartInit = bpTreeResponse.insSgpsCartInit;
        const stepInitKey = control.name + 'Init';
        $scope.insSgpsNode[stepInitKey] = bpTreeResponse[stepInitKey];
        $scope.insSgpsNode.selectedPlansMap = initializeCart ? {} : $scope.insSgpsNode.selectedPlansMap || {};
        $scope.insSgpsNode.cartCompareSelectMap = initializeCart ? {} : $scope.insSgpsNode.cartCompareSelectMap || {};
        // Initialize data on the first OS step this template is used
        if (!$scope.insSgpsNode.cartPlans || initializeCart) {
            $scope.insSgpsNode.cartPlans = [];
            const selectableItems = control.vlcSI[control.itemsKey];
            if (selectableItems.length) {
                // Initialization if renewal OS
                renewalInit(selectableItems);
            }
        }
        control[control.name] = {};
        formatCart(0, true);
        // Initial call to get available plans, wrapped in timeout so $rootScope.loading gets set after page is ready
        $timeout(function() {
            remoteInvoke(control)
            .then(function(remoteResp) {
                console.log('insSelectionInit remoteResp', remoteResp);
                control[control.name].unselectedNewPlans = [];
                control[control.name].selectedFilters = {};
                control[control.name].filterAttrValues = remoteResp[control.name].filterAttrValues || {};
                control[control.name].filtersAvailable = _.isEmpty(control[control.name].filterAttrValues) ? false : true;
                control[control.name].newCompareSelectMap = {};
                angular.forEach(control[control.name].filterAttrValues, function(filter) {
                    filter.listOfValues = _.uniq(filter.listOfValues).sort();
                });
                const newPlans = remoteResp[control.name].listProducts;
                formatNewPlans(newPlans, control);
                dataJsonSync();
            })
            .catch(angular.noop);
        }, 0);
    };

    // Toggles whether filters dropdown is open
    $scope.toggleFiltersDropdown = function() {
        $scope.openFilterDropdown = !$scope.openFilterDropdown;
    };

    // Toggles selected filter and makes remote call to refresh list of available products
    /**
     * @param {String} filterKey Name of filter type
     * @param {String} value User selected filter value
     * @param {Object} control Element control
     */
    $scope.toggleFilter = function(filterKey, value, control) {
        control[control.name].lastResultReached = false;
        control[control.name].selectedFilters[filterKey] = control[control.name].selectedFilters[filterKey] || [];
        control[control.name].newCompareSelectMap = {};
        const valueIndex = control[control.name].selectedFilters[filterKey].indexOf(value.value);
        if (valueIndex > -1) {
            control[control.name].selectedFilters[filterKey].splice(valueIndex, 1);
            if (!control[control.name].selectedFilters[filterKey].length) {
                delete control[control.name].selectedFilters[filterKey];
            }
        } else {
            control[control.name].selectedFilters[filterKey].push(value.value);
        }
        delete bpTreeResponse.lastRecordId;
        delete control[control.name].lastRecordId;
        remoteInvoke(control)
        .then(function(remoteResp) {
            console.log('toggleFilter remoteResp', remoteResp);
            control[control.name].unselectedNewPlans = [];
            const newPlans = remoteResp[control.name].listProducts;
            formatNewPlans(newPlans, control);
        })
        .catch(angular.noop);
    };

    // Requests additional plans based on lastRecordId
    /**
     * @param {Object} control Element control
     */
    $scope.getMorePlans = function(control) {
        bpTreeResponse.lastRecordId = control[control.name].lastRecordId;
        remoteInvoke(control)
        .then(function(remoteResp) {
            console.log('getMorePlans remoteResp', remoteResp);
            const newPlans = remoteResp[control.name].listProducts;
            formatNewPlans(newPlans, control);
        })
        .catch(angular.noop);
    };

    // Handle renewal plans and new plans in cart
    /**
     * @param {Object} plan Cart plan
     * @param {Object} control Element control
     */
    $scope.toggleCartPlan = function(plan, control) {
        // Flag to determine whether to select or deselect
        const deselecting = plan.selected;
        if (deselecting) {
            if (plan.renewal) {
                // Renewal plans get tracked if they are being deleted
                $scope.insSgpsNode.renewalPlansToDelete[plan.Id] = true;
            } else {
                // Add non-renewal plan back to bottom list
                delete $scope.insSgpsNode.selectedPlansMap[plan.Id];
                $scope.insSgpsNode.cartPlans.splice(plan.originalIndex, 1);
                formatCart($scope.insSgpsNode.displayedCartPlans[0].originalIndex, true);
                control[control.name].unselectedNewPlans.unshift(plan);
                if (plan.vlcCompSelected) {
                    // Move compare flag to unselected plan map if compare box is checked
                    $scope.toggleNewCompareSelect(plan, control);
                    $scope.toggleCartCompareSelect(plan);
                }
            }
        } else {
            // If plan is being renewed nothing needs to be tracked
            delete $scope.insSgpsNode.renewalPlansToDelete[plan.Id];
        }
        plan.selected = !plan.selected;
        dataJsonSync();
    };

    // Add new plan to cart
    /**
     * @param {Object} plan Selected plan
     * @param {Number} planIndex Index in displayedPlans
     * @param {Object} control Element control
     */
    $scope.addNewPlan = function(plan, planIndex, control) {
        plan.selected = true;
        $scope.insSgpsNode.selectedPlansMap[plan.Id] = plan;
        control[control.name].unselectedNewPlans.splice(planIndex, 1);
        if (plan.vlcCompSelected) {
            // Move compare flag to cart plan map if compare box is checked
            $scope.toggleNewCompareSelect(plan, control);
            $scope.toggleCartCompareSelect(plan);
        }
        $scope.insSgpsNode.cartPlans.unshift(plan);
        formatCart(0, true);
        dataJsonSync();
    };

    // Helper method to display number of selected filters
    /**
     * @param {Object} control Element control
     */
    $scope.selectedFiltersCount = function(control) {
        let count = 0;
        angular.forEach(control[control.name].selectedFilters, function(array) {
            count += array.length;
        });
        return count;
    };

    // Helper method to display filter checkbox
    /**
     * @param {String} filterKey Filter type
     * @param {String} value Filter value
     * @param {Object} control Element control
     */
    $scope.isFilterSelected = function(filterKey, value, control) {
        if (control[control.name].selectedFilters[filterKey] && control[control.name].selectedFilters[filterKey].indexOf(value.value) > -1) {
            return true;
        }
    };

    // Adds cart plan to list (shared across steps) for compare modal
    /**
     * @param {Object} plan Cart plan (either new or renewal)
     */
    $scope.toggleCartCompareSelect = function(plan) {
        if (!$scope.insSgpsNode.cartCompareSelectMap[plan.Id]) {
            $scope.insSgpsNode.cartCompareSelectMap[plan.Id] = plan;
            plan.vlcCompSelected = true;
        } else {
            delete $scope.insSgpsNode.cartCompareSelectMap[plan.Id];
            plan.vlcCompSelected = false;
        }
    };

    // Adds unselected new plan to list (specific to each step) for compare modal
    /**
     * @param {Object} plan Unselected new plan
     * @param {Object} control Element control
     */
    $scope.toggleNewCompareSelect = function(plan, control) {
        if (!control[control.name].newCompareSelectMap[plan.Id]) {
            control[control.name].newCompareSelectMap[plan.Id] = plan;
            plan.vlcCompSelected = true;
        } else {
            delete control[control.name].newCompareSelectMap[plan.Id];
            plan.vlcCompSelected = false;
        }
    };

    // Gets called when clicking next/previous directional buttons at top
    /**
     * @param {String} direction Prev or Next
     */
    $scope.paginateItems = function(direction) {
        const currentIndex = $scope.insSgpsNode.displayedCartPlans[0].originalIndex;
        let newIndex = 0;
        if (direction === 'prev') {
            newIndex = currentIndex - cartPageSize;
        } else if (direction === 'next') {
            newIndex = currentIndex + cartPageSize;
        }
        formatCart(newIndex);
    };

    // Count how many cart plans are selected
    $scope.selectedPlansCount = function() {
        let count = 0;
        angular.forEach($scope.insSgpsNode.cartPlans, function(plan) {
            if (plan.selected) {
                count += 1;
            }
        });
        return count;
    };

    //Launch compare modal - right now it is a fixed template but this is exposed js, to-do: use OS modal template
    $scope.openCompareModal = function(plan, control) {
        if (plan) {
            $scope.modalRecords = [plan, plan.originalPlan.records[0]];
            $scope.isSelectable = false;
        } else {
            const newPlans = _.values(control[control.name].newCompareSelectMap);
            const cartPlans = _.values($scope.insSgpsNode.cartCompareSelectMap);
            $scope.modalRecords = newPlans.concat(cartPlans);
            $scope.isSelectable = true;
        }
        $sldsModal({
            backdrop: 'static',
            title: 'Compare Plans',
            scope: $scope,
            showLastYear: true,
            animation: true,
            templateUrl: control.propSetMap.modalHTMLTemplateId,
            show: true
        });
    };

    //Launch compare modal - right now it is a fixed template but this is exposed js, to-do: use OS modal template
    $scope.openDetailModal = function(plan, control) {
        $scope.modalRecords = [plan];//modalProducts = list of product and last years
        $scope.isSelectable = false;
        $sldsModal({
            backdrop: 'static',
            title: 'View Details',
            scope: $scope,
            showLastYear: true,
            animation: true,
            templateUrl: control.propSetMap.modalHTMLTemplateId,
            show: true
        });
    };

    // Toggles plan selection from within compare modal
    /**
     * @param {Object} plan Can be either a renewal or new plan
     * @param {Object} control Element control
     */
    $scope.toggleModalPlan = function(plan, control) {
        if (plan.selected || plan.renewal) {
            $scope.toggleCartPlan(plan, control);
        } else {
            plan.selected = true;
            const unselectedNewPlans = control[control.name].unselectedNewPlans;
            // Find index in new plans to splice and move into cart
            for (let i = 0; i < unselectedNewPlans.length; i++) {
                const newPlan = unselectedNewPlans[i];
                if (plan.Id === newPlan.Id) {
                    $scope.addNewPlan(plan, i, control);
                    break;
                }
            }
        }
    };

    // Initialize data for renewal OS
    /**
    * @param {Object} selectableItems control.vlcSI[control.itemsKey]
    */
    function renewalInit(selectableItems) {
        $scope.insSgpsNode.renewalPlansToDelete = {};
        angular.forEach(selectableItems, function(plan) {
            plan.selected = true;
            plan.renewal = true;
            formatPlan(plan);
            if ($scope.insSgpsNode.renewalPlansToDelete[plan.Id]) {
                plan.selected = false;
            }
        });
        Array.prototype.push.apply($scope.insSgpsNode.cartPlans, selectableItems);
    }

    // Set tier for default icon color
    /**
    * @param {Object} plan
    */
    function setTierClass(plan) {
        const name = plan.Name || plan.productName;
        if (plan[baseCtrl.prototype.$scope.nsPrefix + 'Tier__c']) {
            plan.tierClass = plan[baseCtrl.prototype.$scope.nsPrefix + 'plan.TierClass__c'].toLowerCase();
        } else if (name.toLowerCase().indexOf('gold') > -1) {
            plan.tierClass = 'gold';
        } else if (name.toLowerCase().indexOf('silver') > -1) {
            plan.tierClass = 'silver';
        } else if (name.toLowerCase().indexOf('bronze') > -1) {
            plan.tierClass = 'bronze';
        }
    };

    // Index cart items
    /**
    * @param {Number} newIndex Starting index of cart plans subset
    * @param {Boolean} [reindex] Flag to refresh original indexes
    */
    function formatCart(newIndex, reindex) {
        if (reindex) {
            angular.forEach($scope.insSgpsNode.cartPlans, function(plan, i) {
                plan.originalIndex = i;
            });
        }
        $scope.insSgpsNode.displayedCartPlans = $scope.insSgpsNode.cartPlans.slice(newIndex, newIndex + cartPageSize);
        $scope.insSgpsNode.prevDisabled = newIndex === 0 ? true : false;
        $scope.insSgpsNode.nextDisabled = newIndex + cartPageSize >= $scope.insSgpsNode.cartPlans.length ? true : false;
    }

    //Format plan, calls setTierClass, loops through attributes to format
    /**
    * @param {Object} plan
    */
    function formatPlan(plan){
        setTierClass(plan);
        if (plan.attributeCategories && plan.attributeCategories.records) {
            angular.forEach(plan.attributeCategories.records, function(attributeCategory) {
                angular.forEach(attributeCategory.productAttributes.records, function(productAttribute) {
                    if (productAttribute.values && productAttribute.userValues && (productAttribute.multiselect || productAttribute.inputType === 'radio' || productAttribute.inputType === 'dropdown')){
                        productAttribute.formattedValues = [];
                        let selected = [];
                        if (!Array.isArray(productAttribute.userValues)) { //userValues can be a single value
                            selected.push(productAttribute.userValues);
                        } else {
                            for (let i = 0; i < productAttribute.userValues.length; i++) { //could have an array of Objs or an array of Strings/Integers
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
                        for(let i = 0; i < selected.length; i++){
                            for(let j = 0; j < productAttribute.values.length; j++){
                                if(selected[i].toString() === productAttribute.values[j].value.toString()){
                                    productAttribute.formattedValues.push(productAttribute.values[j].label);
                                }
                            }
                        }
                    }
                });
            });
        }
    }

    // Dedupes and sets tiers for new plans
    /**
     * @param {Array} newPlans Plans returned from remote method
     * @param {Object} control Element control
     */
    function formatNewPlans(newPlans, control) {
        const newPlansRecords = newPlans.records;
        const totalSize = newPlans.totalSize;
        const newLastRecordId = newPlansRecords ? newPlansRecords[newPlansRecords.length - 1].Id : null;
        if (!newPlansRecords || control[control.name].lastRecordId === newLastRecordId) {
            console.log('last result reached');
            control[control.name].lastResultReached = true;
            remoteRespCountAll = 0;
            remoteRespCountNew = 0;
            return;
        }
        control[control.name].lastRecordId = newLastRecordId;
        angular.forEach(newPlansRecords, function(plan) {
            remoteRespCountAll += 1;
            if (isNewPlan(plan)) {
                formatPlan(plan);
                control[control.name].unselectedNewPlans.push(plan);
                remoteRespCountNew += 1;
            }
        });
        if (remoteRespCountAll < totalSize && remoteRespCountNew < remotePageSize) {
            $scope.getMorePlans(control);
        } else {
            remoteRespCountAll = 0;
            remoteRespCountNew = 0;
        }
    }

    // Check if new plan is already being tracked
    /**
     * @param {Object} plan
     */
    function isNewPlan(plan) {
        for (let i = 0; i < $scope.insSgpsNode.cartPlans.length; i++) {
            const cartPlan = $scope.insSgpsNode.cartPlans[i];
            if (plan.Id === cartPlan.Id || plan.Id === cartPlan.productId) {
                return false;
            }
        }
        return true;
    }

    // Calls OmniScript buttonClick method, which invokes remote method defined on the Selectable Items action
    /**
     * @param {Object} control Element control} control
     */
    function remoteInvoke(control) {
        const deferred = $q.defer();
        $rootScope.loading = true;
        bpTreeResponse.attributeFilters = control[control.name].selectedFilters;
        scp.buttonClick(bpTreeResponse, control, scp, undefined, 'typeAheadSearch', undefined, function(remoteResp) {
            deferred.resolve(remoteResp);
        });
        return deferred.promise;
    }

    // Keep plan selections in sync across OS steps
    function dataJsonSync() {
        $scope.insSgpsNode.selectedPlans = [];
        angular.forEach($scope.insSgpsNode.selectedPlansMap, function(selectedPlan) {
            $scope.insSgpsNode.selectedPlans.push(selectedPlan);
        });
        // For renewal OS - need to track quote line item ids for deletion from quote
        if (!_.isEmpty($scope.insSgpsNode.renewalPlansToDelete)) {
            $scope.insSgpsNode.unselectedIds = Object.keys($scope.insSgpsNode.renewalPlansToDelete);
        }
    }
}]);

vlocity.cardframework.registerModule.directive('insOsDropdownHandler', function($document) {
    'use strict';
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            let isFocused = false;
            const dropdownElement = angular.element(element.find('.nds-dropdown')[0]);
            const onClick = function(event) {
                const isChild = dropdownElement.has(event.target).length > 0;
                if (!isChild) {
                    scope.$apply(attrs.insOsDropdownToggle);
                    $document.off('click', onClick);
                    isFocused = false;
                }
            };
            element.on('click', function(e) {
                if (!isFocused) {
                    e.stopPropagation();
                    scope.$apply(attrs.insOsDropdownToggle);
                    $document.on('click', onClick);
                    isFocused = true;
                }
            });
        }
    };
});