const pool = require("../db");

const AdminController = {
  // Reports: monthly data for charts + employee performance
  async getReports(req, res) {
    try {
      // Monthly transactions (last 12 months)
      const [monthlyTransactions] = await pool.query(`
        SELECT 
          DATE_FORMAT(DateTime, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(Amount) as volume
        FROM Transaction
        WHERE DateTime >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(DateTime, '%Y-%m')
        ORDER BY month ASC
      `);

      // Monthly new customers (last 12 months)
      const [monthlyCustomers] = await pool.query(`
        SELECT 
          DATE_FORMAT(CreatedAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM Customer
        WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m')
        ORDER BY month ASC
      `);

      // Employee performance table
      const [employeePerformance] = await pool.query(`
        SELECT 
          u.id, u.name, u.email,
          COUNT(DISTINCT c.CustomerID) as customers_created,
          COUNT(DISTINCT a.AccountNo) as accounts_created,
          COUNT(DISTINCT t.TransID) as transactions_done,
          COALESCE(SUM(t.Amount), 0) as total_volume
        FROM users u
        LEFT JOIN Customer c ON c.created_by = u.id
        LEFT JOIN Account a ON a.created_by = u.id
        LEFT JOIN Transaction t ON t.created_by = u.id
        WHERE u.role = 'employee'
        GROUP BY u.id, u.name, u.email
        ORDER BY customers_created DESC
      `);

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
      const [settings] = await pool.query("SELECT * FROM system_settings");
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
      const settings = req.body; // { key: value, ... }
      for (const [key, value] of Object.entries(settings)) {
        await pool.query(
          "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
          [key, value, value]
        );
      }
      await pool.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details) VALUES (?, ?, ?, ?, ?, ?)",
        ["UPDATE", "system_settings", req.user.email, req.user.id, "UPDATE_SYSTEM_SETTINGS", "System settings updated"]
      );
      res.json({ success: true, message: "Settings updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = AdminController;
