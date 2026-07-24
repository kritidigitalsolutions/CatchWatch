const jwt = require("jsonwebtoken");

const isAdmin = async (
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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "ADMIN" && decoded.role !== "SUBADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    console.error(
      "Admin Middleware Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Super admin access required for this action",
  });
};

module.exports = { isAdmin, isSuperAdmin };