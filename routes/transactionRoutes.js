const express = require("express");
const router = express.Router();
const TransactionController = require("../controllers/transactionController");

router.post("/transfer", TransactionController.transfer);
router.get("/savepoint-demo", TransactionController.savepointDemo);
router.get("/", TransactionController.getAllTransactions);

module.exports = router;