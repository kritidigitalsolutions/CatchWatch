const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getLiveMonitoring,
  getGlobalAnalytics,
  getLeaderboards,
  simulateMonthlyReward,
} = require("../../controllers/analytics.controller");

router.get("/live", isAdmin, getLiveMonitoring);
router.get("/global", isAdmin, getGlobalAnalytics);
router.get("/leaderboards", isAdmin, getLeaderboards);
router.post("/simulate-reward", isAdmin, simulateMonthlyReward);

module.exports = router;
