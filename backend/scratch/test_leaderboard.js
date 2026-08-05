const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { getLeaderboard } = require("../controllers/creator.controller");

async function runTest() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/catchwatch");
    console.log("Connected.");

    const req = {
      user: null,
      query: { timeframe: "all", limit: "10" },
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("\n--- GET LEADERBOARD RESPONSE ---");
        console.log("Success:", data.success);
        console.log("Timeframe:", data.timeframe);
        console.log("Total Ranked Users:", data.totalCount);
        console.log("\nTop 5 Ranked Creators:");
        (data.leaderboard || []).slice(0, 5).forEach((item) => {
          console.log(`Rank #${item.rank}: ${item.name} (${item.username}) | Points: ${item.totalPoints} | Level: ${item.creatorLevel} | BlueTick: ${item.blueTick} | Badges: ${item.badges.join(", ")}`);
        });
        return this;
      },
    };

    await getLeaderboard(req, res);

    await mongoose.disconnect();
    console.log("\nTest completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

runTest();
