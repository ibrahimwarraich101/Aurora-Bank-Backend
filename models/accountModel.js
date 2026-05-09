const mongoose = require('mongoose');
const AuditLog = require('./auditLogModel');
const { getModel } = require('../db');
const { customerSchema } = require('./customerModel');

const accountSchema = new mongoose.Schema({
  accountNo: { type: String, unique: true, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['Savings', 'Current', 'Business'], required: true },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

const getAccount = () => getModel('Account', accountSchema);
const getCustomer = () => getModel('Customer', customerSchema);

const AccountModel = {
  get: getAccount,
  async createAccount({ CustomerID, Type, Balance = 0 }) {
    if (!CustomerID || !Type) {
      throw new Error("CustomerID and Type are required");
    }

    const Customer = getCustomer();
    const customerExists = await Customer.findById(CustomerID);
    if (!customerExists) {
      throw new Error("Customer not found");
    }

    // Simple account number generation
    const accountNo = 'AUR' + Date.now().toString().slice(-8);

    const Account = getAccount();
    const account = new Account({
      accountNo,
      customerId: CustomerID,
      type: Type,
      balance: Balance
    });

    const result = await account.save();

    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Account',
      RecordID: result._id,
      Details: `Created ${Type} account for Customer ${CustomerID}`
    });

    return result._id;
  },

  async getAccounts() {
    const Account = getAccount();
    // Ensure Customer model is registered on the same connection
    getCustomer();
    
    // Populate customer details to mimic the JOIN
    const accounts = await Account.find()
      .populate('customerId', 'name cnic')
      .sort({ createdAt: -1 });

    return accounts.map(acc => ({
      AccountNo: acc.accountNo,
      Type: acc.type,
      Balance: acc.balance,
      Status: acc.status,
      CustomerName: acc.customerId ? acc.customerId.name : 'N/A',
      CNIC: acc.customerId ? acc.customerId.cnic : 'N/A'
    }));
  },

  async getAccountById(AccountNo) {
    return await getAccount().findOne({ accountNo: AccountNo });
  },

  async deleteAccount(id) {
    await getAccount().deleteOne({ accountNo: id });
  },

  async updateBalance(AccountNo, newBalance) {
    await getAccount().updateOne(
      { accountNo: AccountNo },
      { $set: { balance: newBalance } }
    );
  }
};

module.exports = AccountModel;
module.exports.accountSchema = accountSchema;