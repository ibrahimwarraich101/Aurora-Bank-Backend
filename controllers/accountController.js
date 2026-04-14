const pool = require('../db');
const AccountModel = require('../models/accountModel');
const AuditLogController = require('./auditLogController');

const AccountController = {
  // Create account
  async createAccount(req, res) {
    try {
      const { CustomerID, Type, Balance } = req.body;

      // Employee can only create accounts for their own customers
      if (req.user.role === "employee") {
        const [customers] = await pool.query(
          "SELECT CustomerID FROM Customer WHERE CustomerID = ? AND created_by = ?",
          [CustomerID, req.user.id]
        );
        if (customers.length === 0) {
          return res.status(403).json({ error: "You can only create accounts for your own customers" });
        }
      }

      const accountId = await AccountModel.createAccount({ CustomerID, Type, Balance });

      // Update created_by on the new account
      await pool.query("UPDATE Account SET created_by = ? WHERE AccountNo = ?", [req.user.id, accountId]);

      await pool.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["INSERT", "Account", req.user.email, req.user.id, "CREATE_ACCOUNT", accountId, `New ${Type} account created with balance $${Balance}`]
      );

      res.json({ success: true, AccountNo: accountId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all accounts (scoped by role)
  async getAccounts(req, res) {
    try {
      let query, params = [];
      if (req.user.role === "admin") {
        query = `
          SELECT a.*, c.Name as CustomerName, u.name as created_by_name
          FROM Account a
          LEFT JOIN Customer c ON c.CustomerID = a.CustomerID
          LEFT JOIN users u ON u.id = a.created_by
          ORDER BY a.CreatedAt DESC
        `;
      } else {
        query = `
          SELECT a.*, c.Name as CustomerName, u.name as created_by_name
          FROM Account a
          LEFT JOIN Customer c ON c.CustomerID = a.CustomerID
          LEFT JOIN users u ON u.id = a.created_by
          WHERE a.created_by = ?
          ORDER BY a.CreatedAt DESC
        `;
        params = [req.user.id];
      }
      const [accounts] = await pool.query(query, params);
      res.json(accounts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get accounts for a specific customer (for transaction forms)
  async getAccountsByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      let query, params;

      if (req.user.role === "admin") {
        query = "SELECT AccountNo, Type, Balance FROM Account WHERE CustomerID = ?";
        params = [customerId];
      } else {
        // Employee: validate customer belongs to them
        query = "SELECT a.AccountNo, a.Type, a.Balance FROM Account a JOIN Customer c ON c.CustomerID = a.CustomerID WHERE a.CustomerID = ? AND c.created_by = ?";
        params = [customerId, req.user.id];
      }

      const [accounts] = await pool.query(query, params);
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

      // Employee scoping
      if (req.user.role === "employee" && account[0].created_by !== req.user.id) {
        throw new Error("You can only deposit into your own accounts");
      }

      const newBalance = parseFloat(account[0].Balance) + parseFloat(Amount);
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      const [txResult] = await connection.query(
        "INSERT INTO Transaction (ToAccount, Amount, Type, created_by) VALUES (?, ?, 'Deposit', ?)",
        [AccountNo, Amount, req.user.id]
      );

      await connection.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["COMMIT", "Account", req.user.email, req.user.id, "DEPOSIT", txResult.insertId, `Deposit of $${Amount} to account #${AccountNo}. New balance: $${newBalance.toFixed(2)}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();
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

      if (req.user.role === "employee" && account[0].created_by !== req.user.id) {
        throw new Error("You can only withdraw from your own accounts");
      }

      const newBalance = parseFloat(account[0].Balance) - parseFloat(Amount);
      await connection.query("UPDATE Account SET Balance = ? WHERE AccountNo = ?", [newBalance, AccountNo]);

      const [txResult] = await connection.query(
        "INSERT INTO Transaction (FromAccount, Amount, Type, created_by) VALUES (?, ?, 'Withdraw', ?)",
        [AccountNo, Amount, req.user.id]
      );

      await connection.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["COMMIT", "Account", req.user.email, req.user.id, "WITHDRAW", txResult.insertId, `Withdrawal of $${Amount} from account #${AccountNo}. New balance: $${newBalance.toFixed(2)}`]
      );

      await connection.commit();
      res.json({ success: true, newBalance });
    } catch (err) {
      await connection.rollback();
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

      const [accounts] = await connection.query("SELECT * FROM Account WHERE AccountNo = ?", [id]);
      if (accounts.length === 0) throw new Error("Account not found");

      if (req.user.role === "employee" && accounts[0].created_by !== req.user.id) {
        throw new Error("You can only delete your own accounts");
      }

      const [result] = await connection.query("DELETE FROM Account WHERE AccountNo = ?", [id]);
      if (result.affectedRows === 0) throw new Error("Account not found");

      await connection.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["DELETE", "Account", req.user.email, req.user.id, "DELETE_ACCOUNT", id, `Account ${id} deleted`]
      );

      await connection.commit();
      res.json({ success: true, message: `Account ${id} deleted` });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ success: false, error: err.message });
    } finally {
      connection.release();
    }
  },
};

module.exports = AccountController;
