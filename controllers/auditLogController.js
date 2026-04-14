const pool = require("../db");

const AuditLogController = {
  async getAllLogs(req, res) {
    try {
      let query, params = [];
      if (req.user.role === "admin") {
        query = `
          SELECT al.*, u.name as performed_by_name 
          FROM AuditLog al 
          LEFT JOIN users u ON u.id = al.performed_by 
          ORDER BY al.DateTime DESC
        `;
      } else {
        query = `
          SELECT al.*, u.name as performed_by_name 
          FROM AuditLog al 
          LEFT JOIN users u ON u.id = al.performed_by 
          WHERE al.performed_by = ?
          ORDER BY al.DateTime DESC
        `;
        params = [req.user.id];
      }
      const [logs] = await pool.query(query, params);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async logOperation({ operation, table, recordId, details, userAction, status = 'SUCCESS' }) {
    try {
      await pool.query(
        `INSERT INTO AuditLog (Operation, TableAffected, record_id, details, action, User) VALUES (?, ?, ?, ?, ?, ?)`,
        [operation, table, recordId, details, userAction, "system"]
      );
    } catch (err) {
      console.error("Error logging audit:", err.message);
    }
  },

  async getLogsByTable(req, res) {
    try {
      const { table } = req.params;
      const [logs] = await pool.query(
        "SELECT * FROM AuditLog WHERE TableAffected = ? ORDER BY DateTime DESC",
        [table]
      );
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getLogsByOperation(req, res) {
    try {
      const { operation } = req.params;
      const [logs] = await pool.query(
        "SELECT * FROM AuditLog WHERE Operation = ? ORDER BY DateTime DESC",
        [operation]
      );
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = AuditLogController;