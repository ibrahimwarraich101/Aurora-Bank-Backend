const mongoose = require('mongoose');
const { getModel } = require('../db');
const AuditLog = require("./auditLogModel");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cnic: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const getCustomer = () => getModel('Customer', customerSchema);

const Customer = {
  get: getCustomer,
  getAll: async () => {
    return await getCustomer().find();
  },

  create: async (data) => {
    const { Name, CNIC, Contact } = data;
    
    if (!Name || !CNIC || !Contact) {
      throw new Error("Name, CNIC, and Contact are required");
    }

    const CustomerModel = getCustomer();
    const customer = new CustomerModel({
      name: Name,
      cnic: CNIC,
      contact: Contact
    });

    const result = await customer.save();

    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Customer',
      RecordID: result._id,
      Details: `Created customer: ${Name}`
    });

    return result;
  },

  getById: async (id) => {
    return await getCustomer().findById(id);
  }
};

module.exports = Customer;
module.exports.customerSchema = customerSchema;