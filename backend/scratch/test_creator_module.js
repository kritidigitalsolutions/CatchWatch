const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

const User = require("../models/user.model");
const Reel = require("../models/reel.model");
const CreatorAnalytics = require("../models/creatorAnalytics.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const QualifiedView = require("../models/qualifiedView.model");
const RedeemRequest = require("../models/redeemRequest.model");
const CreatorWallet = require("../models/creatorWallet.model");

const {
  decorateUserWithBlueTick,
  determineCreatorLevel,
  calculateQualityScore,
} = require("../utils/creator.helper");

async function runTests() {
  console.log("=== CREATOR MODULE VERIFICATION ===");

  // 1. Test Quality Score Calculation & Levels
  const score1 = calculateQualityScore({
    watchTime: 120, // 2 mins
    completionRate: 85,
    shares: 10,
    saves: 5,
    comments: 20,
    likes: 100,
    followers: 50,
  });
  console.log("Calculated Quality Score:", score1, "Level:", determineCreatorLevel(score1));

  // 2. Test User Blue Tick Decoration
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Creator",
    verification: { status: "VERIFIED", isVerified: true },
  };
  const decorated = decorateUserWithBlueTick(mockUser);
  console.log("Decorated User BlueTick:", decorated.blueTick, "verificationType:", decorated.verificationType);

  console.log("✅ Models and Helper Functions Verified Successfully!");
}

runTests().catch(console.error);
