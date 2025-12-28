const db = require("../db");

const AuditLogModel = {
  async logOperation({ Operation, TableAffected, RecordID = null, User = 'system', Details = null }) {
    try {
      await db.query(
        "INSERT INTO AuditLog (Operation, TableAffected, RecordID, User, Details) VALUES (?, ?, ?, ?, ?)",
        [Operation, TableAffected, RecordID, User, Details]
      );
    } catch (err) {
      console.error("Audit log failed:", err.message);
      // Don't throw error - audit failure shouldn't stop operation
    }
  },

  async getAllLogs() {
    const [rows] = await db.query(
      "SELECT * FROM AuditLog ORDER BY DateTime DESC LIMIT 100"
    );
    return rows;
  },

  async getLogsByTable(tableName) {
    const [rows] = await db.query(
      "SELECT * FROM AuditLog WHERE TableAffected = ? ORDER BY DateTime DESC LIMIT 50",
      [tableName]
    );
    return rows;
  }
};

module.exports = AuditLogModel;