const db = require('../db');
const AuditLog = require('./auditLogModel');

const AccountModel = {
  async createAccount({ CustomerID, Type, Balance = 0 }) {
    // Validate input
    if (!CustomerID || !Type) {
      throw new Error("CustomerID and Type are required");
    }

    // Check if customer exists
    const [customer] = await db.query(
      "SELECT CustomerID FROM Customer WHERE CustomerID = ?",
      [CustomerID]
    );
    
    if (customer.length === 0) {
      throw new Error("Customer not found");
    }

    const [result] = await db.query(
      "INSERT INTO Account (CustomerID, Type, Balance) VALUES (?, ?, ?)",
      [CustomerID, Type, Balance]
    );

    // Log to audit
    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Account',
      RecordID: result.insertId,
      Details: `Created ${Type} account for Customer ${CustomerID}`
    });

    return result.insertId;
  },

  async getAccounts() {
    const [rows] = await db.query(`
      SELECT 
        a.AccountNo, 
        a.Type, 
        a.Balance, 
        a.Status,
        c.Name as CustomerName,
        c.CNIC
      FROM Account a
      JOIN Customer c ON a.CustomerID = c.CustomerID
      ORDER BY a.AccountNo DESC
    `);
    return rows;
  },

  async getAccountById(AccountNo) {
    const [rows] = await db.query(
      "SELECT * FROM Account WHERE AccountNo = ?",
      [AccountNo]
    );
    return rows[0];
  },
async deleteAccount(id) {
  await pool.query("DELETE FROM Account WHERE AccountNo = ?", [id]);
},
  async updateBalance(AccountNo, newBalance) {
    await db.query(
      "UPDATE Account SET Balance = ? WHERE AccountNo = ?",
      [newBalance, AccountNo]
    );
  }
};

module.exports = AccountModel;