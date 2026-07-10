const jwt = require("jsonwebtoken");

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
console.log("========== AUTH REQUEST ==========");
console.log("Authorization Header:", req.headers.authorization);
console.log("Token:", token);

const decodedToken = jwt.decode(token);
console.log("Decoded:", decodedToken);

console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("==================================");

const verified = jwt.verify(
  token,
  process.env.JWT_SECRET
);
console.log("Verified Payload:", verified);
    if (verified.role !== "USER") {
      return res.status(403).json({
        success: false,
        message: "User access only",
      });
    }

    req.user = verified;

    next();

  } catch (error) {
  console.error("========== JWT ERROR ==========");
  console.error(error);
  console.error("===============================");

  return res.status(401).json({
    success: false,
    error: error.name,
    message: error.message,
});
}
};

module.exports = { isAuth };