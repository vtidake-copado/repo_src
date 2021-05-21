vlocity.cardframework.registerModule.controller('vellaHomeController', ['$scope', '$rootScope', '$location', '$timeout', '$state', 'vellaNotificationService', 'IonicService', function($scope, $rootScope, $location, $timeout, $state, vellaNotificationService, IonicService) {
    'use strict';
    $rootScope.isLoaded = false;
    $rootScope.vellaNotificationService = vellaNotificationService;
    $rootScope.accountId = '';
    $rootScope.accountName = '';
    $rootScope.accountFirstName = '';
    $rootScope.accountLastName = '';

    // Watcher to remove the spinner after 15 seconds in case of a freeze error1
    $rootScope.$watch('isLoaded', function(newValue, oldValue) {
        if (newValue !== oldValue && !newValue && !$rootScope.spinnerTimeout) {
            $rootScope.spinnerTimeout = $timeout(function() {
                // IonicService.popup.confirm({
                //     title: 'Timeout',
                //     template: 'The request was taking too long, please try again.'
                // });
                $rootScope.isLoaded = true;
            }, 15000);
        } else if (newValue !== oldValue && newValue && $rootScope.spinnerTimeout) {
            $timeout.cancel($rootScope.spinnerTimeout);
            $rootScope.spinnerTimeout = null;
        } 
    });
    // Always turn the spinner off when navigating backwards (in case it is done before spinner is cleared on current view)
    $rootScope.$on('$ionicView.afterEnter', function() {
        if ($state.params.type === 'Home') {
            $timeout(function() {
                $rootScope.isLoaded = true;
            }, 500);
            console.log('entered Home, isLoaded set to true');
        }
    });

    $scope.launchVellaIntelligence = function(vellaIntelligenceHelp) {
        var url = '/app/chatbot/Your Agent/?botName=Vella_ChatBot&AccountId=' + $rootScope.accountId + '&userInput=' + vellaIntelligenceHelp;
        $location.path(url);
    };
}]);

// Services used globally throughout the App (stored in this template JS):
vlocity.cardframework.registerModule.factory('vellaNotificationService', ['$rootScope', '$timeout', function($rootScope, $timeout) {
    'use strict';
    return {
        throwNotification: function(notification) {
            if (notification.data) {
                $rootScope.notification.type = 'Error';
                if (!notification.message) {
                    $rootScope.notification.message = 'No error message.';
                }
                if (notification.message.indexOf('Logged in?') > -1) {
                    $rootScope.notification.message = 'You have been logged out of Salesforce. Please back up any changes to your document and refresh your browser window to login again.';
                }
            } else {
                $rootScope.notification.type = notification.type;
                $rootScope.notification.message = notification.message;
            }
            $rootScope.notification.active = true;
            $rootScope.isLoaded = true;
            // Autohide notification after 5 seconds:
            $timeout(function() {
                $rootScope.notification.active = false;
            }, 5000);
        },
        closeNotification: function() {
            $rootScope.notification.active = false;
        }
    };
}]);