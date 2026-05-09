const mongoose = require('mongoose');
const { getModel } = require('../db');

const auditLogSchema = new mongoose.Schema({
  operation: { type: String, required: true },
  tableAffected: { type: String, required: true },
  recordID: { type: mongoose.Schema.Types.Mixed, default: null },
  user: { type: String, default: 'system' },
  details: { type: String, default: null },
  dateTime: { type: Date, default: Date.now }
});

const getAuditLog = () => getModel('AuditLog', auditLogSchema);

const AuditLogModel = {
  async logOperation({ Operation, TableAffected, RecordID = null, User = 'system', Details = null }) {
    try {
      const AuditLog = getAuditLog();
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
    return await getAuditLog().find().sort({ dateTime: -1 }).limit(100);
  },

  async getLogsByTable(tableName) {
    return await getAuditLog().find({ tableAffected: tableName }).sort({ dateTime: -1 }).limit(50);
  },

  async getLogsByOperation(operation) {
    return await getAuditLog().find({ operation }).sort({ dateTime: -1 }).limit(50);
  }
};

module.exports = AuditLogModel;
module.exports.auditLogSchema = auditLogSchema;