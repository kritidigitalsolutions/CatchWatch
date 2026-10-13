const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getAllReports,
  getReportById,
  resolveReport,
  getModerationStats,
  getAllUserBlocks,
  deleteUserBlock,
} = require("../../controllers/report.controller");

router.use(isAdmin);

router.get("/stats", getModerationStats);
router.get("/blocks", getAllUserBlocks);
router.delete("/blocks/:id", deleteUserBlock);

router.get("/", getAllReports);
router.get("/:id", getReportById);
router.patch("/:id", resolveReport);

module.exports = router;
