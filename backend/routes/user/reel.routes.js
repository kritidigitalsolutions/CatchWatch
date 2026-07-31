const express = require("express");

const router = express.Router();

const {
  isAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  uploadReel,
  getReelsFeed,
  getSingleReel,
  deleteReel,
  incrementViews,
  incrementShares,
  getCommentCount,
  saveReel,
  unsaveReel,
  getMyReels,
  getUserReels,
} = require("../../controllers/reel.controller");

// Upload Reel
router.post(
  "/upload",
  isAuth,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadReel
);

// Feed
router.get(
  "/feed",
  getReelsFeed
);

// My Reels
router.get(
  "/my-reels",
  isAuth,
  getMyReels
);

// User Reels
router.get(
  "/user/:userId",
  getUserReels
);

// Single Reel
router.get(
  "/:id",
  getSingleReel
);

// Delete Reel
router.delete(
  "/:id",
  isAuth,
  deleteReel
);

// Increment view count
router.post(
  "/:id/view",
  incrementViews
);

// Comment Count API
router.get(
  "/:id/comment-count",
  getCommentCount
);

// Increment share count
router.post(
  "/:id/share",
  incrementShares
);

// Save Reel
router.post(
  "/:id/save",
  isAuth,
  saveReel
);

// Unsave Reel
router.post(
  "/:id/unsave",
  isAuth,
  unsaveReel
);

router.delete(
  "/:id/save",
  isAuth,
  unsaveReel
);

module.exports = router;