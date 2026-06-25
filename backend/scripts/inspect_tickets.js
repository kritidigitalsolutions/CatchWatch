require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const connectDB = require("../config/db");
const User = require("../models/user.model");
const SupportTicket = require("../models/supportTicket.model");
const SupportMessage = require("../models/supportMessage.model");

const inspect = async () => {
  await connectDB();
  
  const tickets = await SupportTicket.find().populate("user", "name email phone");
  console.log("=== TICKETS ===");
  console.log(JSON.stringify(tickets, null, 2));

  const messages = await SupportMessage.find();
  console.log("\n=== MESSAGES ===");
  console.log(JSON.stringify(messages, null, 2));

  process.exit(0);
};

inspect();
