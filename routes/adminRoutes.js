const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/adminController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

router.get("/reports", verifyToken, requireAdmin, AdminController.getReports);
router.get("/system-settings", verifyToken, requireAdmin, AdminController.getSystemSettings);
router.put("/system-settings", verifyToken, requireAdmin, AdminController.updateSystemSettings);

module.exports = router;
