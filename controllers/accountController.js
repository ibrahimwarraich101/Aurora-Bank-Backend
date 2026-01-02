const pool = require('../db');
const AccountModel = require('../models/accountModel');
const AuditLogController = require('./auditLogController');

const AccountController = {
  // Create account
  async createAccount(req, res) {
    try {
      const { CustomerID, Type, Balance } = req.body;
      const accountId = await AccountModel.createAccount({ CustomerID, Type, Balance });

      // Log the operation
      await AuditLogController.logOperation({
        operation: 'INSERT',
        table: 'Account',
        recordId: accountId,
        details: `New ${Type} account created with balance $${Balance}`,
        userAction: 'CREATE_ACCOUNT',
        status: 'SUCCESS'
      });

      res.json({ success: true, AccountNo: accountId });
    } catch (err) {
      // Log the failure
      await AuditLogController.logOperation({
        operation: 'INSERT',
        table: 'Account',
        recordId: null,
        details: `Failed to create account: ${err.message}`,
        userAction: 'CREATE_ACCOUNT',
        status: 'FAILED'
      });

      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all accounts
  async getAccounts(req, res) {
    try {
      const accounts = await AccountModel.getAccounts();
      res.json(accounts);
    } catch (err) {
      res.status(500).json({ error: err.message });
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

      const newBalance = parseFloat(account[0].Balance) + parseFloat(Amount);
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      // Record transaction
      await connection.query(
        "INSERT INTO Transaction (ToAccount, Amount, Type) VALUES (?, ?, 'Deposit')",
        [AccountNo, Amount]
      );

      // Log COMMIT operation
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status) 
         VALUES ('COMMIT', 'Account', ?, ?, 'DEPOSIT', 'SUCCESS')`,
        [AccountNo, `Deposit of $${Amount}. New balance: $${newBalance.toFixed(2)}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();

      // Log ROLLBACK operation
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status) 
         VALUES ('ROLLBACK', 'Account', ?, ?, 'DEPOSIT', 'FAILED')`,
        [AccountNo, `Deposit failed: ${err.message}`]
      );

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
      if (parseFloat(account[0].Balance) < Amount) throw new Error("Insufficient balance");

      const newBalance = parseFloat(account[0].Balance) - parseFloat(Amount);
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      await connection.query(
        "INSERT INTO Transaction (FromAccount, Amount, Type) VALUES (?, ?, 'Withdraw')",
        [AccountNo, Amount]
      );

      // Log COMMIT operation
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status) 
         VALUES ('COMMIT', 'Account', ?, ?, 'WITHDRAW', 'SUCCESS')`,
        [AccountNo, `Withdrawal of $${Amount}. New balance: $${newBalance.toFixed(2)}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();

      // Log ROLLBACK operation
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status) 
         VALUES ('ROLLBACK', 'Account', ?, ?, 'WITHDRAW', 'FAILED')`,
        [AccountNo, `Withdrawal failed: ${err.message}`]
      );

      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  },

  // Delete account
  async deleteAccount(req, res) {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete account
      const [result] = await connection.query("DELETE FROM Account WHERE AccountNo = ?", [id]);
      if (result.affectedRows === 0) throw new Error("Account not found");

      // Record deletion in AuditLog
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status)
         VALUES ('DELETE', 'Account', ?, ?, 'DELETE_ACCOUNT', 'SUCCESS')`,
        [id, `Account ${id} deleted successfully`]
      );

      await connection.commit();
      res.json({ success: true, message: `Account ${id} deleted` });
    } catch (err) {
      await connection.rollback();

      // Log failure
      await connection.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status)
         VALUES ('ROLLBACK', 'Account', ?, ?, 'DELETE_ACCOUNT', 'FAILED')`,
        [id, `Delete failed: ${err.message}`]
      );

      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  },
};

module.exports = AccountController;
