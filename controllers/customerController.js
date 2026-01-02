const pool = require("../db");

const Customer = {
  getAll: async () => {
    const [rows] = await pool.query("SELECT * FROM Customer");
    return rows;
  },

  create: async (data) => {
    const [result] = await pool.query("INSERT INTO Customer SET ?", data);
    return result;
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.getAll();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const result = await Customer.create(req.body);
    
    // Log to AuditLog
    await connection.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, DateTime) VALUES (?, ?, ?, NOW())",
      ["INSERT", "Customer", req.body.Name || "Unknown"]
    );
    
    await connection.commit();
    res.json({ message: "Customer created", id: result.insertId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if customer has accounts
    const [accounts] = await connection.query(
      "SELECT COUNT(*) as count FROM Account WHERE CustomerID = ?",
      [id]
    );
    
    if (accounts[0].count > 0) {
      throw new Error("Cannot delete customer with existing accounts. Delete accounts first.");
    }
    
    // Get customer name for audit log
    const [customer] = await connection.query(
      "SELECT Name FROM Customer WHERE CustomerID = ?",
      [id]
    );
    
    if (customer.length === 0) {
      throw new Error("Customer not found");
    }
    
    // Delete customer
    await connection.query("DELETE FROM Customer WHERE CustomerID = ?", [id]);
    
    // Log to AuditLog
    await connection.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, DateTime) VALUES (?, ?, ?, NOW())",
      ["DELETE", "Customer", customer[0].Name]
    );
    
    await connection.commit();
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
};

module.exports = { getAllCustomers, createCustomer, deleteCustomer };