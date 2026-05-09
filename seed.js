const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/userModel');
const Customer = require('./models/customerModel');
const Account = require('./models/accountModel');
const Transaction = require('./models/transactionModel');
const AuditLog = require('./models/auditLogModel');
const SystemSettings = require('./models/systemSettingsModel');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aurora_bank");
    console.log("Connected to MongoDB...");

    // Clear existing data
    await User.deleteMany({});
    await Customer.CustomerModel.deleteMany({});
    await Account.AccountModelInternal.deleteMany({});
    await Transaction.TransactionInternal.deleteMany({});
    await AuditLog.getAllLogs(); // This is a helper, but let's delete the collection
    await mongoose.connection.db.collection('auditlogs').deleteMany({});
    await SystemSettings.deleteMany({});

    console.log("Data cleared.");

    // Seed Admin
    const adminHash = await bcrypt.hash("Admin@123", 10);
    const admin = await User.create({
      name: "Admin User",
      username: "admin",
      email: "admin@aurorabank.com",
      password: adminHash,
      role: 'admin'
    });
    console.log("Admin seeded: admin / Admin@123");

    // Seed Employee
    const employeeHash = await bcrypt.hash("Employee@123", 10);
    const employee = await User.create({
      name: "John Doe",
      username: "john",
      email: "john@aurorabank.com",
      password: employeeHash,
      role: 'employee'
    });
    console.log("Employee seeded: john / Employee@123");

    // Seed System Settings
    await SystemSettings.create([
      { setting_key: 'bank_name', setting_value: 'Aurora Bank' },
      { setting_key: 'interest_rate', setting_value: 2.5 }
    ]);
    console.log("System settings seeded.");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seed();
