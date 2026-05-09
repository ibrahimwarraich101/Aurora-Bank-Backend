const mongoose = require('mongoose');
const AuditLog = require('./auditLogModel');

const transactionSchema = new mongoose.Schema({
  fromAccount: { type: String, default: null },
  toAccount: { type: String, default: null },
  amount: { type: Number, required: true },
  type: { type: String, required: true },
  dateTime: { type: Date, default: Date.now }
});

const TransactionInternal = mongoose.model('Transaction', transactionSchema);

const TransactionModel = {
  async recordTransaction({ FromAccount = null, ToAccount = null, Amount, Type }) {
    const transaction = new TransactionInternal({
      fromAccount: FromAccount,
      toAccount: ToAccount,
      amount: Amount,
      type: Type
    });

    const result = await transaction.save();

    await AuditLog.logOperation({
      Operation: 'INSERT',
      TableAffected: 'Transaction',
      RecordID: result._id,
      Details: `${Type}: ${Amount} from ${FromAccount || 'N/A'} to ${ToAccount || 'N/A'}`
    });

    return result._id;
  },

  async getAllTransactions() {
    return await TransactionInternal.find().sort({ dateTime: -1 }).limit(100);
  },

  async getTransactionsByAccount(AccountNo) {
    return await TransactionInternal.find({
      $or: [{ fromAccount: AccountNo }, { toAccount: AccountNo }]
    }).sort({ dateTime: -1 }).limit(50);
  }
};

module.exports = TransactionModel;
module.exports.TransactionInternal = TransactionInternal;
module.exports.transactionSchema = transactionSchema;