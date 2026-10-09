const express = require("express");
const router = express.Router();
const { isAuth } = require("../../middlewares/auth.middleware");
const {
  createReport,
  reportReel,
  reportComment,
  reportUser,
  getMyReports,
} = require("../../controllers/report.controller");

router.use(isAuth);

// Unified UGC report creation
router.post("/", createReport);

// Direct convenience routes
router.post("/reel/:id", reportReel);
router.post("/comment/:id", reportComment);
router.post("/user/:id", reportUser);

// User's own submitted reports
router.get("/my-reports", getMyReports);

module.exports = router;
