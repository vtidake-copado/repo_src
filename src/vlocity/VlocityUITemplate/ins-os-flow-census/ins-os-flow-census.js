vlocity.cardframework.registerModule.directive('apJsXls', function() {
    return {
        restrict: 'E',
        template: '<span class="sheet-js-import"><input id="{{inputId}}" name="{{inputId}}" class="sheet-js-import__input" ng-class="inputClass" type="file" accept=".csv, .xlsx"/><label for="{{inputId}}" class="sheet-js-import__label" ng-class="labelClass">{{labelText}}</label></span>',
        replace: true,
        scope: {
            onRead: '&',
            onError: '&',
            validation: '&',
            inputId: '@',
            labelText: '@',
            wrapperClass: '@',
            inputClass: '@',
            labelClass: '@'
        },
        link: function (scope, element, attrs) {
            const input = element.find('input');
            function handleSelect() {
                var files = this.files;
                for (var i = 0, f = files[i]; i != files.length; ++i) {
                    var reader = new FileReader();
                    var name = f.name;
                    
                    reader.onload = function (e) {
                        if (!e) {
                            var data = reader.content;
                        } else {
                            var data = e.target.result;
                        }

                        /* if binary string, read with type 'binary' */
                        try {
                            var workbook = XLSX.read(data, { type: 'binary', cellDates:true });
    
                            if (scope.onRead) {
                                if (typeof scope.onRead === "function") {
                                    scope.onRead({ $event: { workbook: workbook } });
                                }
                            }
                        } catch(err) {
                            if (scope.onError) {
                                if (typeof scope.onError === "function") {
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
                            var binary = "";
                            var pt = this;
                            var reader = new FileReader();
                            reader.onload = function (e) {
                                var bytes = new Uint8Array(reader.result);
                                var length = bytes.byteLength;
                                for (var i = 0; i < length; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                //pt.result  - readonly so assign binary
                                pt.content = binary;
                                $(pt).trigger('onload');
                            }
                            reader.readAsArrayBuffer(fileData);
                        }
                    }

                    reader.readAsBinaryString(f);

                }
            }

            input.on('change', handleSelect);
        }
    };
});

vlocity.cardframework.registerModule.service('censusService', function($q) {
    let _this = this;
    _this.censusDetails = [];
    _this.empType = {};

    function formInputMap(censusId, members) {
        return {
            censusId: censusId,
            census: {
                headers: [// TODO Confirm what headers are really required
                    {
                    "type": "STRING",
                    "label": "Last Name",
                    "fieldId": "",
                    "name": "Name"
                },
                {
                    "type": "STRING",
                    "label": "First Name",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__FirstName__c"
                },
                {
                    "type": "DOUBLE",
                    "label": "FTE",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__FTE__c"
                },
                {
                    "type": "PICKLIST",
                    "label": "Gender",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__Gender__c"
                },
                {
                    "type": "DATE",
                    "label": "Birthday",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__Birthdate__c"
                },
                {
                    "type": "DATE",
                    "label": "Hire Date",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__HireDate__c"
                },
                {
                    "type": "DOUBLE",
                    "label": "No. Dependents",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__NumberOfDependents__c"
                },
                {
                    "type": "STRING",
                    "label": "Postal Code",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__PostalCode__c"
                },
                {
                    "type": "PICKLIST",
                    "label": "Type",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__MemberType__c"
                },
                {
                    "type": "BOOLEAN",
                    "label": "Primary",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__IsPrimaryMember__c"
                },
                {
                    "type": "STRING",
                    "label": "Class Codes",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__ClassCodes__c"
                },
                {
                    "type": "REFERENCE",
                    "label": "Group Class",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__GroupClassId__c"
                },
                {
                    "type": "REFERENCE",
                    "label": "Primary Census Member",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__RelatedCensusMemberId__c"
                },
                {
                    "type": "REFERENCE",
                    "label": "Primary Member Identifier",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__PrimaryMemberIdentifier__c"
                },
                {
                    "type": "STRING",
                    "label": "Member Identifier",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__MemberIdentifier__c"
                },
                {
                    "type": "EMAIL",
                    "label": "Email",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__Email__c"
                },
                {
                    "type": "BOOLEAN",
                    "label": "Is Spouse",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__IsSpouse__c"
                },
                {
                    "type": "BOOLEAN",
                    "label": "Spouse",
                    "fieldId": "",
                    "name": "%vlocity_namespace%__HasSpouse__c"
                }],
                members
            }
        }
    }

    function sheetToCensus(censusData) {
        let members = [];
        let empUniqueId;
        
        censusData.map((censusRecord) => {
            const uniqueId = Math.floor(Math.random() * new Date().valueOf().toString());

            if (censusRecord.Relationship === 'Employee') {
                empUniqueId = uniqueId;
            }

            members.push({
                %vlocity_namespace%__FirstName__c: censusRecord['First Name'],
                Name: censusRecord['Last Name'],
                %vlocity_namespace%__Birthdate__c: censusRecord['Date of Birth'],
                %vlocity_namespace%__Gender__c: censusRecord.Gender,
                %vlocity_namespace%__IsPrimaryMember__c: censusRecord.Relationship === 'Employee',
                %vlocity_namespace%__IsSpouse__c: censusRecord.Relationship === 'Spouse',
                %vlocity_namespace%__MemberIdentifier__c: empUniqueId
            });
        });

        return $q.resolve(members);
    }

    function doGenericInvoke(className, methodName, inputMap) {
       const config = Object.assign({}, {escape: false});

	    return $q((resolve, reject) => {
			%vlocity_namespace%.BusinessProcessDisplayController.GenericInvoke2(
                className,
                methodName,
                angular.toJson(inputMap),
                {},
                (result, event) => {
                    if(event.status) {
                        return resolve(result);
                    } else {
                        return reject(event);
                    }
                }, config);
			})
			.then((result) => {
				result = JSON.parse(result);
				return $q((resolve, reject) => {
					if (result.error !== 'OK') {
						reject(result);
					} else {
						resolve(result);
					}
				})
			});
    }

    function sortCensusRecord(census, censusData) {
        if (census.%vlocity_namespace%__IsPrimaryMember__c) {
            censusData.splice(0, 0, census);
        } else if (census.%vlocity_namespace%__IsSpouse__c) {
            
            if (censusData.length && censusData[0].%vlocity_namespace%__IsPrimaryMember__c) {
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

    function getCensusData(censusId) {
        const inputMap = formInputMap(censusId, []);
	    
        return doGenericInvoke(
            'InsCensusService',
            'getMembers',
            inputMap
        );
    }

    function loadCensusData(censusId) {
        return getCensusData(censusId)
        .then((result) => {
            result = result.census.members || [];

            const censusGroup = _.groupBy(result, (censusDetail) => {  //TODO Grouping based on employee record to be handled on backend 
                return censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c ||  censusDetail.Id; 
            });

            let censusDetails = [];

            Object.keys(censusGroup).forEach(function(key) {
                let censusData = [];

                censusGroup[key].forEach((census) => {
                    census.%vlocity_namespace%__Birthdate__c = new Date(census.%vlocity_namespace%__Birthdate__c);
                    census.isEdited = false;
                    
                    if (census.Id.substring(0, 15) && census.Id.substring(0, 15).includes(census.Name)) { //TODO Temporary: Needs to be handled on backend 
                        census.Name = '';
                    }

                    censusData = sortCensusRecord(census, censusData);
                });
                censusDetails = censusDetails.concat(censusData);
            });

            return censusDetails;
        });
    }

    function deleteCensusData(censusId, members) {
        const inputMap = formInputMap(censusId, members);
        
        return doGenericInvoke(
            'InsCensusService',
            'deleteMembers',
            inputMap
        );
    }

    function updateCensusData(censusId, members) {
        if (members.length) {
            const inputMap = formInputMap(censusId, members);

            return doGenericInvoke(
                'InsCensusService',
                'updateMembers',
                inputMap
            );
        }

        return $q.resolve({});
    }

    return {
        empType: this.empType,
        updateCensusData: updateCensusData,
        censusDetails: this.censusDetails,
        loadCensusData: loadCensusData,
        getCensusData: getCensusData,
        deleteCensusData: deleteCensusData,
        sheetToCensus: sheetToCensus
    }
});

vlocity.cardframework.registerModule.controller('insCensusOsCtrl', ['$scope', '$window', 'censusService',  function($scope, $window, censusService) {
    'use strict';
    
    const CENSUS_TEMPLATE_NAME = 'insOsFlowCensusTemplate';
    $scope.gender = ["Male", "Female"];
    $scope.censusInfo = {
        EmpCount: 0,
        EmpFaCount: 0,
        EmpChCount: 0,
        EmpSpCount: 0,
        total: 0
    };
    $scope.searchText = '';
    $scope.bpTree.response.validCensus = true;
    $scope.censusLoading = false;
    $scope.censusTemplateUrl = `../resource/${CENSUS_TEMPLATE_NAME}`;
    let depInfo = {};
    // $scope.$watch('bpTree.response.censusId', (newVal) => {
    //     if (newVal) {
    //         loadCensusData();
    //     }
    // });

    function assignClassName() {
        const stepName = $scope.bpTree.children[$scope.bpTree.asIndex].bAccordionActive && $scope.bpTree.children[$scope.bpTree.asIndex].name;

        if ($scope.bpService.isMobileBrowser) {
           document.querySelectorAll(`#${stepName} .nds-header__mobile-only`)[0].className = 'nds-header__mobile-only hideCommonNav';
        } else {
            document.querySelectorAll(`#${stepName} .nds-header__desktop`)[0].className = 'nds-header__desktop hideCommonNav';
        }
    }

    function onSuccess(response) {
        censusService.censusDetails = response;
        $scope.filteredCensus = [...response];
        calculateCensusCount();
    }

    function handleResponse() {
        $scope.censusLoading = false;
    }

    function loadCensusData() {
        $scope.censusLoading = true;
        censusService.loadCensusData($scope.bpTree.response.censusId).then(onSuccess).finally(handleResponse);
    }

    function checkIfTextExists(value) {
        return value !== null && value !== undefined && value.toLowerCase().includes($scope.searchText.toLowerCase());
    }

    // function validateCensus(type, data) { //TODO Error Handling
    //     //$scope.bpTree.response.validCensus = true;
    //     switch (type) {
    //         case "spouseCount":
    //             const spouseCount = data.filter((member) => member.%vlocity_namespace%__IsSpouse__c && !member.%vlocity_namespace%__IsPrimaryMember__c).length;
    //             if (spouseCount > 1) {
    //                 $scope.bpTree.response.validCensus = false;
    //             }
    //             break;
    //         default:
    //             break;
    //     }
    //     //     $scope.censusAgeErrorMsg = "";
    //     //     $scope.errorDOBList = [];
    //     //     //$scope.bpTree.response.NoEmpAge18 = 0;
    //     // validateCensus("spouseCount", censusGroup[key]);
    // }

    function setDependentsInfo(censusDetails) {
         const censusGroup = _.groupBy(censusDetails, (censusDetail) => {
            return censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c ||  censusDetail.Id; 
        });

        Object.keys(censusGroup).forEach(function(key) {
            depInfo[key] = {
                hasSpouse : false,
                childCount: 0
            };

            censusGroup[key].forEach((census) => {
                if (census.%vlocity_namespace%__IsSpouse__c) {
                    depInfo[key].hasSpouse = true;
                } else if (!census.%vlocity_namespace%__IsPrimaryMember__c && census.%vlocity_namespace%__IsSpouse__c !== undefined) {
                    depInfo[key].childCount += 1;
                }
            });
        });

        censusDetails.map((censusDetail) => {
            if (censusDetail.%vlocity_namespace%__IsPrimaryMember__c) {
                censusDetail.%vlocity_namespace%__HasSpouse__c = depInfo[censusDetail.Id].hasSpouse;
                censusDetail.%vlocity_namespace%__NumberOfDependents__c = depInfo[censusDetail.Id].childCount;
            }
            return censusDetail;
        });

        return censusDetails;
    }

    function calculateCensusCount() {
        $scope.censusInfo = {
            EmpCount: 0,
            EmpFaCount: 0,
            EmpChCount: 0,
            EmpSpCount: 0,
            total: 0
        };

        censusService.empType = {};

        censusService.censusDetails.map((censusDetail) => {
            const {
                %vlocity_namespace%__IsPrimaryMember__c,
                %vlocity_namespace%__HasSpouse__c,
                %vlocity_namespace%__NumberOfDependents__c,
                Id
            } = censusDetail;

            if (%vlocity_namespace%__IsPrimaryMember__c) {
                if (%vlocity_namespace%__HasSpouse__c && %vlocity_namespace%__NumberOfDependents__c) {
                    $scope.censusInfo.EmpFaCount += 1;
                    censusService.empType[Id] = 'Family';
                } else if (%vlocity_namespace%__HasSpouse__c && !%vlocity_namespace%__NumberOfDependents__c) {
                    $scope.censusInfo.EmpSpCount += 1;
                    censusService.empType[Id] = 'Employee + Spouse';
                } else if (!%vlocity_namespace%__HasSpouse__c && %vlocity_namespace%__NumberOfDependents__c) {
                    $scope.censusInfo.EmpChCount += 1;
                    censusService.empType[Id] = 'Employee + Child(ren)';
                } else {
                    $scope.censusInfo.EmpCount += 1;
                    censusService.empType[Id] = 'Employee';
                }
            }
        });

        $scope.censusInfo.total = $scope.censusInfo.EmpFaCount +
                                  $scope.censusInfo.EmpSpCount +
                                  $scope.censusInfo.EmpChCount +
                                  $scope.censusInfo.EmpCount;
    }

    function getIndexToAddDependent(censusDetails, employee) {
        let index;
        let selectedEmp = false;

        censusDetails.forEach((censusDetail, censusIndex) => {
            if (censusDetail.Id === employee.Id) {
                selectedEmp = true;
                index = censusIndex;
            }
            if (selectedEmp && censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c === employee.Id) {
                index = censusIndex;
            }
        });

        return index;
    }

    function getCensus(censusDetails, censusMember, isEmployee) {
        const removedCensusData = [];
        
        const updatedCensusData =  _.reject(censusDetails, function(censusDetail) {
            if (isEmployee && (censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c === censusMember.Id || censusDetail.Id === censusMember.Id)) {
                removedCensusData.push(censusDetail);
            } else if(!isEmployee && censusDetail.Id === censusMember.Id){
                removedCensusData.push(censusDetail);
            }
            return isEmployee ? (censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c === censusMember.Id || censusDetail.Id === censusMember.Id) : censusDetail.Id === censusMember.Id;
        });

        return {
            updatedCensusData,
            removedCensusData
        }
    }

    function filterEditedCensus(censusDetails) {
        return censusDetails.filter((censusDetail) => censusDetail.isEdited);
    }

    function resetIsEdited(censusDetails) {
        censusDetails.map((censusDetail) => {
            censusDetail.isEdited = false;
            return censusDetail;
        });

        return censusDetails;
    }

    function setRelatedCensusMemberId(response) {
        let censusDetails = [];

        const censusGroup = _.groupBy(response, (censusDetail) => {
            return censusDetail.%vlocity_namespace%__MemberIdentifier__c;
        });

        Object.keys(censusGroup).forEach(function(key) {
            let censusData = [];
           
            const id = censusGroup[key].filter((censusDetail) => censusDetail.%vlocity_namespace%__IsPrimaryMember__c)[0].Id;

            censusGroup[key].forEach((censusDetail) => {
                censusDetail.%vlocity_namespace%__Birthdate__c = new Date(censusDetail.%vlocity_namespace%__Birthdate__c);

                if (key && !censusDetail.%vlocity_namespace%__IsPrimaryMember__c) {
                    censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c = id;
                }

                censusData = censusData.concat(censusDetail);
            });

            censusDetails = censusDetails.concat(censusData);
        });

        return censusDetails;
    }

    $scope.onChange = function(censusMember, relationshipUpdated) {
        censusService.censusDetails.map((censusDetail) => {
            if (censusDetail.Id === censusMember.Id) {
                censusMember.isEdited = true;
                return censusMember;
            } else if (censusDetail.Id === censusMember.%vlocity_namespace%__RelatedCensusMemberId__c && relationshipUpdated) {
                censusDetail.isEdited = true;
                return censusDetail;
            }
            return censusDetail;
        });

        if (relationshipUpdated) {
            censusService.censusDetails = setDependentsInfo(censusService.censusDetails);
            calculateCensusCount();
        }
    }
            
    $scope.addNewMember = function(addDependent, employee) {
        const member =  {
            %vlocity_namespace%__FirstName__c: '',
            Name: '',
            %vlocity_namespace%__Birthdate__c: '',
            %vlocity_namespace%__Gender__c: '',
            %vlocity_namespace%__IsPrimaryMember__c: !addDependent,
            %vlocity_namespace%__RelatedCensusMemberId__c: addDependent ? employee.Id : undefined
        };
        $scope.censusLoading = true;

        censusService.updateCensusData($scope.bpTree.response.censusId, [member]).then((response) => {
            const censusDetail = member;
            censusDetail.Id = response.censusMemberIds[0];

            if (addDependent) {
                let index = getIndexToAddDependent(censusService.censusDetails, employee);
                
                censusService.censusDetails.splice(index + 1, 0, censusDetail);
                index = $scope.searchText.length ? getIndexToAddDependent($scope.filteredCensus, employee) : index;
                $scope.filteredCensus.splice(index + 1, 0, censusDetail);
                calculateCensusCount();
            } else {
                onSuccess([censusDetail].concat(censusService.censusDetails));
            }
        }).finally(handleResponse);
    };
        
    $scope.deleteCensus = function(censusMember, isEmployee) {
        const membersList = getCensus(censusService.censusDetails, censusMember, isEmployee);
        
        $scope.censusLoading = true;
        censusService.deleteCensusData($scope.bpTree.response.censusId, membersList.removedCensusData).then((response) => {
            if (isEmployee) {
                censusService.censusDetails = membersList.updatedCensusData;
                $scope.filteredCensus = $scope.searchText.length ? getCensus($scope.filteredCensus, censusMember, isEmployee).updatedCensusData : [...censusService.censusDetails];
                calculateCensusCount();
            } else {
                const censusDetails = setDependentsInfo(membersList.updatedCensusData);
                const censusToUpdate = censusDetails.filter((censusDetail) => censusDetail.Id === censusMember.%vlocity_namespace%__RelatedCensusMemberId__c);

                censusService.censusDetails = censusDetails;
                $scope.filteredCensus = $scope.searchText.length ? getCensus($scope.filteredCensus, censusMember, isEmployee).updatedCensusData : [...censusService.censusDetails];
                calculateCensusCount();

                censusService.updateCensusData($scope.bpTree.response.censusId, censusToUpdate).finally(handleResponse);
            }
        }).finally(handleResponse);
    };
    
    $scope.deleteAllCensus = function() {
        $scope.censusLoading = true;
        censusService.deleteCensusData($scope.bpTree.response.censusId, censusService.censusDetails).then(onSuccess([])).finally(handleResponse);
    };

    $scope.uploadCensus = function($event) {
        censusService.sheetToCensus(XLSX.utils.sheet_to_json($event.workbook.Sheets[$event.workbook.SheetNames[0]]))
        .then((members) => {
            $scope.censusLoading = true;

            censusService.updateCensusData($scope.bpTree.response.censusId, members).then((updateResponse) => {
                members.map((member, index) => {
                    member.Id = updateResponse.censusMemberIds[index];
                });

                const censusWithRelatedId = setRelatedCensusMemberId(members);
                const censusDetails = setDependentsInfo(censusWithRelatedId);

                censusService.updateCensusData($scope.bpTree.response.censusId, censusDetails)
                .then(() => {
                    onSuccess(censusService.censusDetails.concat(censusDetails));
                })
                .finally(handleResponse);
            }).catch(handleResponse);
        });
    };

    function saveOnNavigation() {
        const censusDetails = filterEditedCensus(censusService.censusDetails);

        $scope.censusLoading = true;
        return censusService.updateCensusData($scope.bpTree.response.censusId, censusDetails).then((response) => {
            if (Object.keys(response).length) {
                resetIsEdited(censusService.censusDetails);
            }
        });
    }

    $scope.saveCensus = function(i, fromIndex) {
        saveOnNavigation().then((response) => {
            this.nextRepeater(i, fromIndex);
        }).finally(handleResponse);
    };

    $scope.saveAndPrevious = function(scp, child) {
        saveOnNavigation().then((response) => {
            this.previous(scp, child);
        }).finally(handleResponse);
    }

    $scope.uploadError = function($event) {
		console.warn($event.error);
	}

    $scope.searchEmployee = function() {
        if (!$scope.searchText.length) {
            $scope.filteredCensus = [...censusService.censusDetails];
            return;
        }
       
        let searchIdList = [];
        $scope.filteredCensus = [];

        censusService.censusDetails.map(function(censusDetail) {
            if (checkIfTextExists(censusDetail.%vlocity_namespace%__FirstName__c) || checkIfTextExists(censusDetail.Name) ) {
                if (censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c && searchIdList.indexOf(censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c) === -1) {
                     searchIdList.push(censusDetail.%vlocity_namespace%__RelatedCensusMemberId__c);
                } else if (searchIdList.indexOf(censusDetail.Id) === -1) {
                     searchIdList.push(censusDetail.Id);
                }
            }
        });

        censusService.censusDetails.forEach((emp) => {
            if (searchIdList.includes(emp.Id) || searchIdList.includes(emp.%vlocity_namespace%__RelatedCensusMemberId__c)) {
                $scope.filteredCensus.push(emp);
           }
        });
    };

    window.onbeforeunload = function(event) {
        if (filterEditedCensus(censusService.censusDetails).length) {
            return '';
        } else {
            event.preventDefault()
        }
    };

    $scope.$on('$destroy', function() {
        delete window.onbeforeunload;
    });

    loadCensusData();
    assignClassName();
}]);