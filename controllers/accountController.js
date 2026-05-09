const mongoose = require('mongoose');
const Account = require('../models/accountModel');
const Customer = require('../models/customerModel');
const Transaction = require('../models/transactionModel');
const AuditLog = require('../models/auditLogModel');

const AccountController = {
  // Create account
  async createAccount(req, res) {
    try {
      const { CustomerID, Type, Balance } = req.body;

      if (req.user.role === "employee") {
        const customer = await Customer.CustomerModel.findOne({ _id: CustomerID, created_by: req.user.id });
        if (!customer) {
          return res.status(403).json({ error: "You can only create accounts for your own customers" });
        }
      }

      const accountId = await Account.createAccount({ CustomerID, Type, Balance });
      
      // Update created_by
      await Account.AccountModelInternal.findByIdAndUpdate(accountId, { created_by: req.user.id });

      await AuditLog.logOperation({
        Operation: "INSERT",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: accountId,
        Details: `New ${Type} account created with balance $${Balance}`
      });

      res.json({ success: true, AccountNo: accountId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Get all accounts
  async getAccounts(req, res) {
    try {
      let accounts;
      if (req.user.role === "admin") {
        accounts = await Account.AccountModelInternal.find()
          .populate('customerId', 'name cnic')
          .sort({ createdAt: -1 });
      } else {
        accounts = await Account.AccountModelInternal.find({ created_by: req.user.id })
          .populate('customerId', 'name cnic')
          .sort({ createdAt: -1 });
      }

      // Format for frontend
      const formatted = accounts.map(acc => ({
        AccountNo: acc.accountNo,
        Type: acc.type,
        Balance: acc.balance,
        Status: acc.status,
        CustomerName: acc.customerId?.name || 'N/A',
        CNIC: acc.customerId?.cnic || 'N/A',
        CreatedAt: acc.createdAt
      }));

      res.json(formatted);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get accounts for specific customer
  async getAccountsByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      let accounts;

      if (req.user.role === "admin") {
        accounts = await Account.AccountModelInternal.find({ customerId });
      } else {
        // Employee: validate customer belongs to them
        const customer = await Customer.CustomerModel.findOne({ _id: customerId, created_by: req.user.id });
        if (!customer) return res.status(403).json({ error: "Access denied" });
        accounts = await Account.AccountModelInternal.find({ customerId });
      }

      res.json(accounts.map(a => ({ AccountNo: a.accountNo, Type: a.type, Balance: a.balance })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Deposit
  async deposit(req, res) {
    const { AccountNo, Amount } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const account = await Account.AccountModelInternal.findOne({ accountNo: AccountNo }).session(session);
      if (!account) throw new Error("Account not found");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only deposit into your own accounts");
      }

      account.balance += parseFloat(Amount);
      await account.save({ session });

      const transaction = new Transaction.TransactionInternal({
        toAccount: AccountNo,
        amount: Amount,
        type: 'Deposit',
        created_by: req.user.id
      });
      const txResult = await transaction.save({ session });

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Deposit of $${Amount} to account #${AccountNo}. New balance: $${account.balance}`
      });

      await session.commitTransaction();
      session.endSession();
      res.json({ success: true, newBalance: account.balance });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Withdraw
  async withdraw(req, res) {
    const { AccountNo, Amount } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const account = await Account.AccountModelInternal.findOne({ accountNo: AccountNo }).session(session);
      if (!account) throw new Error("Account not found");
      if (account.balance < Amount) throw new Error("Insufficient balance");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only withdraw from your own accounts");
      }

      account.balance -= parseFloat(Amount);
      await account.save({ session });

      const transaction = new Transaction.TransactionInternal({
        fromAccount: AccountNo,
        amount: Amount,
        type: 'Withdraw',
        created_by: req.user.id
      });
      const txResult = await transaction.save({ session });

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Withdrawal of $${Amount} from account #${AccountNo}. New balance: $${account.balance}`
      });

      await session.commitTransaction();
      session.endSession();
      res.json({ success: true, newBalance: account.balance });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Delete account
  async deleteAccount(req, res) {
    const { id } = req.params;
    try {
      const account = await Account.AccountModelInternal.findOne({ accountNo: id });
      if (!account) throw new Error("Account not found");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only delete your own accounts");
      }

      await Account.AccountModelInternal.deleteOne({ accountNo: id });

      await AuditLog.logOperation({
        Operation: "DELETE",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: id,
        Details: `Account ${id} deleted`
      });

      res.json({ success: true, message: `Account ${id} deleted` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = AccountController;
