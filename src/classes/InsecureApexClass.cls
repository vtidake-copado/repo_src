public class InsecureApexClass {
    
    // Hardcoded credentials (Security Issue)
    private static final String API_KEY = '1234567890abcdef';

    // SOQL inside a loop (Performance Issue)
    public static void processAccounts() {
        List<Account> accList = [SELECT Id, Name FROM Account]; // Query outside loop is better
        for (Account acc : accList) {
            List<Contact> contacts = [SELECT Id, Email FROM Contact WHERE AccountId = :acc.Id]; // ❌ SOQL in loop
            for (Contact c : contacts) {
                c.Email = 'updated@example.com';
                update c; // ❌ DML inside loop (Performance Issue)
            }
        }
    }

    // Method with unused variable (Code Smell)
    public static void unusedMethod() {
        Integer x = 10; // ❌ Unused variable
    }

    // ❌ New Violation: Public Method Without Access Control (Security Risk)
    public static void deleteAllAccounts() {
        delete [SELECT Id FROM Account]; // ❌ Deletes ALL Accounts without checks
    }
}
