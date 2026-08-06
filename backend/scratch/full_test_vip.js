const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/user.model");
const SupportTicket = require("../models/supportTicket.model");

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Find or create a non-verified user
  let nonVerifiedUser = await User.findOne({ isVerified: false });
  if (!nonVerifiedUser) {
    nonVerifiedUser = await User.create({
      phone: "+910000000001",
      name: "Test Regular User",
      isVerified: false,
      "verification.isVerified": false,
      "verification.status": "NOT_VERIFIED",
    });
  }

  // 2. Find or create a verified user
  let verifiedUser = await User.findOne({ isVerified: true });
  if (!verifiedUser) {
    verifiedUser = await User.create({
      phone: "+910000000002",
      name: "Test BlueTick Creator",
      isVerified: true,
      "verification.isVerified": true,
      "verification.status": "VERIFIED",
    });
  }

  const tokenNonVerified = jwt.sign(
    { id: nonVerifiedUser._id, role: "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  const tokenVerified = jwt.sign(
    { id: verifiedUser._id, role: "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  const axios = require("axios");

  console.log("\n--- TEST 1: Non-Verified User Access Check ---");
  const res1 = await axios.get("http://localhost:5000/api/support/vip/access-check", {
    headers: { Authorization: `Bearer ${tokenNonVerified}` },
  });
  console.log("Access Check Result:", res1.data);

  console.log("\n--- TEST 2: Non-Verified User Submit VIP Ticket (Should be 403 Forbidden) ---");
  try {
    await axios.post(
      "http://localhost:5000/api/support/vip",
      { subject: "Illegal access test", message: "Should fail", category: "TECHNICAL_GLITCH" },
      { headers: { Authorization: `Bearer ${tokenNonVerified}` } }
    );
    console.error("FAIL: Non-verified user was allowed to submit VIP ticket!");
  } catch (err) {
    console.log("SUCCESS: Blocked with status:", err.response?.status);
    console.log("Message:", err.response?.data?.message);
  }

  console.log("\n--- TEST 3: Verified User Access Check ---");
  const res3 = await axios.get("http://localhost:5000/api/support/vip/access-check", {
    headers: { Authorization: `Bearer ${tokenVerified}` },
  });
  console.log("Access Check Result:", res3.data);

  console.log("\n--- TEST 4: Verified User Submit VIP Ticket ---");
  const res4 = await axios.post(
    "http://localhost:5000/api/support/vip",
    {
      subject: "Test Copyright & Broadcast Question",
      message: "Direct human assistance test for verified creator.",
      category: "COPYRIGHT",
      priority: "URGENT",
    },
    { headers: { Authorization: `Bearer ${tokenVerified}` } }
  );
  console.log("VIP Ticket Created Result:", res4.data);

  console.log("\n--- TEST 5: Verified User Fetch VIP Tickets ---");
  const res5 = await axios.get("http://localhost:5000/api/support/vip", {
    headers: { Authorization: `Bearer ${tokenVerified}` },
  });
  console.log("Fetched VIP Tickets Count:", res5.data.count);

  mongoose.connection.close();
  console.log("\nAll Backend Tests Completed Successfully! 🚀");
}

runTest().catch((err) => {
  console.error("Test error:", err);
  mongoose.connection.close();
});
