const mongoose = require('mongoose');
const AuditLog = require('./auditLogModel');
const { CustomerModel } = require('./customerModel');

const accountSchema = new mongoose.Schema({
  accountNo: { type: String, unique: true, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['Savings', 'Current', 'Business'], required: true },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

const AccountModelInternal = mongoose.model('Account', accountSchema);

const AccountModel = {
  async createAccount({ CustomerID, Type, Balance = 0 }) {
    if (!CustomerID || !Type) {
      throw new Error("CustomerID and Type are required");
    }

    const customerExists = await CustomerModel.findById(CustomerID);
    if (!customerExists) {
      throw new Error("Customer not found");
    }

    // Simple account number generation
    const accountNo = 'AUR' + Date.now().toString().slice(-8);

    const account = new AccountModelInternal({
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
    // Populate customer details to mimic the JOIN
    const accounts = await AccountModelInternal.find()
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
    return await AccountModelInternal.findOne({ accountNo: AccountNo });
  },

  async deleteAccount(id) {
    await AccountModelInternal.deleteOne({ accountNo: id });
  },

  async updateBalance(AccountNo, newBalance) {
    await AccountModelInternal.updateOne(
      { accountNo: AccountNo },
      { $set: { balance: newBalance } }
    );
  }
};

module.exports = AccountModel;
module.exports.AccountModelInternal = AccountModelInternal;
module.exports.accountSchema = accountSchema;