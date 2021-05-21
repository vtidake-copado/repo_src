vlocity.cardframework.registerModule.controller('editableTableMapingController', function($scope, $dateParser, $timeout, $rootScope)
{
    $scope.uploadInfo = {
        status: "ready"
    };

    $scope.csvHeadersAndTableFieldsMap = {} // cardfield = columnheader
    $scope.cardFieldMap = {};
    $scope.csvHeaders = [''];

    $scope.setMap = function(cardFields)
    {
        console.log('cardFields', cardFields);
        $scope.cardFieldMap = {};
        for (let i = 0; i < cardFields.length; i++)
        {
            field = cardFields[i];
            $scope.csvHeadersAndTableFieldsMap[field.label] = field.name //if we don't have headers assume card fields
            $scope.cardFieldMap[field.label] = field.label; //if we don't have header just assume use card fields
        }
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

    $scope.processUploadedData = function(data)
    {
        angular.forEach(data, function(item)
        {
            $scope.addRowUpload(item);
        });
    }

    //To Do: Use Maping Provided By Cards
    $scope.mapFieldsOfCsvToTable = function()
    {
        console.log('nameSpacePrefix', $rootScope.nsPrefix);
        console.log('csvHeadersList', $scope.csvHeaders);
        console.log('tableHeadersMap', $scope.csvHeadersAndTableFieldsMap);
        console.log('cardFieldMap', $scope.cardFieldMap);

        // -- generate modal to create JSON similar to the sample output - (map via drag-and-drop(?) csvHeaders against tableHeadersMap.name) --

        // assign csvHeader to tableHeadersMap.fieldId
        let headerMap = {};
        for (let field in $scope.cardFieldMap)
        {
            let colName = $scope.cardFieldMap[field];
            let cmField = $scope.csvHeadersAndTableFieldsMap[field];
            if (!headerMap[colName])
            {
                headerMap[colName] = cmField;
            }
        }
        console.log('headerMap', headerMap);

        keyMapping = Object.keys(headerMap);
        for (let j = 0; j < keyMapping.length; j++)
        {
            let mappingKey = keyMapping[j];
            let mappingValue = headerMap[mappingKey];

            for (let i = 0; i < $rootScope.tableData.headers.length; i++)
            {
                let header = $rootScope.tableData.headers[i];
                if (header.name == mappingValue)
                {
                    header['fieldId'] = mappingKey;
                }
            }
        }
    }

    $scope.mapFile = function()
    {
        $scope.mapFieldsOfCsvToTable();
        $scope.processUploadedData(JSON.parse(JSON.stringify($scope.fileResults.data)));
        $scope.uploadInfo.status = 'mapped';
    }

    $scope.onUpload = function()
    {
        let modalFileUpdate = $('#modal-file-upload');
        console.log('modalFileUpdate', modalFileUpdate);
        $rootScope.isLoaded = false;

        $('#modal-file-upload').parse({
            config: {
                // base config to use for each file
            },
            before: function(file, inputElem)
            {
                console.log(file, inputElem);
                $scope.sFileName = inputElem.value;
                if ($scope.sFileName.substr($scope.sFileName.length - 3, $scope.sFileName.length).toLowerCase() !== 'csv')
                {
                    $rootScope.notification.active = true;
                    $rootScope.notification.type = 'error';
                    $rootScope.notification.message = "Sorry, " + sFileName + " is invalid, only csv file can be uploaded. Please choose the correct csv file.";
                    $timeout(function()
                    {
                        $rootScope.notification.active = false;
                    }, 2000);
                } else
                {
                    console.log('para.parse');
                    Papa.parse(file, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: function(results)
                        {
                            console.log('Upload Success. rawData', results);
                            $scope.uploadInfo.status = 'success';
                            $scope.uploadInfo["recordsUploaded"] = results.data.length;
                            $scope.csvHeaders = $scope.csvHeaders.concat(results.meta.fields);
                            $scope.fileResults = results;
                            $scope.uploadInfo["errors"] = results.errors;
                            // firing an event downwards
                            $scope.warnToSave = true;
                            $rootScope.notification.active = true;
                            $rootScope.notification.type = 'success';
                            $rootScope.notification.message = "Uploaded " + results.data.length + " Records, Click Save to Save Data";
                            $timeout(function()
                            {
                                $rootScope.notification.active = false;
                            }, 2000);
                        }
                    });
                }

                // executed before parsing each file begins;
                // what you return here controls the flow
            },
            error: function(err, file, inputElem, reason)
            {
                console.log('Error Parsing file:', err);
                console.log(reason);

                $scope.uploadInfo.status = 'error';
                $scope.uploadInfo["errorMessage"] = 'Error Loading File';

                // executed if an error occurs while loading the file,
                // or if before callback aborted for some reason
            },
            complete: function(results)
            {
                $rootScope.isLoaded = true;
                $rootScope.warnToSave = true;
                console.log("Uploaded File Successfully");
            }
        });
    }
});