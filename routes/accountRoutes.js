const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/accountController');

router.post('/', AccountController.createAccount);      
router.get('/', AccountController.getAccounts);         
router.post('/deposit', AccountController.deposit);     
router.post('/withdraw', AccountController.withdraw);   
router.delete('/:id', AccountController.deleteAccount);  // Make sure this is LAST

module.exports = router;