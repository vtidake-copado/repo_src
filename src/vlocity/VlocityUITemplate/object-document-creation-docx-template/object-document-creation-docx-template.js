baseCtrl.prototype.setDocXIPScope = function(scp) {
    'use strict';
    var afterSlash = '/' + window.location.href.split('.com/')[1].split('/')[0];
    window.VlocOmniSI = scp;
    if (afterSlash === 'apex') {
        afterSlash = '';
    }
    scp.applyCallResp({
        urlPrefix: window.location.origin + afterSlash
    });

    window.bpTreeResponseSent = false;
    window.addEventListener('message', function(event) {
        if (event.data && event.data.constructor === Object && event.data.hasOwnProperty('docGenContentVersionId')) {
            window.VlocOmniSI.applyCallResp(event.data);
        }
        if (event.data && event.data.constructor === Object && event.data.hasOwnProperty('GET_BPTREE_RESPONSE')) {
            if (!window.bpTreeResponseSent) {
                var fContentWindow = document.getElementById('obj-doc-creation-docx-os-iframe').contentWindow;
                fContentWindow.postMessage({'clmDocxBpTreeResponse': baseCtrl.prototype.$scope.bpTree.response}, '*');
                window.bpTreeResponseSent = true;
            }
        }
    }, false);
};