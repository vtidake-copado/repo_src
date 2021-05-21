var self = this;

// Notification object
baseCtrl.prototype.notification = {
    active: false,
    type: 'Notify',
    message: ''
};

baseCtrl.prototype.closeNotification = function() {
    baseCtrl.prototype.notification.active = false;
};

// Need the control object in JS, grabbing it on template init
baseCtrl.prototype.init = function(control) {
    baseCtrl.prototype.control = control;
}

// Directive on the file input element to handle upload after file is selected
vlocity.cardframework.registerModule.directive('vlocInsFileUpload', function($q) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
            if (!ngModel) return;
            ngModel.$render = function() {};
            element.bind('change', function(e) {
                if (typeof Papa === 'undefined') {
                    baseCtrl.prototype.notification.active = true;
                    baseCtrl.prototype.notification.type = 'Error';
                    baseCtrl.prototype.notification.message = 'The Papa Parse javascript library cannot be found.';
                    element.val(null);
                    scope.$digest();
                    return;
                }
                element.parse({
                    config: {},
                    before: function(file, inputElem) {
                        var sFileName = inputElem.value;
                        baseCtrl.prototype.$scope.bpTree.response.tableData.rows = [];
                        baseCtrl.prototype.notification = {
                            active: false,
                            type: 'Notify',
                            message: ''
                        };
                        if (file.name.substr(file.name.length - 3, file.name.length).toLowerCase() !== 'csv') {
                            baseCtrl.prototype.notification.active = true;
                            baseCtrl.prototype.notification.type = 'Error';
                            baseCtrl.prototype.notification.message = 'Sorry, ' + file.name + ' is invalid, only a csv file can be uploaded. Please choose the correct csv file.';
                        } else {
                            // Parse CSV
                            Papa.parse(file, {
                                header: true,
                                dynamicTyping: true,
                                complete: function(result) {
                                    if (result.errors.length) {
                                        baseCtrl.prototype.notification.active = true;
                                        baseCtrl.prototype.notification.type = 'Error';
                                        baseCtrl.prototype.notification.message = 'There has been an upload error.';
                                    } else {
                                        processUploadedData(result.data).then(function(data) {
                                            // Successfully processed CSV
                                            baseCtrl.prototype.$scope.bpTree.response.inputMap = {};
                                            baseCtrl.prototype.$scope.bpTree.response.inputMap.tableData = baseCtrl.prototype.$scope.bpTree.response.tableData;
                                            baseCtrl.prototype.$scope.bpTree.response.contextId = baseCtrl.prototype.$scope.bpTree.response.ContextId;
                                            // Virtual button click of configured Remote Action within the OmniScript Step:
                                            // Passing in 'typeAheadSearch' as the operation so the callback gets hit.
                                            baseCtrl.prototype.$scope.buttonClick(baseCtrl.prototype.$scope.bpTree.response, baseCtrl.prototype.control, baseCtrl.prototype.$scope, undefined, 'typeAheadSearch', undefined, function(success) {
                                                if (success) {
                                                    // Callback is called after the data has been uploaded to the object (using contextId)
                                                    baseCtrl.prototype.notification.active = true;
                                                    baseCtrl.prototype.notification.type = 'Success';
                                                    baseCtrl.prototype.notification.message = 'Successfully uploaded and processed ' + result.data.length + ' records from ' + file.name;
                                                } else {
                                                    baseCtrl.prototype.notification.active = true;
                                                    baseCtrl.prototype.notification.type = 'Error';
                                                    baseCtrl.prototype.notification.message = 'There has been an error saving the Census Data.';
                                                }
                                            });
                                        }, function(error) {
                                            baseCtrl.prototype.notification.active = true;
                                            baseCtrl.prototype.notification.type = 'Error';
                                            baseCtrl.prototype.notification.message = 'There has been an error: ' + error;
                                        }, function(warning) {
                                            baseCtrl.prototype.notification.active = true;
                                            baseCtrl.prototype.notification.type = 'Notify';
                                            baseCtrl.prototype.notification.message = warning;
                                        });
                                    }
                                }
                            });
                        }
                    },
                    error: function(error, file, inputElem, reason) {
                        baseCtrl.prototype.notification.active = true;
                        baseCtrl.prototype.notification.type = 'Error';
                        baseCtrl.prototype.notification.message = error + ': ' + reason;
                    },
                    complete: function() {
                        // Clearing the file out of the input so it can be used again:
                        element.val(null);
                    }
                });
            });

            function processUploadedData(data) {
                var deferred = $q.defer();
                var tableData = baseCtrl.prototype.$scope.bpTree.response.tableData;
                angular.forEach(tableData.rows, function(row) {
                    row.deleted = false;
                    angular.forEach(tableData.headers, function(header) {
                        self.validateData(header, row);
                    });
                });
                angular.forEach(data, function(item) {
                    self.addRowUpload(item);
                });
                if (!tableData.rows.length) {
                    deferred.notify('No rows were processed from this CSV File.');
                } else {
                    if (!tableData || !tableData.rows) {
                        deferred.reject('No rows array available.');
                    } else {
                        deferred.resolve(tableData);
                    }
                }
                return deferred.promise;
            }
        }
    };
});

this.addRow = function(row) {
    var tableData = baseCtrl.prototype.$scope.bpTree.response.tableData;
    if (row.deleted === null) {
        row.deleted = false;
    }

    if (row.rowKey === null) {
        row.rowKey = Math.floor(Math.random() * 16777215).toString(16); // Random hexidecimal string    
    }

    // Add Hidden Values to every row as it is added, if it has a default.
    // Hidden values are assumed to be the same across all rows
    angular.forEach(tableData.headers, function(header) {
        if (row[header.name] === null && header.defaultValue !== null) {
            row[header.name] = header.defaultValue;
        }
    });
    baseCtrl.prototype.$scope.bpTree.response.tableData.rows.push(row);
};

this.addRowUpload = function(row) {
    var tableData = baseCtrl.prototype.$scope.bpTree.response.tableData;
    angular.forEach(tableData.headers, function(header) {
        angular.forEach(row, function(value, key) {
            if (header.label.toLowerCase() == key.toLowerCase()) {
                row[header.name] = value;
                delete row[key];
            }
        });
    });
    self.addRow(row);
};

this.parseDate = function(date) {
    if (date === null || date === '') {
        return '';
    }
    return moment.utc(date).format('YYYY-MM-DD');
};

this.validateData = function(header, row) {
    if (header.type === 'DATE') {
        row[header.name] = self.parseDate(row[header.name]);
    }
};