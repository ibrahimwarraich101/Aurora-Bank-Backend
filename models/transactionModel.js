const db = require("../db");
const AuditLog = require("./auditLogModel");

const TransactionModel = {
  async recordTransaction({ FromAccount = null, ToAccount = null, Amount, Type }) {
    const [result] = await db.query(
      "INSERT INTO Transaction (FromAccount, ToAccount, Amount, Type) VALUES (?, ?, ?, ?)",
      [FromAccount, ToAccount, Amount, Type]
    );

    // Log to audit
    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Transaction',
      RecordID: result.insertId,
      Details: `${Type}: ${Amount} from ${FromAccount || 'N/A'} to ${ToAccount || 'N/A'}`
    });

    return result.insertId;
  },

  async getAllTransactions() {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        af.CustomerID as FromCustomerID,
        at.CustomerID as ToCustomerID
      FROM Transaction t
      LEFT JOIN Account af ON t.FromAccount = af.AccountNo
      LEFT JOIN Account at ON t.ToAccount = at.AccountNo
      ORDER BY t.DateTime DESC
      LIMIT 100
    `);
    return rows;
  },

  async getTransactionsByAccount(AccountNo) {
    const [rows] = await db.query(`
      SELECT * FROM Transaction 
      WHERE FromAccount = ? OR ToAccount = ?
      ORDER BY DateTime DESC
      LIMIT 50
    `, [AccountNo, AccountNo]);
    return rows;
  }
};

module.exports = TransactionModel;