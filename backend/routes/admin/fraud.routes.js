const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const { getAdminFraudLogs, getAdminFraudStats } = require("../../controllers/fraud.controller");

router.get("/logs", isAdmin, getAdminFraudLogs);
router.get("/stats", isAdmin, getAdminFraudStats);

module.exports = router;
