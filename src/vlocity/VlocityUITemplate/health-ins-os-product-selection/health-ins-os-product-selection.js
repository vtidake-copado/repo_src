// Omniscript formats a Select/MultiSelect Input Element like {name: 'value;value'}
// For Product Selection, we need the filters in {name: ['value', 'value']}
// Function on the window object so we can call it from within our controller below as well
window.formatFilters = function(attributeFilters) {
    var formattedAttributeFilters = {};
    if (attributeFilters) {
        angular.forEach(attributeFilters, function(value, key) {
            if (value && value.indexOf(';') > -1) {
                formattedAttributeFilters[key] = value.split(';');
            } else if (value) {
                formattedAttributeFilters[key] = [value];
            }
        });
    }
    return formattedAttributeFilters;
};

// Listening for postMessage events. Three types specifically:
// * iframeHeight - sent from product selection so we can adjust the iframe height to the exact height of product selection and avoid scroll/overflow hidden
// * addHeight - a signifier to give room to the iframe because products are coming in. This avoids the height being noticably readjusted
// * productsSelected - these are the selected products data coming back to OS in an array
window.addEventListener('message', function(event) {
    var stepHeight = 0;
    var setHeight = 0;
    if ($('.vloc-health-ins-product-selection-step')[0]) {
        stepHeight = $('.vloc-health-ins-product-selection-step')[0].scrollHeight;
    }
    if (event.data.iframeHeight) {
        console.log('message data', event);
        if (stepHeight > (event.data.iframeHeight + 20) && stepHeight < window.innerHeight) {
            setHeight = stepHeight - 130;
        } else {
            setHeight = event.data.iframeHeight + 20;
        }
        baseCtrl.prototype.$scope.iframeHeightStyle = setHeight + 'px';
        $('.vloc-health-ins-product-selection-wrapper').css({height: setHeight + 'px'});
        console.log(baseCtrl.prototype.$scope.iframeHeightStyle);
        baseCtrl.prototype.$scope.$apply();
        setTimeout(function() {
            if (!$('.vloc-health-ins-product-selection-step').hasClass('height-added')) {
                $('.vloc-health-ins-product-selection-step').addClass('height-added');
            }
        }, 100);
    } else if (event.data.addHeight) {
        baseCtrl.prototype.$scope.iframeHeightStyle = 'calc(' + baseCtrl.prototype.$scope.iframeHeightStyle + ' + 960px)';
        $('.vloc-health-ins-product-selection-wrapper').css({height: 'calc(' + baseCtrl.prototype.$scope.iframeHeightStyle + ' + 960px)'});
        baseCtrl.prototype.$scope.$apply();
        setTimeout(function() {
            if (!$('.vloc-health-ins-product-selection-step').hasClass('height-added')) {
                $('.vloc-health-ins-product-selection-step').addClass('height-added');
            }
        }, 100);
    } else if (event.data.productsSelected) {
        var transferDataToEl = baseCtrl.prototype.$scope.copiedControl.propSetMap.remoteOptions.transferDataToEl;
        var response = {};
        response[transferDataToEl] = event.data.productsSelected;
        baseCtrl.prototype.$scope.applyCallResp(response); // make json available to this selectable item
    }
}, false);

// Initial height so $scope variable is bound
baseCtrl.prototype.$scope.iframeHeightStyle = '100%';

// init function that copies the control, grabs the user inputs and filters and sends them into the iframe
baseCtrl.prototype.setHealthControl = function(control) {
    var baseUrl = window.parent.location.href.split('/apex')[0];
    var iframeInputs;
    console.log('control', control);
    if (!control) {
        return;
    } else {
        baseCtrl.prototype.$scope.copiedControl = control;
        baseCtrl.prototype.$scope.insAttributeFilters = window.formatFilters(baseCtrl.prototype.$scope.bpTree.response.attributeFiltersData);
        baseCtrl.prototype.$scope.insUserInputs = control.vlcSI[control.itemsKey];
        $('form[stepform]#' + baseCtrl.prototype.$scope.bpTree.sOmniScriptId + '-' + control.rootIndex).addClass('vloc-health-ins-product-selection-step');
        baseCtrl.prototype.healthSelectionIframeUrl = baseUrl + '/apex/InsuranceProductSelection';
    }
};

// Local controller that allows us to refresh the iframe when the user clicks on the 'Next' button on the step before
// the iframe selectable item
vlocity.cardframework.registerModule.controller('healthInsOsProductSelection', ['$scope', '$timeout', function($scope, $timeout) {
    var baseUrl = window.parent.location.href.split('/apex')[0];
    var control = baseCtrl.prototype.$scope.copiedControl;
    var bpTree = baseCtrl.prototype.$scope.bpTree;
    if (bpTree.response.stepBeforeProductSelection) {
        $('#' + bpTree.response.stepBeforeProductSelection + '_nextBtn').on('click', function() {
            var randomInt = parseInt(Math.random() * 1000000000);
            var newUrl = baseUrl + '/apex/InsuranceProductSelection?param=' + randomInt;
            var iframeSelector = $('#vloc-health-ins-product-selection-iframe');
            window.postMessage({addHeight: true}, '*');
            iframeSelector.css({opacity: 0});
            iframeSelector.attr('src', newUrl);
            iframeSelector.attr('user-inputs', angular.toJson(control.vlcSI[control.itemsKey]));
            iframeSelector.attr('attribute-filters', angular.toJson(window.formatFilters(bpTree.response.attributeFiltersData)));
            $timeout(function() {
                iframeSelector.css({opacity: 1});
            }, 500);
        });
    }
}]);