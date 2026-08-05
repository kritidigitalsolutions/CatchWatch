const express = require("express");
const router = express.Router();
const { isAuth, optionalAuth } = require("../../middlewares/auth.middleware");

const {
  getCreatorWallet,
  requestRedeem,
  getRedeemHistory,
  getCreatorPoints,
  getPointHistory,
  getCreatorDashboard,
  getLeaderboard,
} = require("../../controllers/creator.controller");

// Wallet API
router.get("/wallet", isAuth, getCreatorWallet);

// Redeem APIs
router.post("/redeem", isAuth, requestRedeem);
router.get("/redeem/history", isAuth, getRedeemHistory);

// Creator Points API
router.get("/points", isAuth, getCreatorPoints);

// Point History API
router.get("/point-history", isAuth, getPointHistory);

// Creator Dashboard API (Verified Users Only)
router.get("/dashboard", isAuth, getCreatorDashboard);

// Creator / User Leaderboard API (Public & Auth)
router.get("/leaderboard", optionalAuth, getLeaderboard);

module.exports = router;
