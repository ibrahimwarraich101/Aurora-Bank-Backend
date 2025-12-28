const pool = require('../db');
const AccountModel = require('../models/accountModel');
const AuditLogModel = require('../models/auditLogModel');

const AccountController = {
  // Create account
  async createAccount(req, res) {
    try {
      const { CustomerID, Type, Balance } = req.body;
      const accountId = await AccountModel.createAccount({ CustomerID, Type, Balance });
      
      // Log to audit
      await AuditLogModel.logOperation({
        Operation: 'INSERT',
        TableAffected: 'Account',
        User: 'system',
        Details: `Created ${Type} account (${accountId}) for CustomerID: ${CustomerID} with balance: ${Balance}`
      });
    
      res.json({ success: true, AccountNo: accountId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all accounts
  async getAccounts(req, res) {
    try {
      const accounts = await AccountModel.getAccounts();
      res.json({ success: true, data: accounts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Deposit
  async deposit(req, res) {
    const { AccountNo, Amount } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [account] = await connection.query("SELECT * FROM Account WHERE AccountNo = ?", [AccountNo]);
      if (account.length === 0) throw new Error("Account not found");

      const oldBalance = parseFloat(account[0].Balance);
      const newBalance = oldBalance + parseFloat(Amount);
      
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      // Record transaction
      await connection.query(
        "INSERT INTO Transaction (ToAccount, Amount, Type) VALUES (?, ?, 'Deposit')",
        [AccountNo, Amount]
      );

      // Log to audit
      await connection.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, Details) VALUES (?, ?, ?, ?)",
        ['COMMIT', 'Account', 'system', `Deposit: Account ${AccountNo}, Amount: ${Amount}, New Balance: ${newBalance}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();
      
      // Log rollback
      await AuditLogModel.logOperation({
        Operation: 'ROLLBACK',
        TableAffected: 'Account',
        User: 'system',
        Details: `Deposit failed: Account ${AccountNo}, Amount: ${Amount}, Error: ${err.message}`
      });
      
      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  },

  // Withdraw
  async withdraw(req, res) {
    const { AccountNo, Amount } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [account] = await connection.query("SELECT * FROM Account WHERE AccountNo = ?", [AccountNo]);
      if (account.length === 0) throw new Error("Account not found");
      
      const oldBalance = parseFloat(account[0].Balance);
      if (oldBalance < Amount) throw new Error("Insufficient balance");

      const newBalance = oldBalance - parseFloat(Amount);
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      await connection.query(
        "INSERT INTO Transaction (FromAccount, Amount, Type) VALUES (?, ?, 'Withdraw')",
        [AccountNo, Amount]
      );

      // Log to audit
      await connection.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, Details) VALUES (?, ?, ?, ?)",
        ['COMMIT', 'Account', 'system', `Withdraw: Account ${AccountNo}, Amount: ${Amount}, New Balance: ${newBalance}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();
      
      // Log rollback
      await AuditLogModel.logOperation({
        Operation: 'ROLLBACK',
        TableAffected: 'Account',
        User: 'system',
        Details: `Withdraw failed: Account ${AccountNo}, Amount: ${Amount}, Error: ${err.message}`
      });
      
      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  }
};

module.exports = AccountController;