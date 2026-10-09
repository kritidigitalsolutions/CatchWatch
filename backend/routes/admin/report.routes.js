const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllReports,
  getReportById,
  resolveReport,
} = require("../../controllers/report.controller");

router.use(isAdmin);

router.get("/", getAllReports);
router.get("/:id", getReportById);
router.patch("/:id", resolveReport);

module.exports = router;
