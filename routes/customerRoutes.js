const express = require("express");
const router = express.Router();
const { getAllCustomers, createCustomer, deleteCustomer } = require("../controllers/customerController");

router.get("/", getAllCustomers);
router.post("/", createCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;