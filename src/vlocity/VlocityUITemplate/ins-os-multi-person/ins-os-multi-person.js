/* jshint esversion: 6 */
vlocity.cardframework.registerModule.controller('insMultiPersonCtrl', ['$scope', '$controller', function($scope, $controller) {
    'use strict';
    // insCoveragesCtrl is the JS Angular controller in ins-os-coverages-component which
    // is the component for coverages
    angular.extend(this, $controller('insCoveragesCtrl', {$scope: $scope}));
    $scope.multiPersonTemplate = true;
    $scope.customTemplates = baseCtrl.prototype.$scope.bpTree.propSetMap.elementTypeToHTMLTemplateMapping;
    $scope.coverageEditorOpen = false;

    function displaySequenceSort(x, y) {
        if (x.displaySequence === y.displaySequence) {
            return 0;
        } else if (x.displaySequence < y.displaySequence) {
            return -1;
        }
        return 1;
    }

    function createCoverageLabels() {
        let allCoverages = [];
        angular.forEach($scope.sortedCoverages, function(coveragesArray) {
            if (Array.isArray(coveragesArray)) {
                angular.forEach(coveragesArray, function(covB) {
                    let newCoverageName = true;
                    for (let j = 0; j < allCoverages.length; j++) {
                        const covA = allCoverages[j];
                        if (covA.Name === covB.Name) {
                            newCoverageName = false;
                            break;
                        }
                    }
                    if (newCoverageName) {
                        allCoverages.push(covB);
                    }
                });
            }
        });
        allCoverages.sort($scope.sortMultiPersonCoverages);
        const prefixTypeKey = $scope.nsPrefix + 'Type__c';
        for (let i = 1; i < allCoverages.length; i++) {
            const coverage = allCoverages[i];
            const previousCoverage = allCoverages[i - 1];
            const labelObj = {
                label: coverage.Name,
                description: coverage.Description,
                type: coverage.Type__c || coverage[prefixTypeKey],
                showTypeHeader: false,
                coverageRow: true
            };
            if (i === 1) {
                labelObj.firstCoverage = true;
            }
            // Determine if the label is a new heading so the coverage row will be pushed down
            const showTypeHeader = previousCoverage.RecordTypeName__c === 'Product'
            || previousCoverage[$scope.nsPrefix + 'RecordTypeName__c'] === 'Product'
            || previousCoverage.Type__c !== coverage.Type__c
            || (previousCoverage[prefixTypeKey] && coverage[prefixTypeKey] && previousCoverage[prefixTypeKey] !== coverage[prefixTypeKey]);
            if (showTypeHeader || i === 1) {
                labelObj.showTypeHeader = true;
            }
            $scope.labelColumn.push(labelObj);
        }
    }

    function fillInCoverages(coverages) {
        // Start at first coverage label and first non root product coverage
        for (let labelIdx = 1, coverageIdx = 1; labelIdx < $scope.labelColumn.length; labelIdx++, coverageIdx++) {
            const labelObj = $scope.labelColumn[labelIdx];
            const coverage = coverages[coverageIdx];
            if (!coverage || labelObj.label !== coverage.Name) {
                const emptyCoverage = {
                    RecordTypeName__c: 'CoverageSpec',
                    Name: labelObj.label
                };
                coverages.splice(coverageIdx, 0, emptyCoverage);
            }
            if (labelObj.showTypeHeader) {
                coverages[coverageIdx].showTypeHeader = true;
            }
        }
    }

    $scope.sortMultiPersonCoverages = function(x, y) {
        const prefixTypeKey = $scope.nsPrefix + 'Type__c';

        // Root product and insured items first
        if (x.RecordTypeName__c === 'Product' || x[$scope.nsPrefix + 'RecordTypeName__c'] === 'Product') {
            return -1;
        }
        if (y.RecordTypeName__c !== 'CoverageSpec' && y[$scope.nsPrefix + 'RecordTypeName__c'] !== 'CoverageSpec') {
            return 1;
        }

        // Move empty types to end
        if (!x.Type__c && !x[prefixTypeKey] && (y.Type__c || y[prefixTypeKey])) {
            return 1;
        }
        if ((x.Type__c || x[prefixTypeKey]) && !y.Type__c && !y[prefixTypeKey]) {
            return -1;
        }

        // Sort by type, display sequence, then name
        if (x.Type__c < y.Type__c || x[prefixTypeKey] < y[prefixTypeKey]) {
            return -1;
        } 
        if (x.Type__c > y.Type__c || x[prefixTypeKey] > y[prefixTypeKey]) {
            return 1;
        } 
        if (x.displaySequence < y.displaySequence) {
            return -1;
        } 
        if (x.displaySequence > y.displaySequence) {
            return 1;
        } 
        if (x.Name < y.Name) {
            return -1;
        } 
        if (x.Name > y.Name) {
            return 1;
        }

        return 0;
    };

    $scope.syncSortedCoverages = function() {
        angular.forEach($scope.sortedCoverages, function(coverages) {
            if (Array.isArray(coverages)) {
                fillInCoverages(coverages);
            }
        });
    };

    $scope.organizeMultiPersonData = function() {
        // List of labels for each row
        $scope.labelColumn = [];
        // Sort categories and attributes
        let attrCategories = [];
        if (_.get($scope.productsList[0], 'childProducts.records[0].attributeCategories')) {
            const childProducts = $scope.productsList[0].childProducts.records;
            let childIndex = 0;
            for (let i = 0; i < childProducts.length; i++) {
                if (childProducts[i].instanceKey) {
                    childIndex = i;
                    break;
                }
            }
            attrCategories = childProducts[childIndex].attributeCategories.records;
        }
        if (attrCategories.length) {
            attrCategories.sort(displaySequenceSort);
        }
        let attributes = [];
        if (attrCategories[0].productAttributes && attrCategories[0].productAttributes.records) {
            attributes = attrCategories[0].productAttributes.records;
        }
        if (attributes.length) {
            attributes.sort(displaySequenceSort);
        }
        // This label is for the top attribute in the top category on the Insured Party/Item
        $scope.labelColumn.push({
            label: attributes[0].label,
            bold: true,
            borderTop: true,
            borderBottom: true,
        });
        createCoverageLabels();
        $scope.syncSortedCoverages();

        console.log('organizeMultiPersonData', $scope.labelColumn);
    };

    $scope.decideLabelColumnClassNames = function(labelObj) {
        let classNames = '';
        if (labelObj.borderTop) {
            classNames = classNames + ' nds-border--top';
        }
        if (labelObj.borderBottom) {
            classNames = classNames + ' nds-border--bottom';
        }
        if (labelObj.bold) {
            classNames = classNames + ' vloc-ins-multi-person-label-bold';
        }
        if (labelObj.coverageRow) {
            classNames = classNames + ' vloc-ins-multi-person-label-coverage-row';
        }
        if (labelObj.firstCoverage) {
            classNames = classNames + ' vloc-ins-multi-person-label-first-coverage';
        }
        return classNames;
    };

    $scope.openCoverageEditor = function(coverage) {
        if ($scope.coverageEditorOpen) {
            return;
        }
        $scope.coverageEditorOpen = true;
        coverage.popoverOpen = true;
    };

    $scope.closeCoverageEditor = function(coverage) {
        $scope.coverageEditorOpen = false;
        coverage.popoverOpen = false;
    };
}]);