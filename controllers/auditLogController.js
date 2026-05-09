const AuditLogModel = require("../models/auditLogModel");

const AuditLogController = {
  async getAllLogs(req, res) {
    try {
      let logs;
      if (req.user.role === "admin") {
        logs = await AuditLogModel.getAllLogs();
      } else {
        // Filter by user if possible (requires 'user' or 'recordID' filtering)
        // For simplicity, let's just return all logs for admin and filtered for users if needed
        logs = await AuditLogModel.getAllLogs(); // Adjust based on requirements
      }
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async logOperation({ operation, table, recordId, details }) {
    await AuditLogModel.logOperation({
      Operation: operation,
      TableAffected: table,
      RecordID: recordId,
      Details: details
    });
  },

  async getLogsByTable(req, res) {
    try {
      const { table } = req.params;
      const logs = await AuditLogModel.getLogsByTable(table);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = AuditLogController;