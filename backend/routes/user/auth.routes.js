const express = require("express");

const router = express.Router();

const {
  sendOTP,
  verifyOtp,
  googleLogin,
  refreshToken,
} = require("../../controllers/auth.controller");
const { isAuth } = require("../../middlewares/auth.middleware");


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
// GOOGLE LOGIN
// ========================================
router.post(
  "/google-login",
  googleLogin
);

// ========================================
// USER LOGOUT
// ========================================
router.post(
  "/logout",
  (req, res) => {
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ success: true, message: "Logged out successfully" });
  }
);

// ========================================
// REFRESH TOKEN
// ========================================
router.post(
  "/refresh-token",
  isAuth,
  refreshToken
);

module.exports = router;