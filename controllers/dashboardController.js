const pool = require('../db');

const DashboardController = {
  // Get dashboard statistics
  async getStats(req, res) {
    try {
      // Get total customers
      const [customers] = await pool.query("SELECT COUNT(*) as total FROM Customer");
      
      // Get total accounts
      const [accounts] = await pool.query("SELECT COUNT(*) as total FROM Account");
      
      // Get total balance
      const [balance] = await pool.query("SELECT SUM(Balance) as total FROM Account");
      
      // Get recent transactions (last 10)
      const [transactions] = await pool.query(`
        SELECT 
          TransID,
          Type,
          Amount,
          FromAccount,
          ToAccount,
          DateTime
        FROM Transaction 
        ORDER BY DateTime DESC 
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          totalCustomers: customers[0].total,
          totalAccounts: accounts[0].total,
          totalBalance: balance[0].total || 0,
          recentTransactions: transactions
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = DashboardController;