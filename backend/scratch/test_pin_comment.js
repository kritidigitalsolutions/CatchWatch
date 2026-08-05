const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Comment = require("../models/comment.model");
const Reel = require("../models/reel.model");
require("../models/user.model");
const { togglePinComment, getComments } = require("../controllers/comment.controller");

async function runTest() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/catchwatch");
    console.log("Connected.");

    const comments = await Comment.find().lean();
    let commentObj = null;
    let reel = null;
    for (const c of comments) {
      const r = await Reel.findById(c.reel);
      if (r) {
        commentObj = c;
        reel = r;
        break;
      }
    }
    console.log(`Found Comment ID: ${commentObj._id} on Reel ID: ${reel._id}`);
    console.log(`Reel Owner Creator ID: ${reel.user}`);

    // Mock togglePinComment request as Reel Owner
    const reqPin = {
      params: { commentId: commentObj._id },
      user: { id: reel.user.toString() },
      body: { isPinned: true },
    };

    const resPin = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("\n--- TOGGLE PIN COMMENT RESPONSE ---");
        console.log("Success:", data.success);
        console.log("Message:", data.message);
        console.log("Is Pinned:", data.isPinned);
        return this;
      },
    };

    await togglePinComment(reqPin, resPin);

    // Test unverified user
    const User = require("../models/user.model");
    const unverifiedUser = await User.findOne({ isVerified: { $ne: true }, "verification.status": { $ne: "APPROVED" } });
    if (unverifiedUser) {
      console.log(`\nTesting with Unverified User ID: ${unverifiedUser._id}`);
      const reqUnverified = {
        params: { commentId: commentObj._id },
        user: { id: unverifiedUser._id.toString() },
        body: { isPinned: true },
      };
      const resUnverified = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          console.log("--- UNVERIFIED USER TOGGLE PIN RESPONSE ---");
          console.log("Status Code:", this.statusCode);
          console.log("Success:", data.success);
          console.log("Message:", data.message);
          return this;
        },
      };
      await togglePinComment(reqUnverified, resUnverified);
    }

    // Verify getComments returns pinned comment at index 0
    const reqGet = {
      params: { reelId: reel._id },
      query: { page: "1", limit: "10" },
    };

    const resGet = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("\n--- GET COMMENTS RESPONSE (Top Comment check) ---");
        console.log("Total Comments:", data.total);
        if (data.comments && data.comments.length > 0) {
          console.log(`Top Comment (Index 0): "${data.comments[0].text}" | isPinned: ${data.comments[0].isPinned}`);
        }
        return this;
      },
    };

    await getComments(reqGet, resGet);

    await mongoose.disconnect();
    console.log("\nPin Comment API Test Completed Successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

runTest();
