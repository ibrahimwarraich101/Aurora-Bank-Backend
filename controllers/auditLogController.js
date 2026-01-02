const pool = require("../db");

const AuditLogController = {
  // Get all audit logs
  async getAllLogs(req, res) {
    try {
      const [logs] = await pool.query(
        "SELECT * FROM AuditLog ORDER BY DateTime DESC"
      );
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Log an operation (helper function used by other controllers)
  async logOperation({ operation, table, recordId, details, userAction, status = 'SUCCESS' }) {
    try {
      await pool.query(
        `INSERT INTO AuditLog (Operation, TableAffected, RecordID, Details, UserAction, Status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [operation, table, recordId, details, userAction, status]
      );
    } catch (err) {
      console.error("Error logging audit:", err.message);
    }
  },

  // Get logs by table
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

  // Get logs by operation type
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

  // Get statistics
  async getStats(req, res) {
    try {
      const [totalLogs] = await pool.query(
        "SELECT COUNT(*) as count FROM AuditLog"
      );
      
      const [successLogs] = await pool.query(
        "SELECT COUNT(*) as count FROM AuditLog WHERE Status = 'SUCCESS'"
      );
      
      const [failedLogs] = await pool.query(
        "SELECT COUNT(*) as count FROM AuditLog WHERE Status = 'FAILED'"
      );
      
      const [operationCounts] = await pool.query(
        "SELECT Operation, COUNT(*) as count FROM AuditLog GROUP BY Operation"
      );

      res.json({
        success: true,
        data: {
          total: totalLogs[0].count,
          successful: successLogs[0].count,
          failed: failedLogs[0].count,
          byOperation: operationCounts
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = AuditLogController;