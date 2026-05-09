const express = require("express");
const router = express.Router();
const EmployeeController = require("../controllers/employeeController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

router.get("/", verifyToken, requireAdmin, EmployeeController.getAllEmployees);
router.post("/", verifyToken, requireAdmin, EmployeeController.createEmployee);
router.put("/:id", verifyToken, requireAdmin, EmployeeController.updateEmployee);
router.patch("/:id/toggle", verifyToken, requireAdmin, EmployeeController.toggleActive);
router.delete("/:id", verifyToken, requireAdmin, EmployeeController.deleteEmployee);

module.exports = router;
