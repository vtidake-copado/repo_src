vlocity.cardframework.registerModule.controller('vellaPolicyDetailsController', ['$scope', '$rootScope', '$state', '$filter', '$ionicModal', '$ionicHistory', 'MobileService', function($scope, $rootScope, $state, $filter, $ionicModal, $ionicHistory, MobileService) {
    'use strict';
    function getPolicyImageUrl(img) {
        var imgParts, url;
        if (!img) {
            return;
        } else {
            imgParts = img.split('"');
            angular.forEach(imgParts, function(part, i) {
                if (part.indexOf('http') > -1) {
                    url = part.replace(/&amp;/g, '&');
                }
            });
            return url;
        }
    }

    $scope.placeholder.PolicyPremium.value = $filter('currency')($scope.placeholder.PolicyPremium.value, '$', 2);
    $scope.getPolicyDetails = function(obj) {
        $scope.policy = obj;
        $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'AnnualPremium__c'] = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'AnnualPremium__c'].toFixed(2);
        console.log('$scope.policy', $scope.policy);
        $rootScope.cardData.imageUrl = getPolicyImageUrl($scope.policy[$rootScope.nsPrefix + 'Product2Id__r'][$rootScope.nsPrefix + 'ProductImage__c']);
        $rootScope.cardData.AttributeSelectedValues = angular.fromJson($scope.policy[$rootScope.nsPrefix + 'AttributeSelectedValues__c']);
        $rootScope.cardData.Type = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'Type__c'];
        $rootScope.cardData.PolicyHolder = $rootScope.accountName;
        $rootScope.cardData.Name = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'].Name;
        $rootScope.cardData.Description = $scope.policy[$rootScope.nsPrefix + 'Product2Id__r'].Description;
        $rootScope.cardData.EffectiveDate = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'EffectiveDate__c'];
        $rootScope.cardData.ExpirationDate = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'ExpirationDate__c'];
        $rootScope.cardData.PolicyNumber = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'].AssetAutoNumber__c;
        $rootScope.cardData.AgentInfo = $scope.policy[$rootScope.nsPrefix + 'PolicyAssetId__r'][$rootScope.nsPrefix + 'PrimaryProducerId__r'];
        console.log('$rootScope.cardData', $rootScope.cardData);
        if ($rootScope.skipInsurableLayout) {
            $ionicHistory.removeBackView();
            $ionicHistory.clearCache();
            $rootScope.skipInsurableLayout = false;
        }
        if ($rootScope.clearAppCache) {
            $ionicHistory.clearCache();
            $rootScope.clearAppCache = false;
        }
    };

    $scope.launchAction = function(action) {
        if (action.id === 'id_card_modal') {
            $scope.title = $rootScope.cardData.Type;
            $scope.content = 'vella-policy-id-card';
            $ionicModal.fromTemplateUrl('app/vella/SldsModalVella.tpl.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.modal = modal;
                $scope.modal.show();
            });
        } else if (action.id === 'change_coverage') {
            action.url = action.url.replace(/\{0\}/g, $scope.params.id);
            MobileService.performAction(action);
        } else if (action.id === 'file_a_claim') {
            action.url = action.url.replace(/{{accountId}}/g, $rootScope.accountId).replace(/{{assetId}}/g, $scope.params.id);
            MobileService.performAction(action);
        } else {
            MobileService.performAction(action);
        }
    };

    $scope.closeModal = function() {
        $scope.modal.hide();
    };

    $scope.goToMoreDetail = function() {
        $rootScope.isLoaded = false;
        $state.go('app.univ', {type: 'MoreDetail', objectId: $scope.params.id});
    };
}]);