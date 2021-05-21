vlocity.cardframework.registerModule.controller('vellaPolicyAutoSafetyController', ['$scope', '$rootScope', '$timeout', 'vellaPolicyAutoSafetyService', function($scope, $rootScope, $timeout, vellaPolicyAutoSafetyService) {
    'use strict';
    $scope.init = function(obj) {
        var transactionDate, transactionMonth, tempObj;
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var today = new Date();
        var currentMonthIndex = today.getMonth();
        $scope.chartData = {
            values: [],
            highMonthValue: 0,
            mostRecentIndex: 0
        };
        console.log('vellaPolicyAutoSafetyController obj:', obj);
        angular.forEach(obj.policyTransactions, function(transaction, i) {
            if (transaction.Score && transaction.Rate && transaction.Amount && transaction.TransactionDate) {
                transactionDate = new Date(transaction.TransactionDate);
                transactionMonth = monthNames[transactionDate.getUTCMonth()];
                tempObj = {};
                tempObj.transactionDate = transaction.TransactionDate;
                tempObj.timestamp = Math.round((new Date(tempObj.transactionDate)).getTime() / 1000);
                tempObj.year = transactionDate.getUTCFullYear();
                tempObj.monthIdx = transactionDate.getUTCMonth();
                tempObj.monthStr = transactionMonth;
                tempObj.label = transactionMonth.charAt(0);
                tempObj.value = transaction.Amount;
                tempObj.rate = transaction.Rate;
                tempObj.score = transaction.Score;
                $scope.chartData.highMonthValue = (transaction.Amount > $scope.chartData.highMonthValue) ? transaction.Amount : $scope.chartData.highMonthValue;
                // Index sets the sort so that last month is the last data point shown:
                tempObj.ageIndex = (((transactionDate.getUTCMonth() + 1) - (currentMonthIndex + 1)) + 12) % 12;
                tempObj.height = {
                    'height': '10%'
                };
                $scope.chartData.values.push(tempObj);
            }
        });
        angular.forEach($scope.chartData.values, function(value, i) {
            if (value.timestamp > $scope.chartData.values[$scope.chartData.mostRecentIndex].timestamp) {
                $scope.chartData.mostRecentIndex = i;
            }
        });
        console.log('$scope.chartData', $scope.chartData);
    };

    $scope.ceil = function(value) {
        return Math.ceil(value);
    };

    // Calculate height percentages after the page is loaded so that the user sees the bars animate:
    $timeout(function() {
        angular.forEach($scope.chartData.values, function(value, i) {
            value.height = {
                'height': ((value.value / $scope.chartData.highMonthValue) * 100) + '%'
            };
        });
    }, 250);
}]);
vlocity.cardframework.registerModule.factory('vellaPolicyAutoSafetyService', ['$rootScope', '$q', 'dataSourceService', function($rootScope, $q, dataSourceService) {
    'use strict';
    return {
        
    };
}]);