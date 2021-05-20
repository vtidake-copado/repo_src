@isTest
private class Flow_LevelTest {

 
  @isTest static void createOpportunity() {
    Opportunity opp = new Opportunity ();
    System.debug(opp.Description);
    opp.Name = 'Swift Deal';
    opp.StageName = 'Prospecting';
    opp.CloseDate = Date.today();
      Test.startTest();
           System.debug(opp.Description);

    insert opp;
     System.debug(opp.Description);

      Test.stopTest();
    System.debug(opp.Description);

      
    Opportunity opp2 = [SELECT Id, Description FROM Opportunity WHERE Id = :opp.Id];
      
    System.debug(opp2.Description);
    System.assertEquals(('NewDescription'), opp2.Description);
  }

  
}