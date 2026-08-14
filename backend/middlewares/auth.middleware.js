const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const isAuth = async (
  req,
  res,
  next
) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (verified.role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "User access only",
      });
    }

    const user = await User.findById(verified.id).select("role status sessions activeSession");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "Blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled",
      });
    }

    if (verified.sessionId) {
      const platform = verified.platform === "mobile" ? "mobile" : "web";
      const currentPlatformSession = user.sessions?.[platform] || (platform === "web" ? user.activeSession : null);

      if (
        !currentPlatformSession ||
        !currentPlatformSession.sessionId ||
        currentPlatformSession.sessionId !== verified.sessionId ||
        currentPlatformSession.status === "REVOKED"
      ) {
        return res.status(401).json({
          success: false,
          code: "SESSION_REVOKED",
          platform,
          message: "Your account was logged in on another device.",
        });
      }
    }

    req.user = verified;
    req.currentUser = user;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.name,
      message: error.message,
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (token) {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      if (verified.role === "USER") {
        const user = await User.findById(verified.id).select("role status sessions activeSession");
        if (user && user.status !== "Blocked") {
          const platform = verified.platform === "mobile" ? "mobile" : "web";
          const currentPlatformSession = user.sessions?.[platform] || (platform === "web" ? user.activeSession : null);
          if (
            !verified.sessionId ||
            (currentPlatformSession &&
              currentPlatformSession.sessionId === verified.sessionId &&
              currentPlatformSession.status !== "REVOKED")
          ) {
            req.user = verified;
            req.currentUser = user;
          }
        }
      }
    }
  } catch (err) {
    // Silent ignore optional token failure
  }
  next();
};

module.exports = { isAuth, optionalAuth };