const pool = require("../db");

const TransactionController = {
  async getAllTransactions(req, res) {
    try {
      let query, params = [];
      if (req.user.role === "admin") {
        query = `
          SELECT t.*, u.name as created_by_name
          FROM Transaction t
          LEFT JOIN users u ON u.id = t.created_by
          ORDER BY t.DateTime DESC
        `;
      } else {
        query = `
          SELECT t.*, u.name as created_by_name
          FROM Transaction t
          LEFT JOIN users u ON u.id = t.created_by
          WHERE t.created_by = ?
          ORDER BY t.DateTime DESC
        `;
        params = [req.user.id];
      }
      const [transactions] = await pool.query(query, params);
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async transfer(req, res) {
    const { FromAccount, ToAccount, Amount } = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [sender] = await conn.query(
        "SELECT Balance, created_by FROM Account WHERE AccountNo = ?",
        [FromAccount]
      );
      if (sender.length === 0) throw new Error("Sender account not found");
      if (sender[0].Balance < Amount) throw new Error("Insufficient balance");

      if (req.user.role === "employee" && sender[0].created_by !== req.user.id) {
        throw new Error("You can only transfer from your own accounts");
      }

      const [receiver] = await conn.query(
        "SELECT Balance FROM Account WHERE AccountNo = ?",
        [ToAccount]
      );
      if (receiver.length === 0) throw new Error("Receiver account not found");

      await conn.query(
        "UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?",
        [Amount, FromAccount]
      );
      await conn.query(
        "UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?",
        [Amount, ToAccount]
      );

      const [txResult] = await conn.query(
        "INSERT INTO Transaction (FromAccount, ToAccount, Amount, Type, created_by) VALUES (?, ?, ?, 'Transfer', ?)",
        [FromAccount, ToAccount, Amount, req.user.id]
      );

      await conn.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["COMMIT", "Transaction", req.user.email, req.user.id, "TRANSFER", txResult.insertId, `Transfer of $${Amount} from account #${FromAccount} to #${ToAccount}`]
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
};

module.exports = TransactionController;