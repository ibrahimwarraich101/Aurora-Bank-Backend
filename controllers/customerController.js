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
    let query, params = [];
    if (req.user.role === "admin") {
      // Admin sees all with employee name
      query = `
        SELECT c.*, u.name as created_by_name 
        FROM Customer c 
        LEFT JOIN users u ON u.id = c.created_by 
        ORDER BY c.CreatedAt DESC
      `;
    } else {
      // Employee sees only their own
      query = `
        SELECT c.*, u.name as created_by_name 
        FROM Customer c 
        LEFT JOIN users u ON u.id = c.created_by 
        WHERE c.created_by = ?
        ORDER BY c.CreatedAt DESC
      `;
      params = [req.user.id];
    }
    const [customers] = await pool.query(query, params);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const customerData = {
      ...req.body,
      created_by: req.user.id
    };

    const [result] = await connection.query("INSERT INTO Customer SET ?", customerData);

    await connection.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["INSERT", "Customer", req.user.email, req.user.id, "CREATE_CUSTOMER", result.insertId, `Customer ${req.body.Name} created`]
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

    const [accounts] = await connection.query(
      "SELECT COUNT(*) as count FROM Account WHERE CustomerID = ?",
      [id]
    );
    if (accounts[0].count > 0) {
      throw new Error("Cannot delete customer with existing accounts. Delete accounts first.");
    }

    const [customer] = await connection.query(
      "SELECT Name, created_by FROM Customer WHERE CustomerID = ?",
      [id]
    );
    if (customer.length === 0) throw new Error("Customer not found");

    // Employee can only delete their own customers
    if (req.user.role === "employee" && customer[0].created_by !== req.user.id) {
      throw new Error("You can only delete customers you created");
    }

    await connection.query("DELETE FROM Customer WHERE CustomerID = ?", [id]);

    await connection.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, record_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["DELETE", "Customer", req.user.email, req.user.id, "DELETE_CUSTOMER", id, `Customer ${customer[0].Name} deleted`]
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