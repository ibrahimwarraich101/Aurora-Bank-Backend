const express = require("express");
const router = express.Router();
const AuditLogController = require("../controllers/auditLogController");

router.get("/", AuditLogController.getAllLogs);

module.exports = router;