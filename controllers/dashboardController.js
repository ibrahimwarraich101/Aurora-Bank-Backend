const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Account = require("../models/accountModel");
const Transaction = require("../models/transactionModel");
const AuditLog = require("../models/auditLogModel");

const DashboardController = {
  async getStats(req, res) {
    try {
      if (req.user.role === "admin" || req.user.role === "guest") {
        const totalEmployees = await User.countDocuments({ role: 'employee' });
        const totalCustomers = await Customer.CustomerModel.countDocuments();
        const totalAccounts = await Account.AccountModelInternal.countDocuments();
        
        const balanceResult = await Account.AccountModelInternal.aggregate([
          { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);
        const totalBalance = balanceResult[0]?.total || 0;

        const volumeResult = await Transaction.TransactionInternal.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalVolume = volumeResult[0]?.total || 0;

        const recentActivity = await AuditLog.getAllLogs();

        return res.json({
          success: true,
          role: req.user.role,
          data: {
            totalEmployees,
            totalCustomers,
            totalAccounts,
            totalBalance,
            totalVolume,
            recentActivity,
          }
        });
      } else {
        const userId = req.user.id;

        const totalCustomers = await Customer.CustomerModel.countDocuments({ created_by: userId });
        const totalAccounts = await Account.AccountModelInternal.countDocuments({ created_by: userId });
        
        const balanceResult = await Account.AccountModelInternal.aggregate([
          { $match: { created_by: userId } },
          { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);
        const totalBalance = balanceResult[0]?.total || 0;

        // Note: Transactions might not have created_by field in the new schema, 
        // usually they are linked to accounts. But I'll keep the logic if it was there.
        const totalTransactions = await Transaction.TransactionInternal.countDocuments({ created_by: userId });
        const recentTransactions = await Transaction.TransactionInternal.find({ created_by: userId }).sort({ dateTime: -1 }).limit(5);

        return res.json({
          success: true,
          role: "employee",
          data: {
            totalCustomers,
            totalAccounts,
            totalBalance,
            totalTransactions,
            recentTransactions,
          }
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = DashboardController;