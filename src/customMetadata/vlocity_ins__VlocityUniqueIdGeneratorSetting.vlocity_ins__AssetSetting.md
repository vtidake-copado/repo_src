<?xml version="1.0" encoding="UTF-8"?>
<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <label>AssetSetting</label>
    <protected>false</protected>
    <values>
        <field>vlocity_ins__Format__c</field>
        <value xsi:type="xsd:string">%Product2.ProductCode%+&quot;-&quot;+GLOBALAUTONUMBER()+&quot;-&quot;+YEAR(%ExpirationDate__c%)+&quot;-&quot;+%Price%</value>
    </values>
    <values>
        <field>vlocity_ins__IsActive__c</field>
        <value xsi:type="xsd:boolean">true</value>
    </values>
    <values>
        <field>vlocity_ins__ObjectType__c</field>
        <value xsi:type="xsd:string">Asset</value>
    </values>
</CustomMetadata>
