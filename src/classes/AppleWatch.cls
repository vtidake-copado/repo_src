Public with sharing Class AppleWatch{






 Public Static void appleWatchmethod(list<Opportunity> lopt ){
    for (Opportunity opp : lopt) {
        Task t        = new Task();
        t.Subject     = 'Apple Watch Promo' ;
        t.Description = 'Send them one ASAP' ;
        t.Priority    = 'High' ;
        t.WhatId      = opp.Id;
        insert t;

     /*Commit conflict1 Mod in Source and feature branch*/
     /*Commit conflict2MOD*/
     
   }
  
  }
 
 }