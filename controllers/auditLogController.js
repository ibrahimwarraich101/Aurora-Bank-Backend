const AuditLog = require("../models/auditLogModel");

const AuditLogController = {
  async getAllLogs(req, res) {
    try {
      const logs = await AuditLog.getAllLogs();
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getLogsByTable(req, res) {
    try {
      const { tableName } = req.params;
      const logs = await AuditLog.getLogsByTable(tableName);
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = AuditLogController;