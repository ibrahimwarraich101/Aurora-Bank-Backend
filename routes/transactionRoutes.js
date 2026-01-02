const express = require("express");
const router = express.Router();
const TransactionController = require("../controllers/transactionController");

// NEW: Get all transactions
router.get("/", TransactionController.getAllTransactions);

// Transfer money
router.post("/transfer", TransactionController.transfer);

// Savepoint demo
router.get("/savepoint-demo", TransactionController.savepointDemo);

module.exports = router;