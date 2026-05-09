const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Update CORS to allow your Vercel URL
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// Import routes
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { asyncLocalStorage } = require("./db");
const cron = require("node-cron");
const { cleanupGuestSessions } = require("./utils/guestUtils");

// Extract Guest Session ID globally
app.use((req, res, next) => {
  let guestDbName = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
      if (payload.guestDbName) {
        guestDbName = payload.guestDbName;
      }
    } catch(e) {}
  }
  
  asyncLocalStorage.run({ guestDbName }, () => {
    next();
  });
});

// Run cleanup job every 30 minutes
cron.schedule("*/30 * * * *", () => {
  console.log("🧹 Running scheduled guest session cleanup...");
  cleanupGuestSessions();
});

// Assign routes
app.use("/customers", customerRoutes);
app.use("/accounts", accountRoutes);
app.use("/transactions", transactionRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/audit-logs", auditLogRoutes);
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/admin", adminRoutes);

// Test server
app.get("/", (req, res) => res.send("Aurora Bank CBS Backend running!"));

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));