const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const AuditLog = require("../models/auditLogModel");
const bcrypt = require("bcryptjs");
const { sendEmployeeWelcomeEmail } = require("../utils/emailService");

const EmployeeController = {
  // Get all employees with their customer count
  async getAllEmployees(req, res) {
    try {
      const UserModel = User.get();
      const employees = await UserModel.aggregate([
        { $match: { role: 'employee' } },
        {
          $lookup: {
            from: 'customers', // MongoDB collection name is usually plural
            localField: '_id',
            foreignField: 'created_by',
            as: 'customers'
          }
        },
        {
          $project: {
            id: "$_id",
            name: 1,
            email: 1,
            phone: 1,
            role: 1,
            is_active: 1,
            created_at: "$createdAt",
            customer_count: { $size: "$customers" }
          }
        },
        { $sort: { created_at: -1 } }
      ]);
      res.json({ success: true, data: employees });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Create employee (admin only)
  async createEmployee(req, res) {
    try {
      const { name, email, password, phone, username } = req.body;
      const UserModel = User.get();
      
      if (!name || !email || !password || !username) {
        return res.status(400).json({ error: "Name, email, password, and username are required" });
      }

      const existing = await UserModel.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        return res.status(400).json({ error: "Email or username already in use" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new UserModel({
        name,
        email,
        password: hashedPassword,
        role: 'employee',
        phone: phone || null,
        username
      });

      const result = await user.save();

      await AuditLog.logOperation({
        Operation: "INSERT",
        TableAffected: "users",
        User: req.user.email,
        RecordID: result._id,
        Details: `Employee ${name} created`
      });

      try {
        const origin = req.headers.origin; // e.g., http://localhost:5173 or https://aurora-bankfrontend.vercel.app
        await sendEmployeeWelcomeEmail({ name, email, username, password }, origin);
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
      }

      res.json({ success: true, message: "Employee created successfully", id: result._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Update employee details (admin only)
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone } = req.body;
      const UserModel = User.get();

      if (email) {
        const existing = await UserModel.findOne({ email, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      await UserModel.findByIdAndUpdate(id, { $set: { name, email, phone } });

      await AuditLog.logOperation({
        Operation: "UPDATE",
        TableAffected: "users",
        User: req.user.email,
        RecordID: id,
        Details: `Employee ${id} updated`
      });

      res.json({ success: true, message: "Employee updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Toggle active status (admin only)
  async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const UserModel = User.get();
      const employee = await UserModel.findById(id);
      if (!employee || employee.role !== 'employee') {
        return res.status(404).json({ error: "Employee not found" });
      }

      employee.is_active = !employee.is_active;
      await employee.save();

      await AuditLog.logOperation({
        Operation: "UPDATE",
        TableAffected: "users",
        User: req.user.email,
        RecordID: id,
        Details: `Employee ${employee.name} ${employee.is_active ? "activated" : "deactivated"}`
      });

      res.json({ success: true, is_active: employee.is_active });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Delete employee
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      const UserModel = User.get();
      const employee = await UserModel.findById(id);
      if (!employee || employee.role !== 'employee') {
        return res.status(404).json({ error: "Employee not found" });
      }

      await UserModel.findByIdAndDelete(id);

      await AuditLog.logOperation({
        Operation: "DELETE",
        TableAffected: "users",
        User: req.user.email,
        RecordID: id,
        Details: `Employee ${employee.name} deleted`
      });

      res.json({ success: true, message: "Employee deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = EmployeeController;
