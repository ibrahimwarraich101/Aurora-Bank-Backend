const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/accountController');

router.post('/', AccountController.createAccount);      // Create account
router.get('/', AccountController.getAccounts);         // Get all accounts
router.post('/deposit', AccountController.deposit);     // Deposit money
router.post('/withdraw', AccountController.withdraw);   // Withdraw money

module.exports = router;