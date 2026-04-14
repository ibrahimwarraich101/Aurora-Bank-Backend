const express = require("express");
const router = express.Router();
const TransactionController = require("../controllers/transactionController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, TransactionController.getAllTransactions);
router.post("/transfer", verifyToken, TransactionController.transfer);

module.exports = router;