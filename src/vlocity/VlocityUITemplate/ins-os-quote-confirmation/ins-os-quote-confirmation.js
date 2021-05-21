var insConfirmationMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

baseCtrl.prototype.insConfirmationformatDate = function(date) {
    var dateObj = new Date(date);
    return insConfirmationMonths[dateObj.getUTCMonth()] + ' ' + dateObj.getUTCDate() + ', ' + dateObj.getUTCFullYear();
};