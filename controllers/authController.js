const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body; // 'email' field accepts username OR email

    if (!email || !password) {
      return res.status(400).json({ error: "Username/email and password are required" });
    }

    // Accept either username or email
    const [rows] = await db.query(
      "SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1",
      [email, email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev_secret_key",
      { expiresIn: "8h" }
    );

    // Log login
    await db.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details) VALUES (?, ?, ?, ?, ?, ?)",
      ["LOGIN", "users", user.email, user.id, "USER_LOGIN", `${user.role} '${user.name}' logged in`]
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, userId]);

    await db.query(
      "INSERT INTO AuditLog (Operation, TableAffected, User, performed_by, action, details) VALUES (?, ?, ?, ?, ?, ?)",
      ["UPDATE", "users", user.email, userId, "CHANGE_PASSWORD", "Password changed"]
    );

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Check email uniqueness (excluding current user)
    if (email) {
      const [existing] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    await db.query(
      "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
      [name || null, email || null, userId]
    );

    const [updated] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId]
    );

    res.json({ success: true, user: updated[0] });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: "Email not found" });
    }
    res.json({ success: true, message: "A password reset link has been sent to your email" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { login, changePassword, updateProfile, forgotPassword };
