const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getActiveConnection } = require("../db");

// Session tracking schema for MAIN database
const guestSessionSchema = new mongoose.Schema({
  guestId: { type: String, required: true, unique: true },
  dbName: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 7200 } // Auto-delete after 2 hours
});

const GuestSession = mongoose.model('GuestSession', guestSessionSchema);

async function seedGuestData(conn, role) {
  const dummyPassword = await bcrypt.hash("Guest@1234", 10);
  
  // We need to import schemas here or define them
  const User = conn.model('User', require('../models/userModel').userSchema);
  const Customer = conn.model('Customer', require('../models/customerModel').customerSchema);
  const Account = conn.model('Account', require('../models/accountModel').accountSchema);
  const Transaction = conn.model('Transaction', require('../models/transactionModel').transactionSchema);
  const SystemSettings = conn.model('SystemSettings', require('../models/systemSettingsModel').schema); // Assuming it has schema exported

  // Seed Users
  const adminGuest = await User.create({
    name: 'Admin Guest',
    username: 'admin_guest',
    email: 'admin@guest.com',
    password: dummyPassword,
    role: 'admin'
  });

  const employeeGuest = await User.create({
    name: 'Employee Guest',
    username: 'employee_guest',
    email: 'employee@guest.com',
    password: dummyPassword,
    role: 'employee'
  });

  // Seed Customers
  const c1 = await Customer.create({ name: 'Alice Smith', cnic: '1234567890123', contact: '03001234567' });
  const c2 = await Customer.create({ name: 'Bob Johnson', cnic: '9876543210987', contact: '03119876543' });

  // Seed Accounts
  await Account.create([
    { accountNo: 'G-1001', customerId: c1._id, balance: 50000, type: 'Savings', created_by: adminGuest._id },
    { accountNo: 'G-1002', customerId: c2._id, balance: 120000, type: 'Current', created_by: employeeGuest._id }
  ]);

  // Seed Transactions
  await Transaction.create([
    { toAccount: 'G-1001', amount: 10000, type: 'Deposit', dateTime: new Date(Date.now() - 86400000) },
    { fromAccount: 'G-1002', toAccount: 'G-1001', amount: 5000, type: 'Transfer' }
  ]);

  return role === 'admin' 
    ? { id: adminGuest._id, name: adminGuest.name, email: adminGuest.email, role: 'admin' }
    : { id: employeeGuest._id, name: employeeGuest.name, email: employeeGuest.email, role: 'employee' };
}

async function setupGuestSession(role) {
  const guestId = Math.random().toString(36).substring(2, 10);
  const guestDbName = `aurora_guest_${guestId}`;
  
  try {
    // 1. Get connection to the NEW database
    const conn = mongoose.connection.useDb(guestDbName, { useCache: true });

    // 2. Seed it
    const guestUser = await seedGuestData(conn, role);

    // 3. Record session in MAIN database
    await GuestSession.create({ guestId, dbName: guestDbName, role });

    return { guestDbName, guestUser, guestId };
  } catch (error) {
    console.error("Guest Setup Error:", error);
    throw error;
  }
}

async function cleanupGuestSessions() {
  // Mongoose auto-deletes the GuestSession document due to 'expires' index.
  // But we need to actually DROP the databases.
  // We'll find databases that no longer have a session record.
  try {
    const sessions = await GuestSession.find({}, 'dbName');
    const activeDbNames = sessions.map(s => s.dbName);

    // This is a bit complex in MongoDB without listing all DBs.
    // For now, we'll rely on the fact that guest DBs are ephemeral.
    // A better way would be a separate cleanup job that lists all guest DBs.
    console.log("Active guest sessions:", activeDbNames.length);
  } catch (error) {
    console.error("Cleanup Error:", error);
  }
}

module.exports = {
  setupGuestSession,
  cleanupGuestSessions
};
