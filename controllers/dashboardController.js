const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Account = require("../models/accountModel");
const Transaction = require("../models/transactionModel");
const AuditLog = require("../models/auditLogModel");

const DashboardController = {
  async getStats(req, res) {
    try {
      if (req.user.role === "admin" || req.user.role === "guest") {
        const totalEmployees = await User.get().countDocuments({ role: 'employee' });
        const totalCustomers = await Customer.getAll().then(res => res.length);
        
        const AccountModel = Account.accountSchema ? require('../db').getModel('Account', Account.accountSchema) : null;
        const totalAccounts = await AccountModel.countDocuments();
        
        const balanceResult = await AccountModel.aggregate([
          { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);
        const totalBalance = balanceResult[0]?.total || 0;

        const TransactionModel = Transaction.transactionSchema ? require('../db').getModel('Transaction', Transaction.transactionSchema) : null;
        const volumeResult = await TransactionModel.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalVolume = volumeResult[0]?.total || 0;

        const logs = await AuditLog.getAllLogs();
        const recentActivity = logs.map(log => ({
          LogID: log._id,
          action: log.operation,
          details: log.details,
          performed_by_name: log.user,
          DateTime: log.dateTime // Mapping lowercase to uppercase for frontend
        }));

        return res.json({
          success: true,
          role: req.user.role,
          data: {
            totalEmployees,
            totalCustomers: await Customer.get().countDocuments(),
            totalAccounts,
            totalBalance,
            totalVolume,
            recentActivity,
          }
        });
      } else {
        const userId = req.user.id;
        const CustomerModel = Customer.get();
        const AccountModel = Account.get();
        const TransactionModel = Transaction.get();

        const totalCustomers = await CustomerModel.countDocuments({ created_by: userId });
        const totalAccounts = await AccountModel.countDocuments({ created_by: userId });
        
        const balanceResult = await AccountModel.aggregate([
          { $match: { created_by: userId } },
          { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);
        const totalBalance = balanceResult[0]?.total || 0;

        const totalTransactions = await TransactionModel.countDocuments({ created_by: userId });
        const recentTransactions = await TransactionModel.find({ created_by: userId }).sort({ dateTime: -1 }).limit(5);

        return res.json({
          success: true,
          role: "employee",
          data: {
            totalCustomers,
            totalAccounts,
            totalBalance,
            totalTransactions,
            recentTransactions: recentTransactions.map(t => ({ ...t.toObject(), DateTime: t.dateTime })),
          }
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = DashboardController;