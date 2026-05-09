const Customer = require("../models/customerModel");
const User = require("../models/userModel");
const Account = require("../models/accountModel");
const AuditLog = require("../models/auditLogModel");

const getAllCustomers = async (req, res) => {
  try {
    let customers;
    if (req.user.role === "admin") {
      customers = await Customer.CustomerModel.find().sort({ createdAt: -1 });
    } else {
      customers = await Customer.CustomerModel.find({ created_by: req.user.id }).sort({ createdAt: -1 });
    }
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const customerData = {
      Name: req.body.name,
      CNIC: req.body.cnic,
      Contact: req.body.contact,
      created_by: req.user.id
    };

    const result = await Customer.create(customerData);

    await AuditLog.logOperation({
      Operation: "INSERT",
      TableAffected: "Customer",
      User: req.user.email,
      RecordID: result._id,
      Details: `Customer ${req.body.name} created`
    });

    res.json({ message: "Customer created", id: result._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    const accountCount = await Account.AccountModelInternal.countDocuments({ customerId: id });
    if (accountCount > 0) {
      throw new Error("Cannot delete customer with existing accounts. Delete accounts first.");
    }

    const customer = await Customer.CustomerModel.findById(id);
    if (!customer) throw new Error("Customer not found");

    if (req.user.role === "employee" && customer.created_by?.toString() !== req.user.id) {
      throw new Error("You can only delete customers you created");
    }

    await Customer.CustomerModel.findByIdAndDelete(id);

    await AuditLog.logOperation({
      Operation: "DELETE",
      TableAffected: "Customer",
      User: req.user.email,
      RecordID: id,
      Details: `Customer ${customer.name} deleted`
    });

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllCustomers, createCustomer, deleteCustomer };