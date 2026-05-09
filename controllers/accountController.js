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
      const CustomerModel = Customer.get();
      const AccountModel = Account.get();

      if (req.user.role === "employee") {
        const customer = await CustomerModel.findOne({ _id: CustomerID, created_by: req.user.id });
        if (!customer) {
          return res.status(403).json({ error: "You can only create accounts for your own customers" });
        }
      }

      const accountId = await Account.createAccount({ CustomerID, Type, Balance });
      
      // Update created_by
      await AccountModel.findByIdAndUpdate(accountId, { created_by: req.user.id });

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
      const AccountModel = Account.get();
      // Ensure Customer model is registered on this connection
      Customer.get();
      
      if (req.user.role === "admin" || req.user.role === "guest") {
        accounts = await AccountModel.find()
          .populate('customerId', 'name cnic')
          .sort({ createdAt: -1 });
      } else {
        accounts = await AccountModel.find({ created_by: req.user.id })
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
      const AccountModel = Account.get();
      const CustomerModel = Customer.get();

      if (req.user.role === "admin" || req.user.role === "guest") {
        accounts = await AccountModel.find({ customerId });
      } else {
        // Employee: validate customer belongs to them
        const customer = await CustomerModel.findOne({ _id: customerId, created_by: req.user.id });
        if (!customer) return res.status(403).json({ error: "Access denied" });
        accounts = await AccountModel.find({ customerId });
      }

      res.json(accounts.map(a => ({ AccountNo: a.accountNo, Type: a.type, Balance: a.balance })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Deposit
  async deposit(req, res) {
    const { AccountNo, Amount } = req.body;
    const AccountModel = Account.get();
    const TransactionModel = Transaction.get();
    
    // In guest mode, we don't need real transactions for now if sessions are not supported by the driver configuration
    // But for simplicity, let's just use normal save if session fails or is not provided
    try {
      const account = await AccountModel.findOne({ accountNo: AccountNo });
      if (!account) throw new Error("Account not found");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only deposit into your own accounts");
      }

      account.balance += parseFloat(Amount);
      await account.save();

      const transaction = new TransactionModel({
        toAccount: AccountNo,
        amount: Amount,
        type: 'Deposit',
        created_by: req.user.id
      });
      const txResult = await transaction.save();

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Deposit of Rs. ${Amount} to account #${AccountNo}. New balance: Rs. ${account.balance}`
      });

      res.json({ success: true, newBalance: account.balance });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Withdraw
  async withdraw(req, res) {
    const { AccountNo, Amount } = req.body;
    const AccountModel = Account.get();
    const TransactionModel = Transaction.get();
    
    try {
      const account = await AccountModel.findOne({ accountNo: AccountNo });
      if (!account) throw new Error("Account not found");
      if (account.balance < Amount) throw new Error("Insufficient balance");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only withdraw from your own accounts");
      }

      account.balance -= parseFloat(Amount);
      await account.save();

      const transaction = new TransactionModel({
        fromAccount: AccountNo,
        amount: Amount,
        type: 'Withdraw',
        created_by: req.user.id
      });
      const txResult = await transaction.save();

      await AuditLog.logOperation({
        Operation: "COMMIT",
        TableAffected: "Account",
        User: req.user.email,
        RecordID: txResult._id,
        Details: `Withdrawal of Rs. ${Amount} from account #${AccountNo}. New balance: Rs. ${account.balance}`
      });

      res.json({ success: true, newBalance: account.balance });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Delete account
  async deleteAccount(req, res) {
    const { id } = req.params;
    const AccountModel = Account.get();
    try {
      const account = await AccountModel.findOne({ accountNo: id });
      if (!account) throw new Error("Account not found");

      if (req.user.role === "employee" && account.created_by?.toString() !== req.user.id) {
        throw new Error("You can only delete your own accounts");
      }

      await AccountModel.deleteOne({ accountNo: id });

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
