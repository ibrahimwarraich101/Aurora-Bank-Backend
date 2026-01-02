const pool = require("../db");
const TransactionModel = require("../models/transactionModel");

const TransactionController = {
  // NEW: Get all transactions
  async getAllTransactions(req, res) {
    try {
      const [transactions] = await pool.query(
        "SELECT * FROM Transaction ORDER BY DateTime DESC"
      );
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Transfer money between two accounts
  async transfer(req, res) {
    const { FromAccount, ToAccount, Amount } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Check sender account
      const [sender] = await conn.query(
        "SELECT Balance FROM Account WHERE AccountNo = ?",
        [FromAccount]
      );
      if (sender.length === 0) throw new Error("Sender account not found");
      if (sender[0].Balance < Amount) throw new Error("Insufficient balance");

      // Check receiver account
      const [receiver] = await conn.query(
        "SELECT Balance FROM Account WHERE AccountNo = ?",
        [ToAccount]
      );
      if (receiver.length === 0) throw new Error("Receiver account not found");

      // Update balances
      await conn.query(
        "UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?",
        [Amount, FromAccount]
      );

      await conn.query(
        "UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?",
        [Amount, ToAccount]
      );

      // Log transaction
      await conn.query(
        "INSERT INTO Transaction (FromAccount, ToAccount, Amount, Type) VALUES (?, ?, ?, 'Transfer')",
        [FromAccount, ToAccount, Amount]
      );

      await conn.commit();
      res.json({ success: true, message: "Transfer successful" });

    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, error: err.message });
    } finally {
      conn.release();
    }
  },

  // Demo of Savepoint
  async savepointDemo(req, res) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Insert a dummy record
      await conn.query(
        "INSERT INTO Transaction (Amount, Type) VALUES (100, 'Test')"
      );

      await conn.query("SAVEPOINT A");

      // Insert another dummy record
      await conn.query(
        "INSERT INTO Transaction (Amount, Type) VALUES (200, 'Test2')"
      );

      // Rollback the second insert only
      await conn.query("ROLLBACK TO SAVEPOINT A");

      await conn.commit();

      res.json({ success: true, message: "Savepoint demo complete" });

    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, error: err.message });
    } finally {
      conn.release();
    }
  }
};

module.exports = TransactionController;