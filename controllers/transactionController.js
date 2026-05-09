const mongoose = require('mongoose');
const Transaction = require("../models/transactionModel");
const Account = require("../models/accountModel");
const AuditLog = require("../models/auditLogModel");

const TransactionController = {
  async getAllTransactions(req, res) {
    try {
      let transactions;
      const TransactionModel = Transaction.get();
      if (req.user.role === "admin" || req.user.role === "guest") {
        transactions = await TransactionModel.find().sort({ dateTime: -1 });
      } else {
        transactions = await TransactionModel.find({ created_by: req.user.id }).sort({ dateTime: -1 });
      }
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async transfer(req, res) {
    const { FromAccount, ToAccount, Amount } = req.body;
    const AccountModel = Account.get();
    const TransactionModel = Transaction.get();

    try {
      const sender = await AccountModel.findOne({ accountNo: FromAccount });
      if (!sender) throw new Error("Sender account not found");
      if (sender.balance < Amount) throw new Error("Insufficient balance");

      if (req.user.role === "employee" && sender.created_by?.toString() !== req.user.id) {
        throw new Error("You can only transfer from your own accounts");
      }

      const receiver = await AccountModel.findOne({ accountNo: ToAccount });
      if (!receiver) throw new Error("Receiver account not found");

      sender.balance -= parseFloat(Amount);
      receiver.balance += parseFloat(Amount);

      await sender.save();
      await receiver.save();

      const transaction = new TransactionModel({
        fromAccount: FromAccount,
        toAccount: ToAccount,
        amount: Amount,
        type: 'Transfer',
        created_by: req.user.id
      });
      const txResult = await transaction.save();

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Transaction",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Transfer of Rs. ${Amount} from account #${FromAccount} to #${ToAccount}`
      });

      res.json({ success: true, message: "Transfer successful" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = TransactionController;