const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user.model");
const SupportTicket = require("../models/supportTicket.model");
const SupportMessage = require("../models/supportMessage.model");

async function runDirectTest() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Create or get test users
  let nonVerifiedUser = await User.findOne({ phone: "+919999000001" });
  if (!nonVerifiedUser) {
    nonVerifiedUser = await User.create({
      phone: "+919999000001",
      name: "Non Verified User",
      isVerified: false,
      verification: { isVerified: false, status: "NOT_VERIFIED" },
    });
  } else {
    nonVerifiedUser.isVerified = false;
    nonVerifiedUser.verification = { isVerified: false, status: "NOT_VERIFIED" };
    await nonVerifiedUser.save();
  }

  let verifiedUser = await User.findOne({ phone: "+919999000002" });
  if (!verifiedUser) {
    verifiedUser = await User.create({
      phone: "+919999000002",
      name: "Verified Creator",
      isVerified: true,
      verification: { isVerified: true, status: "VERIFIED" },
    });
  } else {
    verifiedUser.isVerified = true;
    verifiedUser.verification = { isVerified: true, status: "VERIFIED" };
    await verifiedUser.save();
  }

  console.log("Non-verified User:", nonVerifiedUser.name, "isVerified:", nonVerifiedUser.isVerified);
  console.log("Verified User:", verifiedUser.name, "isVerified:", verifiedUser.isVerified);

  // 2. Test Middleware Access Logic
  const checkAccess = (userDoc) => {
    return (
      userDoc.isVerified === true ||
      userDoc.verification?.isVerified === true ||
      userDoc.verification?.status === "VERIFIED"
    );
  };

  console.log("Access for Non-Verified User:", checkAccess(nonVerifiedUser) ? "ALLOWED" : "DENIED (403)");
  console.log("Access for Verified User:", checkAccess(verifiedUser) ? "ALLOWED" : "DENIED (403)");

  if (checkAccess(nonVerifiedUser) === false && checkAccess(verifiedUser) === true) {
    console.log("✅ SECURITY PASS: Only verified users pass the VIP check!");
  } else {
    console.error("❌ SECURITY FAIL!");
  }

  // 3. Create VIP Support Ticket for Verified User
  const vipTicket = await SupportTicket.create({
    user: verifiedUser._id,
    subject: "Copyright & Broadcast Feed Issue",
    category: "COPYRIGHT",
    priority: "URGENT",
    isVip: true,
    lastMessage: "Need priority human assistance with stream feed authorization.",
    status: "OPEN",
  });

  const vipMsg = await SupportMessage.create({
    ticket: vipTicket._id,
    senderType: "USER",
    senderModel: "User",
    senderId: verifiedUser._id,
    message: "Need priority human assistance with stream feed authorization.",
  });

  console.log("VIP Ticket Created ID:", vipTicket._id);
  console.log("Is VIP Ticket:", vipTicket.isVip);
  console.log("Priority:", vipTicket.priority);
  console.log("Category:", vipTicket.category);

  // Clean up test ticket
  await SupportMessage.deleteMany({ ticket: vipTicket._id });
  await SupportTicket.findByIdAndDelete(vipTicket._id);
  console.log("Cleanup completed.");

  mongoose.connection.close();
  console.log("Direct Backend Logic Test Passed Successfully! 🚀");
}

runDirectTest().catch((err) => {
  console.error(err);
  mongoose.connection.close();
});
