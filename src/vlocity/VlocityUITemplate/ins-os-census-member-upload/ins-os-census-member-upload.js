vlocity.cardframework.registerModule.directive('insFileUploadHandler', function() {
    return {
        restrict: 'E',
        template: '<span class=""><input id="{{inputId}}" name="{{inputId}}" class="vloc-ins-xlsx-import__input" ng-class="inputClass" type="file" accept=".csv, .xlsx"/><label for="{{inputId}}" class="vloc-ins-xlsx-import__label" ng-class="labelClass">{{labelText}}</label></span>',
        replace: true,
        scope: {
            onRead: '&',
            onError: '&',
            control: '=',
            validation: '&',
            inputId: '@',
            labelText: '@',
            wrapperClass: '@',
            inputClass: '@',
            labelClass: '@'
        },
        link: function (scope, element) {
            const input = element.find('input');
            function handleSelect() {
                let files = this.files;
                for (let i = 0, f = files[i]; i < files.length; ++i) {
                    let reader = new FileReader();
                    let data;
                    reader.onload = function (e) {
                        data = !e ? reader.content : e.target.result;

                        /* if binary string, read with type 'binary' */
                        try {
                            let workbook = XLSX.read(data, { type: 'binary', cellDates:true });
    
                            if (scope.onRead && typeof scope.onRead === 'function') {
                                    scope.onRead({ $event: { workbook: workbook } }, scope.control);
                            }
                        } catch(err) {
                            if (scope.onError) {
                                if (typeof scope.onError === 'function') {
                                    scope.onError({ $event : {error: err } });
                                } else {
                                    console.warn('Unhandled error reading file.', err);
                                }
                            }
                        }
                        
                        input.val('');
                    };

                    //extend FileReader
                    if (!FileReader.prototype.readAsBinaryString) {
                        FileReader.prototype.readAsBinaryString = function (fileData) {
                            let binary = '';
                            let pt = this;
                            let reader = new FileReader();
                            reader.onload = function () {
                                let bytes = new Uint8Array(reader.result);
                                let length = bytes.byteLength;
                                for (let i = 0; i < length; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                //pt.result  - readonly so assign binary
                                pt.content = binary;
                                $(pt).trigger('onload');
                            };
                            reader.readAsArrayBuffer(fileData);
                        };
                    }

                    reader.readAsBinaryString(f);

                }
            }

            input.on('change', handleSelect);
        }
    };
});

vlocity.cardframework.registerModule.service('censusService', ['censusGateway', '$q', 'InsUtils', function(censusGateway, $q, InsUtils) {
    const self = this;
    self.censusDetails = [];
    self.mapIdToPlan = {};
    self.fieldSet = {};
    self.nsPrefix = baseCtrl.prototype.$scope.nsPrefix;

    function createParamForCRUDCensusService(members) {
        const headers = [
            {
                'name': self.nsPrefix + 'PrimaryMemberIdentifier__c'
            },
            {
                'name': self.nsPrefix + 'MemberIdentifier__c'
            },
            {
                'name': self.nsPrefix + 'IsPrimaryMember__c'
            },
            {
                'name': self.nsPrefix + 'IsSpouse__c'
            },
            {
                'name': self.nsPrefix + 'RelatedCensusMemberId__c'
            }
        ];

        if(self.fieldSet.headers && self.fieldSet.headers.length > 0) {
            self.fieldSet.headers.forEach(function(header) {
                headers.push(header);
            });
        }

        return {
            headers: headers,
            members: members
        };
        
    }

    /**
     * Maps the csv row data to the mapping set in the modal
     * 
     * @param headers record field info with mapping information. must contain field.csvHeader and field.name
     * @param csvRow a row in the csv in json format {column header: cell value}
     */
    function mapFieldsInSet(headers, csvRow) {
        const member = {};
        const selectedHeaderIds = InsUtils.toJSONValues(headers);
        const hasPlanMapping = selectedHeaderIds.indexOf(self.nsPrefix + 'ContractLineId__c') > -1;
        const planLookUp = self.mapTypeToPlans;
        for(let key in headers) {
            if(hasPlanMapping && headers[key] === self.nsPrefix + 'ContractLineId__c') {
                
                if(!member[headers[key]]) {
                    member[headers[key]] = '';
                }

                if(!csvRow[key]) {
                    continue;
                }

                const plan = !planLookUp[key] || !planLookUp[key][csvRow[key]] ? (key + ' - ' + csvRow[key]) :
                    planLookUp[key][csvRow[key]];
                member[headers[key]] += (member[headers[key]] ? ';' : '') +  plan ;
            } else {
                member[headers[key]] = csvRow[key];
            }
        }
        
        if(csvRow.hasOwnProperty('Relationship')){
            member.Relationship = csvRow.Relationship;
        }
        return member;
    }

    function isRelationshipNotSpecified(csvRow, member) {
        return !csvRow.hasOwnProperty('Relationship') && 
            !member.hasOwnProperty(self.nsPrefix + 'IsPrimaryMember__c') &&  
            !member.hasOwnProperty(self.nsPrefix + 'IsSpouse__c');
    }

    /**
     * Converts the result of XLSX parsing to census JSON
     * @param {} csvData 
     */
    function csvDataToCensus(headers, csvData) {
        let empUniqueId;
        let members = csvData.map(function(csvRow, index) {
            let member = mapFieldsInSet(headers, csvRow);
            const uniqueId = Math.floor(Math.random() * new Date().valueOf().toString());
            
            /**
             * Handler if Relationship and IsPrimaryMember__c is not provided
             */
            if(isRelationshipNotSpecified(csvRow, member) || member[self.nsPrefix + 'IsPrimaryMember__c']){
                member.Relationship = 'Employee';
                member[self.nsPrefix + 'IsPrimaryMember__c'] = true; 
            }

            if(member.Relationship === 'Employee') {
                empUniqueId = uniqueId;
            }
            member[self.nsPrefix + 'IsPrimaryMember__c'] = member[self.nsPrefix + 'IsPrimaryMember__c'] || member.Relationship === 'Employee';
            if(!member[self.nsPrefix + 'PrimaryMemberIdentifier__c']) {
                member[self.nsPrefix + 'PrimaryMemberIdentifier__c'] = !member[self.nsPrefix + 'IsPrimaryMember__c'] ? empUniqueId : '';
            }
            if(!member[self.nsPrefix + 'MemberIdentifier__c']) {
                member[self.nsPrefix + 'MemberIdentifier__c'] = member[self.nsPrefix + 'IsPrimaryMember__c'] ? empUniqueId : uniqueId;
            }
            member[self.nsPrefix + 'IsSpouse__c'] = member[self.nsPrefix + 'IsSpouse__c'] || member.Relationship === 'Spouse';
            member.index = index;
            return member;
        });
        return $q.resolve(members);
    }

    function sortCensusRecord(census, censusData) {
        if (census[this.nsPrefix + 'IsPrimaryMember__c']) {
            censusData.splice(0, 0, census);
        } else if (census[this.nsPrefix + 'IsSpouse__c']) {
            if (censusData.length && censusData[0][this.nsPrefix + 'IsPrimaryMember__c']) {
                censusData.splice(1, 0, census);
            } else if (censusData.length) {
                censusData.splice(0, 0, census);
            } else {
                censusData = censusData.concat(census);
            }
            
        } else {
            censusData = censusData.concat(census);
        }

        return censusData;
    }

    function getProductEnrollmentField(headers) {
        let fieldDescription;
        for(let i = 0 ; i < headers.length ; i ++) {
            if(headers[i].name === self.nsPrefix + 'ContractLineId__c') {
                fieldDescription = headers[i];
                break;
            }
        }
        return fieldDescription;
    }

    function generateProductLookUps(headers) {
        const fieldDescription = getProductEnrollmentField(headers);
        const mapTypeToPlans = {};
        const mapIdToPlan = {};
        if(!fieldDescription || !fieldDescription.options) {
            return;
        }

        fieldDescription.options.forEach(function(product) {
            if(!mapTypeToPlans[product.type]) {
                mapTypeToPlans[product.type] = {};
            }

            mapIdToPlan[product.value] = product;
            mapTypeToPlans[product.type][product.name] = product.value;

        });

        return {
            typeToPlans: mapTypeToPlans,
            idToPlan: mapIdToPlan
        };

    }

    function setProductLookups(headers) {
        const lookups = generateProductLookUps(headers);
        if(!lookups){
            return;
        }
        self.mapTypeToPlans = lookups.typeToPlans;
        self.mapIdToPlan = lookups.idToPlan;
    }

    function setFields(fieldsetHeaders) {
        self.fieldSet = {
            headers: fieldsetHeaders
        };
        setProductLookups(fieldsetHeaders);
    }

    function updateMembers(opts) {
        if(opts.censusDetails.length > 0) {
            opts['census'] = createParamForCRUDCensusService(opts.censusDetails);
            return censusGateway.updateMembers(opts);
        }
        return $q.resolve({});
    }

    function deleteMembers(opts) {
        opts['census'] = createParamForCRUDCensusService(opts.censusDetails);
        return censusGateway.deleteMembers(opts);
    }

    function getFieldSetHeaders() {
        return self.fieldSet.headers;
    }

    function getMembers (opts) {
        return censusGateway.getMembers(opts)
            .then(function(result) {
                const deferred = $q.defer();
                if(result.errors && result.errors.length > 0) {
                    deferred.reject(result.errors);
                } else {
                    setFields(result.census.headers);
                    result = result.census.members || [];
                    const censusGroup = _.groupBy(result, function(censusDetail) {
                        return censusDetail[self.nsPrefix + 'RelatedCensusMemberId__c'] ||  censusDetail.Id; 
                    });
                    let censusDetails = [];
                    Object.keys(censusGroup).forEach(function(key) {
                        let censusData = [];
                        censusGroup[key].forEach(function(census) {
                            census.isEdited = false;
                            censusData = sortCensusRecord(census, censusData);
                        });
                        censusDetails = censusDetails.concat(censusData);
                    });
                    deferred.resolve(censusDetails);
                }
                return deferred.promise;
            });
    }

    function getMapIdToPlan() {
        return self.mapIdToPlan;
    }

    function getMapTypeToPlans() {
        return self.mapTypeToPlans;
    }

    function getCustomLabels(opts) {
        return censusGateway.getCustomLabels(opts);
    }

    return {
        getMembers: getMembers,
        deleteMembers: deleteMembers,
        updateMembers: updateMembers,
        censusDetails: this.censusDetails,
        csvDataToCensus: csvDataToCensus,
        getFieldSetHeaders: getFieldSetHeaders,
        getMapIdToPlan: getMapIdToPlan,
        getMapTypeToPlans: getMapTypeToPlans,
        getCustomLabels: getCustomLabels,
        getProductEnrollmentField: getProductEnrollmentField

    };
}]);


/**
 * Service to perform apex calls to Census Service
 */
vlocity.cardframework.registerModule.service('censusGateway', function($q) {
    const OperationType = {
        DELETE: 'DELETE',
        UPSERT: 'UPSERT'
    };
    const OperationPrefix = {
        GET: 'get',
        DELETE: 'delete',
        UPSERT: 'update'
    };
    const OperationTypes = [OperationType.DELETE, OperationType.UPSERT];
    // Calls OmniScript buttonClick function, will perform remote action (and optional preProcess method) defined on the Selectable Item
    // that houses this template
    /**
     * @param {Object} control Element control
     * @param {Object} scp Element scope
     * @param {Object|undefined} selectedItem In Selectable Items El case, the item selected by the user where they trigger the remote call
     * @param {String} operation The operation of the remote call ('Delete', 'Add', etc.)
     * @param {Function|undefined} customizer The customized function to be called once the remote call promise comes back
     */
    function remoteInvoke(control, scp) {
        const deferred = $q.defer();
        scp.buttonClick(scp.bpTreeResponse, control, scp, undefined, 'typeAheadSearch', undefined, function(remoteResp) {
            deferred.resolve(remoteResp);
        });
        return deferred.promise;
    }

    function getMethod(methodName,operation) {
        if(!operation || methodName.indexOf(OperationPrefix.GET) !== 0) return methodName;
        let newPrefix = '';
        if(operation === OperationType.DELETE) {
            newPrefix = OperationPrefix.DELETE;
        } else if(operation === OperationType.UPSERT) {
            newPrefix = OperationPrefix.UPSERT;
        }
        
        return methodName.replace(new RegExp('^' + OperationPrefix.GET), newPrefix);
    }
    
    function apexRequest(opts) {
        let operation = opts.operation;
        let control = opts.control;
        let scope = opts.scope;
        let configRemoteMethod = control.propSetMap.remoteMethod;
        const configRemoteClass = control.propSetMap.remoteClass;
        let remoteClass = '';

        if(OperationTypes.indexOf(operation) != -1) {
            control.propSetMap.remoteMethod = getMethod(control.propSetMap.remoteMethod, operation);
            scope.bpTree.response.census = opts.census;
        }
        else if(opts.remoteClass){
            control.propSetMap.remoteClass = opts.remoteClass;
            control.propSetMap.remoteMethod = opts.remoteMethod;
        }
        
        return remoteInvoke(opts.control, opts.scope)
            .then(function(response) {
                if(remoteClass) {
                    control.propSetMap.remoteClass = remoteClass;
                }
                scope.bpTree.response.census = null;
                control.propSetMap.remoteMethod = configRemoteMethod;
                control.propSetMap.remoteClass = configRemoteClass;
                return $q.resolve(response);
            });
    }

    function getMembers(opts) {
        return apexRequest(opts);
    }

    function deleteMembers(opts) {
        opts.operation = OperationType.DELETE;
        return apexRequest(opts);
    }

    function updateMembers(opts) {
        opts.operation = OperationType.UPSERT;
        return apexRequest(opts);
    }

    function getCustomLabels (opts) {
        opts.remoteClass = 'DefaultUserCustomLabelsImplementation';
        opts.remoteMethod = 'getUserCustomLabels';
        return apexRequest(opts);
    }

    return {
        getMembers: getMembers,
        deleteMembers: deleteMembers,
        updateMembers: updateMembers,
        getCustomLabels: getCustomLabels
    };
});

vlocity.cardframework.registerModule.controller('InsCensusController', ['$scope', '$rootScope', 'censusService', 'InsCensusModal', '$q', 'InsValidationHandlerService',  
function($scope, $rootScope, censusService, InsCensusModal, $q, InsValidationHandlerService){
    'use strict';

    const CENSUS_TEMPLATE_NAME = 'insOsFlowCensusTemplate';
    const RELATIONSHIP_KEY = 'Relationship';
    const RELATIONSHIPS = ['Employee', 'Spouse', 'Child'];
    const DEFAULT_UPLOAD_LIMIT = 2000;
    $scope.bpTree.response.validCensus = true;
    $scope.usePagination = true;
    $scope.isValidCensus = true;
    $scope.resources = {};
    $scope.censusInfo = {
        EmpCount: 0,
        EmpFaCount: 0,
        EmpChCount: 0,
        EmpSpCount: 0,
        total: 0
    };
    $scope.search = {
        keyword: ''
    };
    $scope.DEFAULT_LABELS = ['InsOSCensusEmployeeTotalCount', 'InsOSCensusEmployeeOnlyCount', 'InsOSCensusEmployeeWithSpouseCount', 'InsButtonCancel', 'Save', 
        'InsOSCensusEmployeeWithChildCount', 'InsOSCensusEmployeeWithFamilyCount', 'InsOSCensusSearchName', 'InsOSCensusDownloadTemplate', 'InsOSCensusUploadMembers', 
        'InsOSCensusAddEmployee', 'InsOSCensusDeleteAllData', 'InsOSCensusIdentifyFileMappings', 'InsOSCensusUploadSucceeded', 'InsOSCensusRecords', 'Select',
        'InsOSCensusRelationship', 'InsOSCensusRelationshipEmployee', 'InsOSCensusRelationshipSpouse', 'InsOSCensusRelationshipChild', 'InsOSCensusErrorUploadSummaryLink',
        'InsOSCensusErrorNoRowInFile', 'InsOSCensusErrorExceedRowCount', 'InsOSCensusErrorInvalidValueForRelationship', 'InsOSCensusErrorMissingParameter', 
        'InsOSCensusErrorInvalidValueOnUpload', 'InsOSCensusErrorEncounteredOnUpload', 'InsOSCensusOverwriteConfirmation', 'InsOSCensusDeleteMember'];

    function onSuccess(response) {
        try {
            censusService.censusDetails = syncMembersToResponse(censusService.censusDetails, response);
            $scope.filteredCensus = censusService.censusDetails.slice();
            $scope.headers = censusService.getFieldSetHeaders();
            formatAllDateFields(censusService.censusDetails, true);
            calculateCensusCount();
        }
        catch(e) {
            console.error(e);
        }
        
    }

    function createLookupIdToMember(members) {
        return members
            .reduce(function(map, member) {
                if(member.isNew || !member.isUpdated) {
                    map[member.Id] = member;
                }
                return map;
            }, {});
    }

    function syncMembersToResponse(currentMembers, response) {
        const lookupIdToMember = createLookupIdToMember(currentMembers);
        const newMembers = [];
        let members = [];
        response.forEach(function(member) {
            member = lookupIdToMember[member.Id] || member;
            if(member.isNew ) {
                newMembers.push(member);
            } else {
                members.push(member);
            }
        });
        return newMembers.concat(members);
    }

    function checkIfTextExists(value, keyword) {
        return value !== null && value !== undefined && value.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
    }

    function validateCensus(type, data) {
        if(type !== 'spouseCount') return ;
        
        const spouseCount = data.filter(function(member) {
            return member[$scope.nsPrefix + 'IsSpouse__c'] && !member[$scope.nsPrefix + 'IsPrimaryMember__c'];
        }).length;

        if(spouseCount > 1) {
            $scope.bpTree.response.validCensus = false;
        }
    }

    function calculateCensusCount() {
        const censusGroup = _.groupBy(censusService.censusDetails, function(censusDetail) {
            return censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c'] || censusDetail.Id;
        });

        $scope.censusInfo = {
            EmpCount: 0,
            EmpFaCount: 0,
            EmpChCount: 0,
            EmpSpCount: 0,
            total: 0
        };

        $scope.bpTree.response.validCensus = true;

        Object.keys(censusGroup).forEach(function(key) {
            let hasEmployee;
            let hasSpouse;
            let hasChild;
            censusGroup[key].forEach(function(census) {
                if (census[$scope.nsPrefix + 'IsPrimaryMember__c']) {
                    hasEmployee = true;
                } else if(census[$scope.nsPrefix + 'IsSpouse__c']) {
                    hasSpouse = true;
                } else if(census[$scope.nsPrefix + 'IsSpouse__c'] !== undefined) {
                    hasChild = true;
                }
            });

            if (hasEmployee && hasSpouse && hasChild) {
                $scope.censusInfo.EmpFaCount += 1;
            } else if (hasEmployee && hasSpouse && !hasChild) {
                $scope.censusInfo.EmpSpCount += 1;
            } else if (hasEmployee && !hasSpouse && hasChild) {
                $scope.censusInfo.EmpChCount += 1;
            } else if (hasEmployee && !hasSpouse && !hasChild) {
                $scope.censusInfo.EmpCount += 1;
            }

            validateCensus('spouseCount', censusGroup[key]);
        });

        $scope.censusInfo.total = $scope.censusInfo.EmpFaCount +
                                  $scope.censusInfo.EmpSpCount +
                                  $scope.censusInfo.EmpChCount +
                                  $scope.censusInfo.EmpCount;

        $scope.censusAgeErrorMsg = '';
        $scope.errorDOBList = [];
    }
    
    function getIndexToAddDependent(censusDetails, employee) {
        let index;
        let selectedEmp = false;

        censusDetails.forEach(function(censusDetail, censusIndex) {
            if (censusDetail[$scope.nsPrefix + 'MemberIdentifier__c'] === employee[$scope.nsPrefix + 'MemberIdentifier__c']) {
                selectedEmp = true;
                index = censusIndex;
            }
            if (selectedEmp && censusDetail[$scope.nsPrefix + 'PrimaryMemberIdentifier__c'] === employee[$scope.nsPrefix + 'MemberIdentifier__c']) {
                index = censusIndex;
            }
        });

        return index;
    }

    function getCensus(censusDetails, censusMember, isEmployee) {
        const removedCensusData = [];
        const updatedCensusData =  _.reject(censusDetails, function(censusDetail) {
            if (isEmployee && (censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c'] === censusMember.Id || censusDetail.Id === censusMember.Id)) {
                removedCensusData.push(censusDetail);
            } else if(!isEmployee && (censusDetail.Id === censusMember.Id || !censusMember.Id)) {
                removedCensusData.push(censusDetail);
            }

            if(censusDetail.isNew) {
                return isEmployee ?
                    censusDetail[$scope.nsPrefix + 'PrimaryMemberIdentifier__c'] === censusMember[$scope.nsPrefix + 'MemberIdentifier__c'] || censusDetail[$scope.nsPrefix + 'MemberIdentifier__c'] === censusMember[$scope.nsPrefix + 'MemberIdentifier__c'] :
                    censusDetail[$scope.nsPrefix + 'MemberIdentifier__c'] === censusMember[$scope.nsPrefix + 'MemberIdentifier__c'];

            } else {
                return isEmployee ? 
                    (censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c'] === censusMember.Id || censusDetail.Id === censusMember.Id) : 
                    censusDetail.Id === censusMember.Id;
            }
            
        });

        return {
            updatedCensusData,
            removedCensusData
        };
    }

    function filterEditedCensus(censusDetails) {
        return censusDetails.filter(function(censusDetail, index){ 
            censusDetail.index = index;
            return censusDetail.isEdited || censusDetail.isNew; 
        });
    }

    function groupCensus(members) {
        return _.groupBy(members, function(censusDetail) {
            return censusDetail[$scope.nsPrefix + 'PrimaryMemberIdentifier__c'] ||  censusDetail[$scope.nsPrefix + 'MemberIdentifier__c']; 
        });
    }

    function partialReload(response, ids) {
        const idToMemberMap = {};
        response.forEach(function(member) {
            if(ids.indexOf(member.Id) > -1) {
                idToMemberMap[member.Id] = member;
            }
        });
        censusService.censusDetails = censusService.censusDetails.map(function(member) {
            return idToMemberMap[member.Id] || member;
        });
    }

    function fullReload(response, membersWithError) {
        membersWithError = membersWithError || [];
        const newPrimaryWithError = [];
        const newDependentWithError = [];
        const idToMemberWithError = {};
        
        membersWithError.forEach(function(member) {
            member.error = formatErrorMessage(member.error, $scope.nameToLabelMap);
            if(!member.Id && member[$scope.nsPrefix + 'PrimaryMemberIdentifier__c']) {
                newDependentWithError.push(member);
            } else if(!member.Id && member[$scope.nsPrefix + 'MemberIdentifier__c']){
                newPrimaryWithError.push(member);
            } else {
                idToMemberWithError[member.Id] = member;
            }
        });
        const censusGroup = groupCensus(newPrimaryWithError.concat(response).concat(newDependentWithError));
        let newCensusDetails = [];
        for(let key in censusGroup) {
            newCensusDetails = newCensusDetails.concat(censusGroup[key]);
        }
        censusService.censusDetails = newCensusDetails.map(function(member){
            return idToMemberWithError[member.Id] || member;
        });
    }

    function reloadData(control, opts) {
        opts = opts || {};
        const errors = opts.errors || [];
        return censusService.getMembers({control: control, scope: $scope})
            .then(function(response) {
                if(opts.ids) {
                    partialReload(response, opts.ids);
                }
                else {
                    fullReload(response, errors);
                }
                formatAllDateFields(censusService.censusDetails, true);
                reload();
            });
    }

    $scope.upsertTableData = function(control) {
        const censusDetails = filterEditedCensus(censusService.censusDetails);
        let errors;
        formatAllDateFields(censusDetails);
        return censusService
            .updateMembers({control: control, scope: $scope, censusDetails: censusDetails})
            .then(function(response) {
                errors = response.errors || [];
                return reloadData(control, {errors: errors});
            });
    };

    function deleteCensus(control, censusMember, isEmployee){
        const membersList = getCensus(censusService.censusDetails, censusMember, isEmployee);
        if(censusMember.Id) {
            censusService
                .deleteMembers({control: control, scope: $scope, censusDetails: membersList.removedCensusData})
                .then(function() {
                    let ids = [];
                    if(!isEmployee) {
                        ids.push(censusMember[$scope.nsPrefix + 'RelatedCensusMemberId__c']);
                    }
                    censusService.censusDetails = membersList.updatedCensusData;
                    return reloadData(control, {ids: ids});
                });
        } else {
            censusService.censusDetails = membersList.updatedCensusData;
            reload(censusMember.index);
        }
    }
    
    function hasUnsavedChangesForMember(memberId) {
        if(!memberId) {
            return false;
        }

        return censusService.censusDetails.some(function(member) {
            return member.isEdited && member.Id === memberId;
        });
    }

    $scope.deleteCensus = function(control, censusMember, isEmployee) {
        if(censusMember.Id && hasUnsavedChangesForMember(censusMember[$scope.nsPrefix + 'RelatedCensusMemberId__c'])) {
            InsCensusModal.launchConfirmationModal($scope, $scope.customLabels.InsOSCensusDeleteMember, 
                $scope.customLabels.InsOSCensusOverwriteConfirmation, 
                function() {
                    deleteCensus(control, censusMember, isEmployee);
                });
         }
        else {
            deleteCensus(control, censusMember, isEmployee);
        }
    
    };

    function formatAllDateFields(censusDetails, toUTC) {
        const dateFields = $scope.headers.filter(function(header) {
            return header.type === 'DATE' || header.type === 'DATETIME';
        });
        if(dateFields.length === 0) {
            return;
        }
        censusDetails.forEach(function(member) {
            dateFields.forEach(function(dateField)  {
                member[dateField.name] = formatDate(member[dateField.name], toUTC);
            });
        });
    }

    function formatDate(date, toUTC) {
        const userLocale = $rootScope.vlocity.userAnLocale;
        if(isNaN(Date.parse(date)) || (!isNaN(date) && !(date instanceof Date))) {
            return date;
        }
        const d = new Date(date);
        let formattedDate;
        if (userLocale) {
            formattedDate = d.toLocaleDateString(userLocale);
        } else {
            formattedDate = toUTC ? (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear() :
                 (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); 
        }
        return formattedDate;
    }

    $scope.updateCensusMember = function(censusMember, shouldUpdateCount){
        censusService.censusDetails.some(function(censusDetail) {
            if(censusDetail.Id === censusMember.Id) {
                censusMember.isEdited = true;
                return true;
            }
        });

        if (shouldUpdateCount) {
            calculateCensusCount();
        }
    };

    function reload(index) {
        filterEmployees($scope.search.keyword);
        calculateCensusCount();
        if(index != null) {
            navigateToPageOfIndex(index);
        } else {
            navigateToPage($scope.currentPage - 1);
        }
    }

    function initMember(primaryMemberId) {
        const member = {};
        const isDependent = !!primaryMemberId;
        let headers = $scope.headers;

        headers.forEach(function(header) {
            member[header.name] = '';
        });

        member[$scope.nsPrefix + 'IsPrimaryMember__c'] = !isDependent;
        member[$scope.nsPrefix + 'PrimaryMemberIdentifier__c'] = primaryMemberId;
        member[$scope.nsPrefix + 'MemberIdentifier__c'] = Math.floor(Math.random() * new Date().valueOf().toString());
        member.isNew = true;

        return member;
    }

    $scope.addNewMember = function(employee) {
        const isDependent = !!employee;
        employee = employee || {};
        const member = initMember(employee[$scope.nsPrefix + 'MemberIdentifier__c']);
        const censusDetail = member;
        let index = 0;
        if (isDependent) {
            index = getIndexToAddDependent(censusService.censusDetails, employee);
            censusService.censusDetails.splice(index + 1, 0, censusDetail);
        } else {
            censusService.censusDetails = [censusDetail].concat(censusService.censusDetails);
        }
        reload(index);
    };

    function validateHasValidRows(csvData) {
        if(!csvData.length) {
            InsValidationHandlerService.throwError({
                message: $scope.customLabels.InsOSCensusErrorNoRowInFile
            });
            return false;   
        }
        let uploadLimit = DEFAULT_UPLOAD_LIMIT;
        if($scope.bpTree.response.censusMemberUploadLimit && !isNaN($scope.bpTree.response.censusMemberUploadLimit)) {
            uploadLimit = parseInt($scope.bpTree.response.censusMemberUploadLimit);
        }
        if(csvData.length > uploadLimit){
            InsValidationHandlerService.throwError({
                message: $scope.customLabels.InsOSCensusErrorExceedRowCount.replace('{0}', uploadLimit)
            });
            return false;
        }
        return true;
    }

    function getRelationshipIndex(csvData) {
        let csvColumnHeaders = Object.keys(csvData[0]);
        return csvColumnHeaders.indexOf(RELATIONSHIP_KEY);
    }

    function getCsvColumnHeaders(csvData) {
        const csvColumnHeaders = Object.keys(csvData[0]);
        const relationshipHeaderIdx = getRelationshipIndex(csvData);
        if(relationshipHeaderIdx > -1) {
            csvColumnHeaders.splice(relationshipHeaderIdx, 1);
        }
        return csvColumnHeaders;
    }

    function validateRelationshipKeys(csvData) {
        if(getRelationshipIndex(csvData) === -1){
            return true;
        }
        const errors = csvData.filter(function(row) {
            if(RELATIONSHIPS.indexOf(row[RELATIONSHIP_KEY]) === -1) {
                row['Error'] = $scope.customLabels.InsOSCensusErrorInvalidValueForRelationship.replace('{0}', row[RELATIONSHIP_KEY]);
                return true;
            }
        });
        if(errors.length > 0) {
            handleUploadError(generateCSVToJSONErrorMessage(csvData.length, errors.length), csvData, errors, []);
            return false;
        }
        return true;
    }

    function hasUnsavedChanges() {
        return censusService.censusDetails.some(function(member) {
            return member.isEdited || member.isNew;
        });
    }

    function openFileMapperModal(control, csvData) {
        const cardFieldMap = {};
        const csvColumnHeaders = getCsvColumnHeaders(csvData);
        $scope.headers.forEach(function(header){
            if(csvColumnHeaders.indexOf(header.label) !== -1) {
                cardFieldMap[header.label] = header.name;
            }
        });

        const records = {
            data: csvData,
            csvColumnHeaders: csvColumnHeaders,
            cardFieldMap: cardFieldMap,
            uploadInfo: {
                status: 'success',
                csvDataCount: csvData.length
            }
        };
        
        InsCensusModal.launchFileMapperModal($scope, records, 
            control, 'vloc-ins-editable-table', 'true', $scope.customLabels.InsOSCensusUploadMembers);
    }

    $scope.uploadCensus = function($event, control) {
        const csvData = XLSX.utils.sheet_to_json($event.workbook.Sheets[$event.workbook.SheetNames[0]], { defval: ''});
        
        if(!validateHasValidRows(csvData)) {
            return;
        }
        if(!validateRelationshipKeys(csvData)) {
            return;
        }
        if(hasUnsavedChanges()) {
            InsCensusModal.launchConfirmationModal($scope, $scope.customLabels.InsOSCensusUploadMembers, 
                $scope.customLabels.InsOSCensusOverwriteConfirmation, 
                function() {
                    openFileMapperModal(control, csvData);
                });
        }
        else {
            openFileMapperModal(control, csvData);
        }
        
    };

    $scope.uploadError = function($event) {
        console.warn($event.error);
    };

    function filterEmployees(keyword) {
        if (!keyword || !keyword.length) {
            $scope.filteredCensus = censusService.censusDetails.slice(0);
            return; 
        }

        let searchIdList = []; 
        const filteredCensus = [];

        censusService.censusDetails.map(function(censusDetail) {
            if (checkIfTextExists(censusDetail[$scope.nsPrefix + 'FirstName__c'], keyword) || checkIfTextExists(censusDetail[$scope.nsPrefix + 'LastName__c'], keyword) ) {
                if (censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c'] && searchIdList.indexOf(censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c']) === -1) {
                     searchIdList.push(censusDetail[$scope.nsPrefix + 'RelatedCensusMemberId__c']);
                } else if (searchIdList.indexOf(censusDetail.Id) === -1) {
                     searchIdList.push(censusDetail.Id); 
                }
            }
        });

        censusService.censusDetails.forEach(function(emp) {
            if (searchIdList.indexOf(emp.Id) !== -1 || searchIdList.indexOf(emp[$scope.nsPrefix + 'RelatedCensusMemberId__c']) !== -1) {
                filteredCensus.push(emp);
            }
        });

        $scope.filteredCensus = filteredCensus;
    }

    /**
     * Filters table data by firstname/lastname based on the input of search box
     * 
     * @param {String} $scope.search.keyword search term for the filtering
     */
    $scope.searchEmployee = function() {
        filterEmployees($scope.search.keyword);
        navigateToFirstPage();
    };

    $scope.clearSearch = function() {
        $scope.search.keyword = '';
        $scope.searchEmployee();
    };

    /**
     * Validate Census
     */
    function validateOSTemplate() {
        if(!$scope.bpTree.response.censusId ) {
            InsValidationHandlerService.throwError({
                message: $scope.customLabels.InsOSCensusErrorMissingParameter.replace('{0}', 'censusId')
            });
            $scope.isValidCensus = false;
            return false;   
        }
        return true;
    }

    function onRequestError(errors) {
        InsValidationHandlerService.throwError({
            message: errors 
        });
        $scope.isValidCensus = false;
    }

    function handleCustomLabelsResponse(response) {
        $scope.resources.isLoaded = true;
        customLabels = $scope.bpTree.response.names.split(',');
        customLabels.forEach(function(labelId){
            if(response.data[labelId]){
                $scope.customLabels[labelId] = response.data[labelId];
            }
        });
    }

    function loadLabelsAndMembers(control) {
        if(!$scope.bpTree.response.names) {
            $scope.bpTree.response.names = $scope.DEFAULT_LABELS.join();
        }
        return censusService.getCustomLabels({control: control, scope: $scope})
            .then(function(response) {
                handleCustomLabelsResponse(response);
                if(!validateOSTemplate()) {
                    return;
                }
                return censusService.getMembers({control: control, scope: $scope});
            });
    }

    function initHeaders() {
        $scope.nameToLabelMap = $scope.headers.reduce(function(nameToLabelMap, header) {
            if(header.name === ($scope.nsPrefix + 'LastName__c')) {
                $scope.lblLastName = header.label;
            }
            nameToLabelMap[header.name] = header.label;
            return nameToLabelMap;
        }, {});
        $scope.mapIdToPlan = censusService.getMapIdToPlan();
        $scope.mapTypeToPlans = censusService.getMapTypeToPlans();
    }
  
    /**
     * Triggered on page initialization, retrieves all the members for the current censusId
     */
    $scope.loadCensus = function(control) {
        loadLabelsAndMembers(control)
            .then(onSuccess, onRequestError)
            .then(navigateToFirstPage)
            .then(initHeaders);
    };

    /**
     * When triggered, deletes all members for the current censusId
     * 
     * @param {Object} control Element control
     * 
     */
    $scope.deleteAllCensus = function(control) {
        const toDeleteCensusDetails = censusService.censusDetails.filter(function(member) {
            return member.Id;
        });
        censusService
            .deleteMembers({control: control, scope: $scope, censusDetails: toDeleteCensusDetails})
            .then(onSuccess([]))
            .then(navigateToFirstPage);
    };

    function sheetToBuffer(sheet) { 
        let buffer = new ArrayBuffer(sheet.length);
        let view = new Uint8Array(buffer);
        for (let i=0; i<sheet.length; i++) view[i] = sheet.charCodeAt(i) & 0xFF;
        return buffer;    
    }

    function generateCSVFile(newCSVData) {
        const ERROR_SHEET_TITLE = 'Upload data with error';
        const workbook = XLSX.utils.book_new();
        workbook.SheetNames.push(ERROR_SHEET_TITLE);
        const worksheet = XLSX.utils.aoa_to_sheet(newCSVData);
        workbook.Sheets[ERROR_SHEET_TITLE] = worksheet;
        return XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});
    }

    function shouldShowInvalidRowsOnly() {
        return $scope.bpTree.response.showInvalidRowsOnly;
    }

    function generateCSVData(censusMembers, headers) {
        const KEY_ERROR = 'Error';
        const csvColumnHeaders = Object.keys(censusMembers[0]);
        if(csvColumnHeaders.indexOf(KEY_ERROR) < 0) {
            csvColumnHeaders.push(KEY_ERROR);
        }
        const newCSVData = [];
        const fieldNameToHeaderMap = getFieldNameToHeaderMap(headers);
        censusMembers.forEach(function(csvRow) {
            if(!csvRow.hasOwnProperty(KEY_ERROR) && shouldShowInvalidRowsOnly()) {
                return;
            }
            newCSVData.push(csvColumnHeaders.map(function(header) {
                if(header == KEY_ERROR) {
                    return formatErrorMessage(csvRow[header], fieldNameToHeaderMap);
                }
                return csvRow[header];
            }));
        });
        newCSVData.unshift(csvColumnHeaders);
        return newCSVData;
    }

    function getFieldNameToHeaderMap(headers) {
        const ret = {};
        for(let key in headers){
            ret[headers[key]] = key;
        }
        const enrollmentField = censusService.getProductEnrollmentField($scope.headers);
        if(enrollmentField) {
            ret[enrollmentField.name] = enrollmentField.label;
        }
        return ret;
    }

    function formatErrorMessage(message, headers) {
        if(!message) {
            return '';
        }

        for(let key in headers) {
            if(key.indexOf($scope.nsPrefix) === 0) {
                message = message.replace(new RegExp(key, 'g'), headers[key]);
            }
        }
        return message;
    }

    /**
     *
     * Adds the errors from response to the parsed CSV data in JSON format
     * 
     * @param {Response} response - update response
     * @param {Array[Object]} csvData - parsed CSV data
     */
    function appendResponseErrorsToCSVData(response, csvData) {
        const responseErrors = response.errors;
        responseErrors.forEach(function(member) {
            csvData[member.index].Error = member.error;
        });
    }

    function generateCSVToJSONErrorMessage(totalUploadCount, errCount) {
        return $scope.customLabels.InsOSCensusErrorInvalidValueOnUpload
            .replace('{0}', errCount)
            .replace('{1}', totalUploadCount);
    }

    function generateErrorMessage(totalUploadCount, errCount) {
        return $scope.customLabels.InsOSCensusErrorEncounteredOnUpload
            .replace('{0}', errCount)
            .replace('{1}', totalUploadCount);
    }

    /**
     * Displays toast with link to the upload summary
     * 
     * @param {Array[Object]} worksheetData - return of XLSX.read function
     */
    function handleUploadError(errorMessage, worksheetData, errors, headers) {
        const newWorksheetData = generateCSVData(worksheetData, headers);
        const worksheetUploadSummary = generateCSVFile(newWorksheetData);
        InsValidationHandlerService.throwError({
            message: errorMessage,
            action: {
                callback: function() {
                    saveAs(new Blob([sheetToBuffer(worksheetUploadSummary)], {type: 'application/octet-stream'}), 
                    'upload-summary.xlsx');
                },
                title: $scope.customLabels.InsOSCensusErrorUploadSummaryLink
            }
        });
    }

    /**
     * Displays save error in UI, if any. 
     * If the error is a string, display a toast containing the message.
     * If the error is an array, append it to the csv upload file.
     *  
     * @param {Object} response - response 
     * @param {Array[Object]} csvData raw csv rows extracted by papaparse/sheet js. Mapping should be {columnheader: cellValue}
     * @param {Array[Object]} headers field definition and their mapping to the CSV headers
     */
    function handleSaveResponseError(response, headers, csvData) {
        if(response.errors && response.errors.length) {
            if(Array.isArray(response.errors) && response.errors[0].index !== undefined) {
                appendResponseErrorsToCSVData(response, csvData);
                handleUploadError(generateErrorMessage(csvData.length, response.errors.length), csvData, response.errors, headers);
            }
            else {
                InsValidationHandlerService.throwError({
                    message: response.errors
                });
            }
        }
    }

    /**
     * Workflow to save census members from csv/xls upload. 
     * 
     * @param {Object} control Element control
     * @param {Array[Object]} headers field definition and their mapping to the CSV headers
     * @param {Array[Object]} members raw csv rows extracted by papaparse/sheet js. Mapping should be {columnheader: cellValue}
     * 
     */
    $scope.saveUploadData = function(control, headers, members) {
        let censusMembers = null;
        const csvData = members;
        
        censusService
            .csvDataToCensus(headers, members)
            .then(function(members) {
                censusMembers = members;
                formatAllDateFields(censusMembers);
                return censusService
                    .updateMembers({control: control, scope: $scope, censusDetails: members});
            })
            .then(function(response) {
                handleSaveResponseError(response, headers, csvData);
                if(response.censusMemberIds && response.censusMemberIds.length) {
                    censusService.censusDetails.forEach(function(member) {
                        member.isUpdated = response.censusMemberIds.indexOf(member.Id) > -1;
                    });
                }
                return censusService.getMembers({control: control, scope: $scope});
            })
            .then(onSuccess, onRequestError)
            .then(navigateToFirstPage);
    };

    window.onbeforeunload = function(event) {
        event.preventDefault();
        if (filterEditedCensus(censusService.censusDetails).length) {
            return '';
        }
    };

    $scope.downloadFile = function() {
        window.open('../resource/' + CENSUS_TEMPLATE_NAME);
        return false;
    };
    
    $scope.itemsPerPage = 10;

    function navigateToPageOfIndex(index) {
        navigateToPage(Math.floor((index + 1)/ $scope.itemsPerPage));
    }

    function navigateToFirstPage() {
        navigateToPage(0);
    }

    $scope.navigateToPage = navigateToPage;

    function navigateToPage(index) {
        $scope.paginateItems(null, {page: index});
    }

    function generatePages(current, last) {
        const buffer = 2;
        const leftCounter = current - buffer;
        const rightCounter = current + buffer + 1;
        const pages = [];
        let pagesWithEllipses = [];
        let prevPage;

        for(let i = 1; i <= last; i++) {
            if(i == 1 || i == last || i >= leftCounter && i < rightCounter) {
                pages.push(i);
            }
        }
        pages.forEach(function(page){
            if (prevPage) {
                if (page - prevPage === buffer) {
                    pagesWithEllipses.push(prevPage + 1);
                } else if (page - prevPage !== 1) {
                    pagesWithEllipses.push('...');
                }
            }
            pagesWithEllipses.push(page);
            prevPage = page;
        });
        if(pagesWithEllipses.length == 1){
            return [];
        } else {
            return pagesWithEllipses;    
        }
    }

    // Gets called when clicking next/previous directional buttons at top
    $scope.paginateItems = function(direction, opts) {
        if(!$scope.filteredCensus){
            return;
        }
        $scope.filteredCensus.forEach(function(detail, index) {
            detail.index = index;
        });

        opts = opts || {};
        let startIndex = 0;
        const data = $scope.tableData;
        
        $scope.totalNumberOfPages = Math.ceil($scope.filteredCensus.length / $scope.itemsPerPage);
        $scope.totalNumberOfItems = $scope.filteredCensus.length;
        if(opts.page) {
            if(opts.page >= $scope.totalNumberOfPages) {
                opts.page = $scope.totalNumberOfPages - 1;
            }
            startIndex = opts.page * $scope.itemsPerPage;    
        } else if (direction === 'next') {
            startIndex = data[data.length - 1].index + 1;
        } else if (direction === 'prev') {
            startIndex =  data[0].index - $scope.itemsPerPage;
            if (startIndex < 0) {
                startIndex = 0;
            }
        }
        $scope.currentPage = Math.ceil(startIndex / $scope.itemsPerPage ) + 1;
        $scope.pages = generatePages($scope.currentPage, $scope.totalNumberOfPages);
        $scope.tableData = $scope.filteredCensus ? $scope.filteredCensus.slice(startIndex, startIndex + $scope.itemsPerPage) : [];
    };

    // Decides whether the directional button should be active or disabled based on
    // the location we're at in the whole set of products.
    $scope.showPageControl = function(direction) {
        let show = false;
        if (direction === 'next') {
            show = $scope.tableData[$scope.tableData.length - 1].index < $scope.filteredCensus.length - 1;
        } else if (direction === 'prev') {
            show = $scope.tableData[0].index > 0;
        }
        return show;
    };

    $scope.showError = function(censusDetail) {
        censusDetail.isErrorDisplayed = !censusDetail.isErrorDisplayed;
    };

    angular.element(window).bind('scroll', function(event) {
        const elDatePicker = document.querySelector('.nds-datepicker');
        if(!elDatePicker) {
            return;
        }
        const elField = elDatePicker.previousElementSibling;
        const boundingBoxField = elField.getBoundingClientRect();
        elDatePicker.style.top = (boundingBoxField.top + boundingBoxField.height) + 'px';
        
    });
    

}]);

vlocity.cardframework.registerModule.directive('insScrollHandler', [function() {
    return {
      link: function (scope, elem) {
        elem.on('scroll', function () {
            const elDatePicker = document.querySelector('.nds-datepicker');
            if(elDatePicker) {
                elDatePicker.previousElementSibling.click();
            }
        });
      }
    };
}]);

// Modal Service
//----------------------------------------------------------------
//----------------------------------------------------------------
//----------------------------------------------------------------
vlocity.cardframework.registerModule.factory('InsCensusModal', ['$sldsModal',
    function($sldsModal){
        'use strict';

        const scrollTop = function() {
            if ('parentIFrame' in window){
                window.parentIFrame.scrollTo(0);
            } else {
                $('body').scrollTop(0);
            }
        };

        return {
            launchFileMapperModal: function(scope, records, control, customClass, onHide, title) {
                const modalScope = scope.$new();
                scrollTop();
                modalScope.isLayoutLoaded = false;
                modalScope.title = title;
                modalScope.customClass = customClass;
                modalScope.uploadInfo = records.uploadInfo;
                modalScope.cardFieldMap = records.cardFieldMap;
                modalScope.csvColumnHeaders = records.csvColumnHeaders;
                modalScope.setCensusMembers = function() {
                    this.$slideHide();
                    scope.saveUploadData(control, modalScope.cardFieldMap, 
                        records.data);
                };

                $sldsModal({
                    scope: modalScope,
                    templateUrl: 'sldsModalTemplate.html',
                    show: true,
                    vlocSlide: true,
                    onHide: onHide
                });
            },

            launchConfirmationModal: function(scope, title, message, onSave) {
                const modalScope = scope.$new();
                scrollTop();
                modalScope.isLayoutLoaded = false;
                modalScope.title = title;
                modalScope.message = message;
                modalScope.onSave = function() {
                    this.$slideHide();
                    onSave();
                };

                $sldsModal({
                    scope: modalScope,
                    templateUrl: 'confirmationTemplate.html',
                    show: true,
                    vlocSlide: true,
                    onSave: onSave
                });
            }
        };
    }
]);

vlocity.cardframework.registerModule.factory('InsUtils', function() {
    return {
        /**
         * Returns all the values in a JSON
         * Alternative function for Object.values()
         * 
         * @param {Object} obj - JSON
         */
        toJSONValues: function(obj) {
            if(!obj) return [];
            let values = [];
            for(let key in obj) {
                values.push(obj[key]);
            }
            return values;
        }
    };
});

vlocity.cardframework.registerModule.factory('InsValidationHandlerService', ['$rootScope', '$sldsModal', '$timeout', function($rootScope, $sldsModal, $timeout) {
    'use strict';
    return {
        throwError: function(error) {
            let statusCode = '';
            if (!error.message) {
                error.message = 'No error message.';
            }
            if (error.statusCode) {
                statusCode = '(' + error.statusCode + '): ';
            }
            if (typeof error.type === 'string') {
                error.type = error.type.charAt(0).toUpperCase() + this.slice(1) + ' ';
            } else {
                error.type = '';
            }
            if (error.message && error.message.indexOf('Logged in?') > -1) {
                error.message = 'You have been logged out of Salesforce. Please back up any changes to your document and refresh your browser window to login again.';
                error.type = '';
                statusCode = '';
            }
            $rootScope.notification = $rootScope.notification || {};
            $rootScope.notification.active = true;
            $rootScope.notification.type = 'error';
            if($rootScope.notification.type === 'error') {
                $rootScope.notification.icon = 'error';
            }
            $rootScope.notification.message = error.type + statusCode + error.message;
            $rootScope.notification.action = error.action;
            
            
            $timeout(function() {
                $rootScope.isLoaded = true;
            }, 500);
        }
    };
}]);