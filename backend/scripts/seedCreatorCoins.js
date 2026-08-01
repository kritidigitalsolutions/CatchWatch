require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user.model");
const CreatorWallet = require("../models/creatorWallet.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const Reel = require("../models/reel.model");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/catchwatch";

const targetPhones = [
  "+918273243959",
  "8273243959",
  "+917895591694",
  "7895591694",
];

async function seedCoinsAndDemoData() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully!");

    for (const phone of targetPhones) {
      console.log(`\n-----------------------------------`);
      console.log(`Processing Phone: ${phone}`);

      let user = await User.findOne({
        $or: [{ phone: phone }, { phone: phone.replace(/^\+91/, "") }, { phone: `+91${phone.replace(/^\+91/, "")}` }],
      });

      if (!user) {
        console.log(`User not found for phone ${phone}. Creating new user...`);
        const cleanDigits = phone.replace(/\D/g, "").slice(-10);
        user = await User.create({
          phone: phone.startsWith("+") ? phone : `+91${phone}`,
          name: `Creator ${cleanDigits}`,
          username: `@creator_${cleanDigits}`,
          isVerified: true,
          status: "Active",
          totalEngagementPoints: 5000,
          qualityScore: 85,
          creatorLevel: "Premium Creator",
          totalQualifiedViews: 250,
          totalWatchMinutes: 480,
          verification: {
            status: "VERIFIED",
            isVerified: true,
            verifiedAt: new Date(),
          },
        });
        console.log(`Created user: ${user.name} (${user._id})`);
      } else {
        console.log(`Found existing user: ${user.name} (${user._id})`);
        user.totalEngagementPoints = (user.totalEngagementPoints || 0) + 5000;
        user.qualityScore = Math.max(user.qualityScore || 0, 85);
        user.creatorLevel = "Premium Creator";
        user.totalQualifiedViews = (user.totalQualifiedViews || 0) + 250;
        user.totalWatchMinutes = (user.totalWatchMinutes || 0) + 480;
        user.isVerified = true;
        user.status = "Active";
        user.verification = {
          status: "VERIFIED",
          isVerified: true,
          verifiedAt: new Date(),
        };
        await user.save();
        console.log(`Updated user ${user.name} with +5,000 coins and Premium status!`);
      }

      // Update / Create CreatorWallet
      let wallet = await CreatorWallet.findOne({ creatorId: user._id });
      if (!wallet) {
        wallet = await CreatorWallet.create({
          creatorId: user._id,
          totalPoints: user.totalEngagementPoints,
          redeemedPoints: 0,
          availablePoints: user.totalEngagementPoints,
          walletBalance: Math.round(user.totalEngagementPoints * 0.1),
        });
      } else {
        wallet.totalPoints = user.totalEngagementPoints;
        wallet.availablePoints = user.totalEngagementPoints;
        wallet.walletBalance = Math.round(user.totalEngagementPoints * 0.1);
        await wallet.save();
      }
      console.log(`Wallet Updated: Total Points = ${wallet.totalPoints}, Available = ${wallet.availablePoints}, Balance = ₹${wallet.walletBalance}`);

      // Check if user has reels, if not create demo reel
      let userReel = await Reel.findOne({ user: user._id });
      if (!userReel) {
        userReel = await Reel.create({
          user: user._id,
          videoUrl: "https://catchandwatchzone.b-cdn.net/movies/videos/demo_reel.mp4",
          thumbnailUrl: "https://catchandwatchzone.b-cdn.net/movies/posters/1785566971913-48339614.jpg",
          caption: "🔥 Trending Gadgets & Features Reel Demo",
          viewsCount: 1420,
          sharesCount: 85,
          allowAds: true,
          status: "ACTIVE",
        });
        console.log(`Created Demo Reel for ${user.name}: ${userReel._id}`);
      }

      // Seed Points History Log entries
      const demoActions = [
        { action: "MANUAL_ADD", points: 5000 },
        { action: "QUALIFIED_VIEW", points: 10 },
        { action: "LIKE", points: 1 },
        { action: "COMMENT", points: 3 },
        { action: "SHARE", points: 5 },
        { action: "SAVE", points: 4 },
        { action: "FOLLOW", points: 8 },
      ];

      for (let i = 0; i < demoActions.length; i++) {
        const item = demoActions[i];
        await CreatorPointHistory.create({
          creatorId: user._id,
          reelId: userReel._id,
          action: item.action,
          points: item.points,
          userId: user._id,
          createdAt: new Date(Date.now() - i * 3600000 * 4),
        });
      }
      console.log(`Seeded ${demoActions.length} points history log entries for ${user.name}`);
    }

    console.log("\n===================================");
    console.log("SUCCESSFULLY SEEDED COINS & DEMO DATA!");
    console.log("===================================\n");
  } catch (error) {
    console.error("SEEDING ERROR:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedCoinsAndDemoData();
