const express = require("express");
const router = express.Router();
const { getAllCustomers, createCustomer } = require("../controllers/customerController");

router.get("/", getAllCustomers);
router.post("/", createCustomer);

module.exports = router;