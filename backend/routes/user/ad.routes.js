const express = require("express");
const router = express.Router();
const {
  getReelFeedAd,
  getContentAd,
  recordAdEvent,
} = require("../../controllers/ad.controller");

// Universal Content Ad Feed (Movies, Short Films, TV Shows, Reels)
router.get("/content-ad", getContentAd);
router.get("/reel-feed", getReelFeedAd);
router.post("/event", recordAdEvent);

module.exports = router;

