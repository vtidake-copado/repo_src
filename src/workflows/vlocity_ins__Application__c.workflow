<?xml version="1.0" encoding="UTF-8"?>
<Workflow xmlns="http://soap.sforce.com/2006/04/metadata">
    <fieldUpdates>
        <fullName>Reference_Number</fullName>
        <field>vlocity_ins__ApplicationReferenceNumber__c</field>
        <formula>Reference_Number__c</formula>
        <name>Reference Number</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Formula</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <rules>
        <fullName>Auto Reference Number</fullName>
        <actions>
            <name>Reference_Number</name>
            <type>FieldUpdate</type>
        </actions>
        <active>true</active>
        <criteriaItems>
            <field>vlocity_ins__Application__c.vlocity_ins__ApplicationReferenceNumber__c</field>
            <operation>equals</operation>
        </criteriaItems>
        <triggerType>onCreateOnly</triggerType>
    </rules>
</Workflow>
