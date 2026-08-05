const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user.model");
const Reel = require("../models/reel.model");
const Interaction = require("../models/interaction.model");
const Comment = require("../models/comment.model");
const QualifiedView = require("../models/qualifiedView.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const { getCreatorDashboard } = require("../controllers/creator.controller");

async function runTest() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/catchwatch");
    console.log("Connected.");

    // Find any user
    const creator = await User.findOne({ isCreator: true }) || await User.findOne();
    if (!creator) {
      console.log("No user found in database.");
      process.exit(0);
    }

    console.log(`Testing dashboard for user: ${creator.name} (${creator._id})`);

    const req = {
      user: { id: creator._id.toString() },
      query: { timeframe: "today" },
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("\n--- GET CREATOR DASHBOARD RESPONSE ---");
        console.log("Success:", data.success);
        console.log("Timeframe:", data.timeframe);
        console.log("Likes (Selected):", data.likes);
        console.log("Comments (Selected):", data.comments);
        console.log("Views (Selected):", data.qualifiedViews);
        console.log("Saves (Selected):", data.saves);
        console.log("Shares (Selected):", data.shares);
        console.log("\nLikes By Time:", data.likesByTime);
        console.log("Comments By Time:", data.commentsByTime);
        console.log("Views By Time:", data.viewsByTime);
        console.log("Saves By Time:", data.savesByTime);
        console.log("Shares By Time:", data.sharesByTime);
        console.log("Time Stats:", JSON.stringify(data.timeStats, null, 2));
        return this;
      },
    };

    await getCreatorDashboard(req, res);

    await mongoose.disconnect();
    console.log("\nTest completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

runTest();
