const db = require("../db");
const bcrypt = require("bcryptjs");
const { sendEmployeeWelcomeEmail } = require("../utils/emailService");

const EmployeeController = {
  // Get all employees with their customer count
  async getAllEmployees(req, res) {
    try {
      const [employees] = await db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
               COUNT(DISTINCT c.CustomerID) as customer_count
        FROM users u
        LEFT JOIN Customer c ON c.created_by = u.id
        WHERE u.role = 'employee'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      res.json({ success: true, data: employees });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Create employee (admin only)
  async createEmployee(req, res) {
    try {
      const { name, email, password, phone, username } = req.body;
      if (!name || !email || !password || !username) {
        return res.status(400).json({ error: "Name, email, password, and username are required" });
      }

      const [existing] = await db.query("SELECT id FROM users WHERE email = ? OR username = ?", [email, username]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email or username already in use" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        "INSERT INTO users (name, email, password, role, phone, username) VALUES (?, ?, ?, 'employee', ?, ?)",
        [name, email, hashedPassword, phone || null, username]
      );

      await db.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["INSERT", "users", req.user.email, req.user.id, "CREATE_EMPLOYEE", `Employee ${name} created`, result.insertId]
      );

      // Send welcome email
      try {
        await sendEmployeeWelcomeEmail({ name, email, username, password });
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        // We don't return error here because employee was created successfully
      }

      res.json({ success: true, message: "Employee created successfully", id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Update employee details (admin only)
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone } = req.body;

      if (email) {
        const [existing] = await db.query(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      await db.query(
        "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ? AND role = 'employee'",
        [name || null, email || null, phone || null, id]
      );

      await db.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["UPDATE", "users", req.user.email, req.user.id, "UPDATE_EMPLOYEE", `Employee ${id} updated`, id]
      );

      res.json({ success: true, message: "Employee updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Toggle active status (admin only)
  async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const [employees] = await db.query(
        "SELECT id, name, is_active FROM users WHERE id = ? AND role = 'employee'",
        [id]
      );
      if (employees.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const employee = employees[0];
      const newStatus = employee.is_active ? 0 : 1;

      await db.query("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, id]);

      await db.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["UPDATE", "users", req.user.email, req.user.id, newStatus ? "ACTIVATE_EMPLOYEE" : "DEACTIVATE_EMPLOYEE", `Employee ${employee.name} ${newStatus ? "activated" : "deactivated"}`, id]
      );

      res.json({ success: true, is_active: newStatus });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Delete employee
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      const [employees] = await db.query(
        "SELECT name FROM users WHERE id = ? AND role = 'employee'",
        [id]
      );
      if (employees.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      await db.query("DELETE FROM users WHERE id = ? AND role = 'employee'", [id]);

      await db.query(
        "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["DELETE", "users", req.user.email, req.user.id, "DELETE_EMPLOYEE", `Employee ${employees[0].name} deleted`, id]
      );

      res.json({ success: true, message: "Employee deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = EmployeeController;
