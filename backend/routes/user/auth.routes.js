const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  refreshToken,
  logout,
  getSession,
} = require("../../controllers/auth.controller");
const { isAuth, optionalAuth } = require("../../middlewares/auth.middleware");

// ========================================
// SEND OTP
// ========================================
router.post(
  "/send-otp",
  sendOTP
);

// ========================================
// VERIFY OTP
// ========================================
router.post(
  "/verify-otp",
  verifyOtp
);

// ========================================
// USER LOGOUT
// ========================================
router.post(
  "/logout",
  optionalAuth,
  logout
);

// ========================================
// REFRESH TOKEN
// ========================================
router.post(
  "/refresh-token",
  isAuth,
  refreshToken
);

// ========================================
// GET CURRENT ACTIVE SESSION
// ========================================
router.get(
  "/session",
  isAuth,
  getSession
);

module.exports = router;