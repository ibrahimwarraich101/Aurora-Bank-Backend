const pool = require("../db");

const DashboardController = {
  async getStats(req, res) {
    try {
      if (req.user.role === "admin" || req.user.role === "guest") {
        // Admin & Guest - bank-wide stats
        const [[{ totalEmployees }]] = await pool.query(
          "SELECT COUNT(*) as totalEmployees FROM users WHERE role = 'employee'"
        );
        const [[{ totalCustomers }]] = await pool.query(
          "SELECT COUNT(*) as totalCustomers FROM Customer"
        );
        const [[{ totalAccounts }]] = await pool.query(
          "SELECT COUNT(*) as totalAccounts FROM Account"
        );
        const [[{ totalBalance }]] = await pool.query(
          "SELECT COALESCE(SUM(Balance), 0) as totalBalance FROM Account"
        );
        const [[{ totalVolume }]] = await pool.query(
          "SELECT COALESCE(SUM(Amount), 0) as totalVolume FROM Transaction"
        );
        const [recentActivity] = await pool.query(`
          SELECT al.*, u.name as performed_by_name 
          FROM AuditLog al 
          LEFT JOIN users u ON u.id = al.performed_by 
          ORDER BY al.DateTime DESC LIMIT 10
        `);

        return res.json({
          success: true,
          role: req.user.role,
          data: {
            totalEmployees,
            totalCustomers,
            totalAccounts,
            totalBalance: parseFloat(totalBalance),
            totalVolume: parseFloat(totalVolume),
            recentActivity,
          }
        });
      } else {
        // Employee - scoped stats
        const userId = req.user.id;

        const [[{ totalCustomers }]] = await pool.query(
          "SELECT COUNT(*) as totalCustomers FROM Customer WHERE created_by = ?",
          [userId]
        );
        const [[{ totalAccounts }]] = await pool.query(
          "SELECT COUNT(*) as totalAccounts FROM Account WHERE created_by = ?",
          [userId]
        );
        const [[{ totalBalance }]] = await pool.query(
          "SELECT COALESCE(SUM(Balance), 0) as totalBalance FROM Account WHERE created_by = ?",
          [userId]
        );
        const [[{ totalTransactions }]] = await pool.query(
          "SELECT COUNT(*) as totalTransactions FROM Transaction WHERE created_by = ?",
          [userId]
        );
        const [recentTransactions] = await pool.query(
          "SELECT * FROM Transaction WHERE created_by = ? ORDER BY DateTime DESC LIMIT 5",
          [userId]
        );

        return res.json({
          success: true,
          role: "employee",
          data: {
            totalCustomers,
            totalAccounts,
            totalBalance: parseFloat(totalBalance),
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