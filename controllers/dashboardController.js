const pool = require("../db");

const DashboardController = {
  async getStats(req, res) {
    try {
      // Get total customers
      const [customers] = await pool.query(
        "SELECT COUNT(*) as count FROM Customer"
      );
      const totalCustomers = customers[0].count;

      // Get total accounts
      const [accounts] = await pool.query(
        "SELECT COUNT(*) as count FROM Account"
      );
      const totalAccounts = accounts[0].count;

      // Get total balance
      const [balance] = await pool.query(
        "SELECT SUM(Balance) as total FROM Account"
      );
      const totalBalance = balance[0].total || 0;

      // Get recent transactions (last 5)
      const [transactions] = await pool.query(
        "SELECT * FROM Transaction ORDER BY DateTime DESC LIMIT 5"
      );

      res.json({
        success: true,
        data: {
          totalCustomers,
          totalAccounts,
          totalBalance: parseFloat(totalBalance),
          recentTransactions: transactions
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = DashboardController;