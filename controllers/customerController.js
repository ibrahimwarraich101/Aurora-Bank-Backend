const Customer = require("../models/customerModel");
const AuditLogModel = require("../models/auditLogModel");

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.getAll();
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const result = await Customer.create(req.body);
    
    // Log to audit
    await AuditLogModel.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Customer',
      User: 'system',
      Details: `Created customer: ${req.body.Name}, CNIC: ${req.body.CNIC}`
    });
    
    res.json({ 
      success: true, 
      message: "Customer created", 
      id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAllCustomers, createCustomer };