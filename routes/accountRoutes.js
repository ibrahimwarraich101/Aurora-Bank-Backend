const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/accountController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, AccountController.createAccount);
router.get('/', verifyToken, AccountController.getAccounts);
router.get('/by-customer/:customerId', verifyToken, AccountController.getAccountsByCustomer);
router.post('/deposit', verifyToken, AccountController.deposit);
router.post('/withdraw', verifyToken, AccountController.withdraw);
router.delete('/:id', verifyToken, AccountController.deleteAccount);

module.exports = router;