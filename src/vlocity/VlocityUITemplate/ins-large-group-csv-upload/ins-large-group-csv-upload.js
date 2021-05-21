vlocity.cardframework.registerModule.factory('editableTableService', ['$http', 'dataSourceService', 'dataService', '$q', '$rootScope', '$timeout', function($http, dataSourceService, dataService, $q, $rootScope, $timeout)
{
    'use strict';
    let REMOTE_CLASS = 'CensusMemberServiceHandler';
    let DUAL_DATASOURCE_NAME = 'Dual';
    let insideOrg = false;
    let errorContainer = {};
    $rootScope.notification = {};

    function getDualDataSourceObj(actionObj)
    {
        let datasource = {};
        let temp = '';
        let nsPrefix = fileNsPrefix().replace('__', '');

        if (actionObj.remote && actionObj.remote.remoteClass)
        {
            temp = REMOTE_CLASS;
            REMOTE_CLASS = actionObj.remote.remoteClass;
        }
        if (actionObj)
        {
            datasource.type = DUAL_DATASOURCE_NAME;
            datasource.value = {};
            datasource.value.remoteNSPrefix = nsPrefix;
            datasource.value.inputMap = actionObj.remote.params || {};
            datasource.value.remoteClass = REMOTE_CLASS;
            datasource.value.remoteMethod = actionObj.remote.params.methodName;
            datasource.value.endpoint = actionObj.rest.link;
            datasource.value.methodType = actionObj.rest.method;
            datasource.value.body = actionObj.rest.params;
        }
        else
        {
            console.log('Error encountered while trying to read the actionObject');
        }

        if (temp)
        {
            REMOTE_CLASS = temp;
        }
        return datasource;
    }

    return {
        invokeRemoteMethod: function(scope, remoteClass, remoteMethod, inputMap, message, optionsMap)
        {
            let deferred = $q.defer();
            let nsPrefix = fileNsPrefix().replace('__', '');
            let datasource = {};
            console.log('Calling: ', remoteMethod);
            datasource.type = 'Dual';
            datasource.value = {};
            datasource.value.remoteNSPrefix = nsPrefix;
            datasource.value.remoteClass = remoteClass;
            datasource.value.remoteMethod = remoteMethod;
            datasource.value.inputMap = inputMap;
            datasource.value.optionsMap = optionsMap;
            datasource.value.apexRemoteResultVar = 'result.records';
            datasource.value.methodType = 'GET';
            datasource.value.endpoint = '/services/apexrest/' + nsPrefix + '/v2/campaigns/';
            datasource.value.apexRestResultVar = 'result.records';

            // no need to pass forceTk client below because on desktop, dual datasource will use ApexRemote
            // and on Mobile Hybrid Ionic, dual datasource will use ApexRest via forceng
            console.log('datasource: ', datasource);
            dataSourceService.getData(datasource, scope, null).then(
                function(data)
                {
                    console.log('data', data);
                    deferred.resolve(data);
                    if (message && !scope.savingItems)
                    {
                        $rootScope.notification.active = true;
                        $rootScope.notification.type = 'success';
                        $rootScope.notification.message = message;
                        $timeout(function()
                        {
                            $rootScope.notification.active = false;
                        }, 2000);
                    }
                },
                function(error)
                {
                    console.error(error);
                    deferred.reject(error);
                    $rootScope.notification.active = true;
                    $rootScope.notification.type = 'error';
                    $rootScope.notification.message = error;
                    $timeout(function()
                    {
                        $rootScope.notification.active = false;
                    }, 2000);
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        },
        /**Action : Use this method when the actions are straight forward based on actionObj.
         * {[object]} actionObj [Pass the action object]
         * rn {promise} [Result data]
         */
        invokeAction: function(actionObj, scope)
        {
            console.log('actionObj: ', actionObj);
            let deferred = $q.defer();
            let datasource = getDualDataSourceObj(actionObj);
            dataSourceService.getData(datasource, null, null).then(
                function(data)
                {
                    console.log(data);
                    deferred.resolve(data);
                    $rootScope.isLoaded = true;
                },
                function(error)
                {
                    deferred.reject(error);
                    console.log(error);
                    InsValidationHandlerService.throwError(error);
                    $rootScope.isLoaded = true;
                });
            return deferred.promise;
        },
        invokeNewCensusService: function(methodName, input)
        {
            var deferred = $q.defer();
            var invokeJSON = {
                invokingMethod: methodName,
                vOpenInterface: 'CensusMemberServiceHandler',
                inputMap: input
            };
            editableTableService.invokeAction(JSON.stringify(invokeJSON));
            return deferred.promise;
        }

    };
}]);

// Navigate up or down in column using keys
//----------------------------------------------------------------
//----------------------------------------------------------------
//----------------------------------------------------------------

vlocity.cardframework.registerModule.directive('vlocityNavigateUpOrDown', function()
{
    return {
        link: function(scope, element, attrs)
        {

            element.bind("keyup", function(e)
            {
                // Up and down only
                if (e.keyCode == 38 || e.keyCode == 40)
                {
                    var cert = element[0].selectionStart;

                    var arrow = {
                        left: 37,
                        up: 38,
                        right: 39,
                        down: 40
                    };
                    var input = e.target;
                    var td = $(e.target).closest('td');
                    var moveTo = null;
                    var tr = td.closest('tr');
                    var pos = td[0].cellIndex;

                    var moveToRow = null;
                    if (e.keyCode == 40)
                    {
                        moveToRow = tr.next('tr');
                    } else if (e.keyCode == 38)
                    {
                        moveToRow = tr.prev('tr');
                    }

                    if (moveToRow.length)
                    {
                        moveTo = $(moveToRow[0].cells[pos]);
                    }

                    if (moveTo && moveTo.length)
                    {
                        e.preventDefault();

                        moveTo.find('input,textarea').each(function(i, input)
                        {
                            input.focus();
                            input.select();
                        });
                    }
                }
            });
        }
    }
});

//Controller for UI
//----------------------------------------------------------------
//----------------------------------------------------------------
//----------------------------------------------------------------

vlocity.cardframework.registerModule.controller('editableTableTableAppController', function($scope, $modal, $tooltip, editableTableService, $dateParser, $timeout, $rootScope, InsModalService)
{

    $scope.currentSort = '';
    $scope.sortReversed = false;
    $scope.contextId;
    $rootScope.headerStart = 0;
    $rootScope.showColNum = 10;
    $rootScope.itemsPerPage = 10;
    $rootScope.headerEnd = $rootScope.showColNum;
    $rootScope.warnToSave = false;
    $scope.editingCell = {};

    $scope.newRowData = [];
    $scope.saveErrorRows = [];

    $rootScope.tableData = {
        headers: [],
        rows: [],
    };

    // Use this method to launch modal
    /**
    * @param {String} layout Card Layout to be loaded in modal
    * @param {String} type Type of Modal used in the html to distinguish upload or settings
    * @param {String} title Title of the Modal
    * @param {Object} data Data to be passed to the modal - set as "records" in modal scope
    */
    $scope.showModal = function(layout, type, title, data)
    {
        if (type === 'upload')
        {
            $scope.uploadInfo = {
                status: "ready"
            };
            $scope.modalType = "upload";
        }
        InsModalService.launchModal($scope, layout, data, 'editableTableTableAppController', 'vloc-editable-table', 'true', title);
    }

    //Calculated headerStart and headerEnd variables to determine which columns are shown -- function to adjust to the right
    $scope.calcRight = function()
    {
        $rootScope.headerStart = $rootScope.headerStart + $rootScope.showColNum;
        $rootScope.headerEnd = $rootScope.headerEnd + $rootScope.showColNum
    }

    //Calculated headerStart and headerEnd variables to determine which columns are shown -- function to adjust to the left
    $scope.calcLeft = function()
    {
        $rootScope.headerStart = $rootScope.headerStart - $rootScope.showColNum;
        $rootScope.headerEnd = $rootScope.headerEnd - $rootScope.showColNum;
    }

    //Refresh the data by calling getData
    $scope.refreshData = function()
    {
        editableTableService.invokeRemoteMethod($scope, 'CensusMemberServiceHandler', 'getData', {
            contextId: $scope.contextId
        }).then(function(result, event)
        {
            if (result != null && result.tableData)
            {
                $rootScope.tableData = result.tableData;
                console.log('result', result);
                angular.forEach($rootScope.tableData.rows, function(row)
                {
                    row.deleted = false;
                    angular.forEach($rootScope.tableData.headers, function(header)
                    {
                        $scope.validateData(header, row);
                    });
                });

                if ($scope.newRowData.length == 0)
                {
                    $scope.addRow($scope.newRowData, {});
                }

            }
        });
    }

    //Set Data on Load
    /*
    * @param {Id} contextId censusId
    * @param {Object} result records returned on load
    */
    $scope.setData = function(contextId, result)
    {
        $scope.contextId = contextId;
        $rootScope.tableData = result.tableData;
        console.log('result', result);
        if ($rootScope.tableData)
        {
            angular.forEach($rootScope.tableData.rows, function(row)
            {
                row.deleted = false;
                angular.forEach($rootScope.tableData.headers, function(header)
                {
                    $scope.validateData(header, row);
                });
            });
        }

        if ($scope.newRowData.length == 0)
        {
            $scope.addRow($scope.newRowData, {});
        }
        $rootScope.isLoaded = true;
    }


    //Function to sort rows by designated header
    /*
    * @param {Object} header headerField
    */
    $scope.onSortBy = function(header)
    {
        $scope.updateRowData();
        var sortHeadersByOrder;

        if ($scope.currentSort == header.name)
        {
            $scope.sortReversed = !$scope.sortReversed;
        } else
        {
            $scope.sortReversed = false;
        }

        $scope.currentSort = header.name;

        var sortHeaderOrder = [header];
        for (var i = 0; i < $rootScope.tableData.headers.length; i++)
        {
            sortHeaderOrder.push($rootScope.tableData.headers[i]);
        }

        $rootScope.tableData.rows.sort(function(a, b)
        {
            for (var i = 0; i < sortHeaderOrder.length; i++)
            {
                var sortHeader = sortHeaderOrder[i];

                var aVal = a[sortHeader.name];
                var bVal = b[sortHeader.name];

                if (isNumber(aVal))
                {
                    aVal = parseFloat(aVal);
                }

                if (isNumber(bVal))
                {
                    bVal = parseFloat(bVal);
                }

                if (aVal != null && bVal == null)
                {
                    return -1;
                }

                if (aVal == null && bVal != null)
                {
                    return 1;
                }

                if (aVal > bVal)
                {
                    return 1;
                }
                else if (aVal < bVal)
                {
                    return -1;
                }
            }

            return -1;
        });

        if ($scope.sortReversed) $rootScope.tableData.rows.reverse();
    }

    //Function to parse date
    /*
    * @param {String} date
    */
    $scope.parseDate = function(date)
    {
        if (date == null || date == '') return '';

        return moment.utc(date).format("YYYY-MM-DD");
    }

    //Validate if date data is a date
    /*
    * @param {Object} header headerField
    * @param {Object} row Census member data
    */
    $scope.validateData = function(header, row)
    {
        if (header.type == 'DATE')
        {
            row[header.name] = $scope.parseDate(row[header.name]);
        }
    }

    //Set warning flag for cell
    /*
    * @param {Object} row Census member data
    * @param {Object} header headerField
    */
    $scope.setEditFlag = function(row, header)
    {
        console.log('warning');
        $rootScope.warnToSave = true;
        if (!$scope.editingCell[row])
        {
            $scope.editingCell[row] = {};
        }
        $scope.editingCell[row][header] = true;
    }

    //Save Table
    /*
    * @param {Boolean} showConfirmation Flag to show confirmation
    */
    $scope.saveItems = function(showConfirmation)
    {
        $scope.savingItems = true;
        $scope.pendingSavePercentDisplay = 0;
        $scope.updateRowData();

        $scope.sendSaveToServer(
            function(result)
            {
                $scope.refreshData();
                $scope.savingItems = false;

                if (showConfirmation)
                {
                    let message = 'Save Successful';
                    let timeout = 2000;
                    $rootScope.notification.type = 'success';

                    if ((result.censusMemberIds && result.censusMemberIds.length) && $scope.saveErrorRows.length)
                    {
                        message = 'Saved with errors. Please see the saveErrors.csv file for details.';
                        timeout = 5000;
                    }
                    else if (result.censusMemberIds && result.censusMemberIds.length)
                    {
                        message = 'Save Successful';
                    }
                    else if ($scope.saveErrorRows.length)
                    {
                        message = 'Saved failed. Please see the saveErrors.csv file for details.';
                        timeout = 5000;
                        $rootScope.notification.type = 'error';
                    }

                    $rootScope.notification.active = true;
                    $rootScope.notification.message = message;
                    $timeout(
                        function()
                        {
                            $rootScope.notification.active = false;
                        },
                        timeout);
                }
            },
            function(result)
            {
                $scope.savingItems = false;
                if (showConfirmation)
                {
                    let message = result.errors;

                    if (!message.length)
                    {
                        messaage = '';
                    }

                    $rootScope.notification.active = true;
                    $rootScope.notification.type = 'error';
                    $rootScope.notification.message = 'Save Failed. Please fix errors and try again. - ' + message;
                    $timeout(function()
                    {
                        $rootScope.notification.active = false;
                    }, 5000);
                }
            }
        );
    }

    //Function to send to surver
    $scope.sendSaveToServer = function(successCallback, failureCallback)
    {
        let tableInfoForSave = JSON.parse(JSON.stringify($rootScope.tableData));
        tableInfoForSave.rows = null;
        tableInfoForSave.rows = $scope.getUnsavedChunk(JSON.stringify(tableInfoForSave).length);
        $scope.hasPending = $scope.hasPendingToSave();

        let inputMap = {
            skipBatch: $scope.hasPending,
            tableData: tableInfoForSave,
            contextId: $scope.contextId
        };

        editableTableService
            .invokeRemoteMethod($scope, 'CensusMemberServiceHandler', 'saveData', inputMap)
            .then(function(result, event)
            {
                if (result)
                {
                    $scope.addNew = false;
                    $scope.editTable = false;
                    $rootScope.warnToSave = false;
                    $scope.headerStart = 0;
                    $scope.editingCell = {};
                    $scope.headerEnd = $scope.showColNum;
                    if (result.result == 'error')
                    {
                        failureCallback(result);
                    }
                    else if ($scope.hasPending)
                    {
                        $scope.pendingSavePercentDisplay = $scope.pendingSavePercent();
                        $scope.appendToSaveErrors(result.errors);
                        $scope.sendSaveToServer(successCallback, failureCallback);
                    }
                    else if (result.result == 'success')
                    {
                        $scope.appendToSaveErrors(result.errors);
                        successCallback(result);
                        $scope.exportData($rootScope.tableData.headers, $scope.saveErrorRows);
                    }
                }
                else
                {
                    failureCallback();
                }
            });
    }

    // Only want to process 1000 rows max on Client or a conservative 400,000 characters in case 1 row is very large and causes any processing overhead.
    $scope.getUnsavedChunk = function(lengthOfHeaders)
    {
        let chunkToSave = [];
        let chunkToSaveLength = lengthOfHeaders;

        for (let i = 0; i < $rootScope.tableData.rows.length && chunkToSaveLength < 400000 && chunkToSave.length < 1000; i++)
        {
            if (!$rootScope.tableData.rows[i].isSaved)
            {
                chunkToSaveLength += JSON.stringify($rootScope.tableData.rows[i]).length;
                $rootScope.tableData.rows[i].isSaved = true;
                chunkToSave.push($rootScope.tableData.rows[i]);
            }
        }

        return chunkToSave;
    }

    $scope.hasPendingToSave = function()
    {
        for (let i = 0; i < $rootScope.tableData.rows.length; i++)
        {
            if (!$rootScope.tableData.rows[i].isSaved)
            {
                return true;
            }
        }

        $scope.pendingSavePercentDisplay = 100;
        return false;
    }

    $scope.pendingSavePercent = function()
    {
        let saved = 0.0;
        for (let i = 0; i < $rootScope.tableData.rows.length; i++)
        {
            if ($rootScope.tableData.rows[i].isSaved)
            {
                saved++;
            }
        }

        return Math.round((saved / $rootScope.tableData.rows.length) * 100);
    }

    $scope.updateRowData = function()
    {
        // Last new row will always be empty
        $scope.newRowData.pop();
        $rootScope.tableData.rows = $rootScope.tableData.rows.concat($scope.newRowData);
        $scope.newRowData = [];
        $scope.addRow($scope.newRowData, {});
    }

    $scope.addRow = function(rowList, row)
    {
        if (row['deleted'] == null)
        {
            row['deleted'] = false;
        }

        if (row['rowKey'] == null)
        {
            row['rowKey'] = Math.floor(Math.random() * 16777215).toString(16); // Random hexidecimal string
        }

        // Add Hidden Values to every row as it is added, if it has a default.
        // Hidden values are assumed to be the same across all rows
        angular.forEach($rootScope.tableData.headers, function(header)
        {
            if (row[header.name] == null && header.defaultValue != null)
            {
                row[header.name] = header.defaultValue;
            }
        });

        rowList.push(row);
    }

    //Remove row with index
    /*
    * @param {Integer} index
    */
    $scope.removeRow = function(index)
    {
        let tableData = {};
        $rootScope.tableData.rows[index].deleted = true;
        tableData.rows = $rootScope.tableData.rows[index];
        tableData.headers = $rootScope.tableData.headers;
        let inputMap = {
            tableData: tableData,
            contextId: $scope.contextId
        }
        $rootScope.tableData.rows.splice(index, 1);
        editableTableService.invokeRemoteMethod($scope, 'CensusMemberServiceHandler', 'saveData', inputMap, 'Deleted Member Successfully.');
    }

    //Save member (implicit save) on ng-blur
    /*
    * @param {Obj} row
    */
    $scope.saveMember = function(row)
    {
        let tableData = {};
        tableData.rows = row;
        tableData.headers = $rootScope.tableData.headers;
        let inputMap = {
            tableData: tableData,
            contextId: $scope.contextId
        }

        $timeout(function()
        {
            editableTableService
                .invokeRemoteMethod($scope, 'CensusMemberServiceHandler', 'saveData', inputMap)
                .then(function(result, event)
                {
                    let timeout = 2000;
                    $rootScope.notification.active = true;

                    if (result.errors && result.errors.length)
                    {
                        $rootScope.notification.type = 'error';
                        $rootScope.notification.message = 'Member Update failed due to - ' + result.errors[0].error;
                        timeout = 5000;

                        console.log($rootScope.notification.message);
                    }
                    else
                    {
                        $rootScope.notification.type = 'success';
                        $rootScope.notification.message = 'Updated Member Successfully.';

                        if (!row.Id && result.censusMemberIds && result.censusMemberIds.length)
                        {
                            row.Id = result.censusMemberIds[0];
                        }
                    }

                    $timeout(
                        function()
                        {
                            $rootScope.notification.active = false;
                        },
                        timeout);
                });
        }, 500);
    }

    $scope.removeNewRow = function(index)
    {
        console.log('removeRow');
        $scope.newRowData.splice(index, 1);
        $scope.updateRowData();
    }

    $scope.deleteAllData = function()
    {
        let inputMap = {
            censusId: $scope.contextId
        };

        editableTableService
            .invokeRemoteMethod(
                $scope,
                'InsCensusService',
                'deleteAllMembers',
                inputMap,
                'Members are being deleted in a batch job.')
            .then(function(result, event)
            {
                $rootScope.tableData.rows = [];
            });
    };

    $scope.appendToSaveErrors = function(errorsList)
    {
        if (errorsList && errorsList.length)
        {
            $scope.saveErrorRows = $scope.saveErrorRows.concat(errorsList);
        }
    }

    $scope.exportData = function(headers, rows)
    {
        let newHeaders = [].concat(headers);
        newHeaders.push({
            label: 'Error',
            name: 'error'
        })

        if (!rows || !rows.length)
        {
            $scope.saveErrorRows = [];
            return;
        }

        processData(newHeaders, rows);

        function processData(tableHeaders, rows)
        {
            var columnNames = [];
            var dataWithLabels = [];
            $scope.pendingSavePercentDisplay = 100;

            var headers = tableHeaders || $scope.tableData.headers;

            angular.forEach(headers, function(header)
            {
                columnNames.push(header.label);
            });

            angular.forEach(rows, function(row)
            {
                if (!row.deleted)
                {
                    var rowConverted = {};
                    angular.forEach(headers, function(header)
                    {
                        rowConverted[header.label] = row[header.name];
                    });

                    dataWithLabels.push(rowConverted);
                }
            });

            var csv = Papa.unparse({
                fields: columnNames,
                data: dataWithLabels
            });

            saveToCSV(csv, 'saveErrors');

            $scope.saveErrorRows = [];
        }

        function saveToCSV(csv, filename)
        {
            var filename = filename + '.csv';
            var blob = convertStringToBlob(csv, 'text/csv;charset=utf-8;');
            saveAs(blob, filename);
        }

        function convertStringToBlob(fileContentAsString, contentType, sliceSize)
        {
            var byteCharacters = fileContentAsString,
                byteArrays = [];

            contentType = contentType || '';
            sliceSize = sliceSize || 512;

            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize)
            {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var byteNumbers = new Array(slice.length);

                for (var i = 0; i < slice.length; i++)
                {
                    byteNumbers[i] = slice.charCodeAt(i);
                }

                byteArrays.push(new Uint8Array(byteNumbers));
            }

            return new Blob(byteArrays, {type: contentType});
        }
    }

    $scope.onEnterData = function(row, index)
    {
        $rootScope.warnToSave = true;
        if (index == $scope.newRowData.length - 1)
        {
            $scope.addRow($scope.newRowData, {});
        }
    }

    $scope.addRowUpload = function(row)
    {
        // update rowData to use the header.name from the csvHeader to be able to display it as table data
        angular.forEach($rootScope.tableData.headers, function(header)
        {
            let value = row[header.fieldId];

            if (value)
            {
                delete row[header.fieldId];
                row[header.name] = value;
            } else if (header.defaultValue != null)
            {
                // Add Hidden Values to every row as it is added, if it has a default.
                // Hidden values are assumed to be the same across all rows
                row[header.name] = header.defaultValue;
            }
        });

        // use [$scope.csvHeadersAndTableFieldsMap] to delete all row data that are not mapped to a tableField
        let rowHeaderKeys = Object.keys($scope.csvHeadersAndTableFieldsMap);
        for (let i = 0; i < rowHeaderKeys.length; i++)
        {
            let value = $scope.csvHeadersAndTableFieldsMap[rowHeaderKeys[i]]
            if (!value)
            {
                delete row[rowHeaderKeys[i]];
            }
        }

        $scope.addRow($rootScope.tableData.rows, row);
    }


    function isNumber(n)
    {
        return n != undefined && !isNaN(parseFloat(n)) && isFinite(n);
    }

    $scope.modalPanel = {};

    $scope.uploadInfo = {};
});

// Modal Service
//----------------------------------------------------------------
//----------------------------------------------------------------
//----------------------------------------------------------------
vlocity.cardframework.registerModule.factory('InsModalService',
    ['$rootScope', '$sldsModal', '$timeout',
        function($rootScope, $sldsModal, $timeout)
        {
            'use strict';

            var scrollTop = function()
            {
                if ('parentIFrame' in window)
                {
                    window.parentIFrame.scrollTo(0);
                } else
                {
                    $('body').scrollTop(0);
                }
            };

            return {
                launchModal: function(scope, layout, records, ctrl, customClass, onHide, title)
                {
                    var modalScope = scope.$new();
                    var insModal;
                    scrollTop();
                    modalScope.vlocQuote = scope.vlocQuote;
                    modalScope.isLayoutLoaded = false;
                    modalScope.title = title;
                    modalScope.modalLayout = layout;
                    modalScope.customClass = customClass;
                    modalScope.records = records;
                    insModal = $sldsModal({
                        scope: modalScope,
                        templateUrl: 'sldsModalTemplate.html',
                        show: true,
                        vlocSlide: true,
                        onHide: onHide
                    });
                    // generate click on the modal to get insDropdownHandler directive to work:
                    // $timeout(function() {
                    //     angular.element('.slds-modal__content').click();
                    // }, 500);
                },
                hideModal: function()
                {
                    angular.element('.slds-modal__close').click();
                }
            };
        }
    ]);