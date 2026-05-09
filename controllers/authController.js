const User = require("../models/userModel");
const AuditLog = require("../models/auditLogModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { setupGuestSession } = require("../utils/guestUtils");

const guestLogin = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: "Role must be admin or employee" });
    }

    const { guestDbName, guestUser, guestId } = await setupGuestSession(role);

    const token = jwt.sign(
      { id: guestUser.id, name: guestUser.name, email: guestUser.email, role: guestUser.role, guestDbName, isGuest: true, guestId },
      process.env.JWT_SECRET || "dev_secret_key",
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      token,
      user: { ...guestUser, isGuest: true }
    });
  } catch (err) {
    console.error("Guest Login error:", err);
    res.status(500).json({ error: "Failed to initialize guest session" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Username/email and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: email }, { username: email }],
      is_active: true
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev_secret_key",
      { expiresIn: "8h" }
    );

    await AuditLog.logOperation({
      Operation: 'LOGIN',
      TableAffected: 'users',
      User: user.email,
      RecordID: user._id,
      Details: `${user.role} '${user.name}' logged in`
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await AuditLog.logOperation({
      Operation: 'UPDATE',
      TableAffected: 'users',
      User: user.email,
      RecordID: user._id,
      Details: "Password changed"
    });

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

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, email } },
      { new: true }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email not found" });
    }
    res.json({ success: true, message: "A password reset link has been sent to your email" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { login, changePassword, updateProfile, forgotPassword, guestLogin };
