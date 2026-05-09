const express = require("express");
const router = express.Router();
const AuditLogController = require("../controllers/auditLogController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, AuditLogController.getAllLogs);
router.get("/table/:table", verifyToken, AuditLogController.getLogsByTable);
router.get("/operation/:operation", verifyToken, AuditLogController.getLogsByOperation);

module.exports = router;