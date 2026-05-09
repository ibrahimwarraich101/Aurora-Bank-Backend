const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Account = require("../models/accountModel");
const Transaction = require("../models/transactionModel");
const AuditLog = require("../models/auditLogModel");
const SystemSettings = require("../models/systemSettingsModel");

const AdminController = {
  // Reports: monthly data for charts + employee performance
  async getReports(req, res) {
    try {
      // Monthly transactions (last 12 months)
      const monthlyTransactions = await Transaction.TransactionInternal.aggregate([
        {
          $match: {
            dateTime: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$dateTime" } },
            count: { $sum: 1 },
            volume: { $sum: "$amount" }
          }
        },
        { $project: { month: "$_id", count: 1, volume: 1, _id: 0 } },
        { $sort: { month: 1 } }
      ]);

      // Monthly new customers (last 12 months)
      const monthlyCustomers = await Customer.CustomerModel.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $project: { month: "$_id", count: 1, _id: 0 } },
        { $sort: { month: 1 } }
      ]);

      // Employee performance table
      const employeePerformance = await User.aggregate([
        { $match: { role: 'employee' } },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: 'created_by',
            as: 'customers'
          }
        },
        {
          $lookup: {
            from: 'accounts',
            localField: '_id',
            foreignField: 'created_by',
            as: 'accounts'
          }
        },
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'created_by',
            as: 'transactions'
          }
        },
        {
          $project: {
            id: "$_id",
            name: 1,
            email: 1,
            customers_created: { $size: "$customers" },
            accounts_created: { $size: "$accounts" },
            transactions_done: { $size: "$transactions" },
            total_volume: { $sum: "$transactions.amount" }
          }
        },
        { $sort: { customers_created: -1 } }
      ]);

      res.json({
        success: true,
        data: { monthlyTransactions, monthlyCustomers, employeePerformance }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get system settings
  async getSystemSettings(req, res) {
    try {
      const settings = await SystemSettings.find();
      const settingsObj = {};
      settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
      res.json({ success: true, data: settingsObj });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Update system settings
  async updateSystemSettings(req, res) {
    try {
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await SystemSettings.findOneAndUpdate(
          { setting_key: key },
          { setting_value: value },
          { upsert: true }
        );
      }
      await AuditLog.logOperation({
        Operation: "UPDATE",
        TableAffected: "system_settings",
        User: req.user.email,
        RecordID: null,
        Details: "System settings updated"
      });
      res.json({ success: true, message: "Settings updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = AdminController;
