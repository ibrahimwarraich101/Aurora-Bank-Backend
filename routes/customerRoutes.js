const express = require("express");
const router = express.Router();
const { getAllCustomers, createCustomer, deleteCustomer } = require("../controllers/customerController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, getAllCustomers);
router.post("/", verifyToken, createCustomer);
router.delete("/:id", verifyToken, deleteCustomer);

module.exports = router;