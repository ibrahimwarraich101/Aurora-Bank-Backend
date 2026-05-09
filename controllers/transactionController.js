const mongoose = require('mongoose');
const Transaction = require("../models/transactionModel");
const Account = require("../models/accountModel");
const AuditLog = require("../models/auditLogModel");

const TransactionController = {
  async getAllTransactions(req, res) {
    try {
      let transactions;
      if (req.user.role === "admin") {
        transactions = await Transaction.TransactionInternal.find().sort({ dateTime: -1 });
      } else {
        transactions = await Transaction.TransactionInternal.find({ created_by: req.user.id }).sort({ dateTime: -1 });
      }
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async transfer(req, res) {
    const { FromAccount, ToAccount, Amount } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const sender = await Account.AccountModelInternal.findOne({ accountNo: FromAccount }).session(session);
      if (!sender) throw new Error("Sender account not found");
      if (sender.balance < Amount) throw new Error("Insufficient balance");

      if (req.user.role === "employee" && sender.created_by?.toString() !== req.user.id) {
        throw new Error("You can only transfer from your own accounts");
      }

      const receiver = await Account.AccountModelInternal.findOne({ accountNo: ToAccount }).session(session);
      if (!receiver) throw new Error("Receiver account not found");

      sender.balance -= parseFloat(Amount);
      receiver.balance += parseFloat(Amount);

      await sender.save({ session });
      await receiver.save({ session });

      const transaction = new Transaction.TransactionInternal({
        fromAccount: FromAccount,
        toAccount: ToAccount,
        amount: Amount,
        type: 'Transfer',
        created_by: req.user.id
      });
      const txResult = await transaction.save({ session });

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Transaction",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Transfer of $${Amount} from account #${FromAccount} to #${ToAccount}`
      });

      await session.commitTransaction();
      session.endSession();
      res.json({ success: true, message: "Transfer successful" });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = TransactionController;