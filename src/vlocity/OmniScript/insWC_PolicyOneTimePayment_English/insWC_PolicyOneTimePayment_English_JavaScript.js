window.transaction="None";
window.nonce="None";
window.mapTransaction=false;

window.addEventListener('message', function(e) {
    if (e.data.name === 'VlocityCreditCardTransaction'){
        window.transaction=e.data.transaction;
        window.nonce=e.data.nonce;
        var toSet2 = {};
        toSet2['Braintree'] = {};
        toSet2.Braintree['transaction'] = window.transaction.transaction;  
        toSet2['CreditCard'] = {};
        toSet2.CreditCard['noncetest'] = window.nonce;
        toSet2.CreditCard['paymentNonce'] = window.nonce;
          baseCtrl.prototype.$scope.applyCallResp(toSet2);      
          //not necessary 
          //baseCtrl.prototype.$scope.bpTree.response['noncetest']=window.nonce;
          baseCtrl.prototype.$scope.$apply();
    }
}, false);