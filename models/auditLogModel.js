const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  operation: { type: String, required: true },
  tableAffected: { type: String, required: true },
  recordID: { type: mongoose.Schema.Types.Mixed, default: null },
  user: { type: String, default: 'system' },
  details: { type: String, default: null },
  dateTime: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const AuditLogModel = {
  async logOperation({ Operation, TableAffected, RecordID = null, User = 'system', Details = null }) {
    try {
      const log = new AuditLog({
        operation: Operation,
        tableAffected: TableAffected,
        recordID: RecordID,
        user: User,
        details: Details
      });
      await log.save();
    } catch (err) {
      console.error("Audit log failed:", err.message);
    }
  },

  async getAllLogs() {
    return await AuditLog.find().sort({ dateTime: -1 }).limit(100);
  },

  async getLogsByTable(tableName) {
    return await AuditLog.find({ tableAffected: tableName }).sort({ dateTime: -1 }).limit(50);
  }
};

module.exports = AuditLogModel;