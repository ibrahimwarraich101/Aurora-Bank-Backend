const mongoose = require('mongoose');
const AuditLog = require('./auditLogModel');
const { getModel } = require('../db');

const transactionSchema = new mongoose.Schema({
  fromAccount: { type: String, default: null },
  toAccount: { type: String, default: null },
  amount: { type: Number, required: true },
  type: { type: String, required: true },
  dateTime: { type: Date, default: Date.now }
});

const getTransaction = () => getModel('Transaction', transactionSchema);

const TransactionModel = {
  get: getTransaction,
  async recordTransaction({ FromAccount = null, ToAccount = null, Amount, Type }) {
    const Transaction = getTransaction();
    const transaction = new Transaction({
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
    return await getTransaction().find().sort({ dateTime: -1 }).limit(100);
  },

  async getTransactionsByAccount(AccountNo) {
    return await getTransaction().find({
      $or: [{ fromAccount: AccountNo }, { toAccount: AccountNo }]
    }).sort({ dateTime: -1 }).limit(50);
  }
};

module.exports = TransactionModel;
module.exports.transactionSchema = transactionSchema;