const db = require("../db");
const AuditLog = require("./auditLogModel");

const Customer = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM Customer");
    return rows;
  },

  create: async (data) => {
    const { Name, CNIC, Contact } = data;
    
    // Validate input
    if (!Name || !CNIC || !Contact) {
      throw new Error("Name, CNIC, and Contact are required");
    }

    const [result] = await db.query(
      "INSERT INTO Customer (Name, CNIC, Contact) VALUES (?, ?, ?)",
      [Name, CNIC, Contact]
    );

    // Log to audit
    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Customer',
      RecordID: result.insertId,
      Details: `Created customer: ${Name}`
    });

    return result;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM Customer WHERE CustomerID = ?",
      [id]
    );
    return rows[0];
  }
};

module.exports = Customer;