const User = require("../models/user.model");

/**
 * Middleware to require Blue-Tick verification for VIP Support APIs.
 * Checks user's isVerified flag and verification.status in MongoDB.
 */
const requireVipVerification = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in first.",
      });
    }

    const dbUser = await User.findById(req.user.id);

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const isVerifiedUser =
      dbUser.isVerified === true ||
      dbUser.verification?.isVerified === true ||
      dbUser.verification?.status === "VERIFIED";

    if (!isVerifiedUser) {
      return res.status(403).json({
        success: false,
        isVerified: false,
        message:
          "Access denied. VIP Support is exclusively available for Blue Tick verified creators and users. Please apply for profile verification to unlock direct support access.",
      });
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error("Require VIP Verification Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error checking VIP access.",
    });
  }
};

module.exports = { requireVipVerification };
