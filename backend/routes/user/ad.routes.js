const express = require("express");
const router = express.Router();
const {
  getReelFeedAd,
  recordAdEvent,
} = require("../../controllers/ad.controller");

// Reel Ad Feed endpoint & interaction tracker
router.get("/reel-feed", getReelFeedAd);
router.post("/event", recordAdEvent);

module.exports = router;
