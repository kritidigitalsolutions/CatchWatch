const express = require("express");

const router = express.Router();

const {
  isAuth,
  optionalAuth,
} = require("../../middlewares/auth.middleware");

const upload = require("../../middlewares/upload.middleware");

const {
  getProfile,
  completeProfile,
  updateProfile,
  saveFcmToken,
  getProfileStats,
  getPublicUserProfile,
  getUserPosts,
} = require("../../controllers/user.controller");

const {
  followUser,
  unfollowUser,
  toggleFollow,
  getFollowers,
  getFollowing,
  checkFollowStatus,
} = require("../../controllers/follow.controller");

// ========================================
// GET USER PROFILE (MY PROFILE)
// ========================================
router.get(
  "/",
  isAuth,
  getProfile
);

router.get(
  "/profile",
  isAuth,
  getProfile
);

// ========================================
// GET PUBLIC USER PROFILE BY ID OR USERNAME
// ========================================
router.get(
  "/profile-details/:identifier",
  optionalAuth,
  getPublicUserProfile
);

// ========================================
// GET USER POSTS / REELS
// ========================================
router.get(
  "/posts/:userId",
  optionalAuth,
  getUserPosts
);

// ========================================
// FOLLOW / UNFOLLOW SYSTEM
// ========================================
router.post("/follow/:id", isAuth, followUser);
router.post("/unfollow/:id", isAuth, unfollowUser);
router.post("/toggle-follow/:id", isAuth, toggleFollow);
router.get("/follow-status/:id", optionalAuth, checkFollowStatus);
router.get("/followers/:userId", optionalAuth, getFollowers);
router.get("/following/:userId", optionalAuth, getFollowing);

// ========================================
// COMPLETE PROFILE
// ========================================
router.post(
  "/complete-profile",
  upload.single("profileImage"),
  completeProfile
);

// ========================================
// UPDATE PROFILE
// ========================================
router.patch(
  "/update-profile",
  isAuth,
  upload.single("profileImage"),
  updateProfile
);

// ========================================
// CONNECT FCM TOKEN TO USER
// ========================================
router.patch(
  "/fcm-token",
  isAuth,
  saveFcmToken
);

// ========================================
// GET PROFILE STATS
// ========================================
router.get(
  "/profile-stats/:userId",
  optionalAuth,
  getProfileStats
);

module.exports = router;
