const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { verifyRecaptcha } = require("../middleware/recaptcha");


router.post("/login", verifyRecaptcha, authController.login);
router.post("/guest", verifyRecaptcha, authController.guestLogin);
router.post("/forgot-password", verifyRecaptcha, authController.forgotPassword);
router.post("/change-password", verifyToken, verifyRecaptcha, authController.changePassword);
router.put("/profile", verifyToken, verifyRecaptcha, authController.updateProfile);

module.exports = router;
