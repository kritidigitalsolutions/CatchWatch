const mongoose = require("mongoose");

const creatorWalletSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    redeemedPoints: {
      type: Number,
      default: 0,
    },
    availablePoints: {
      type: Number,
      default: 0,
    },
    walletBalance: {
      type: Number,
      default: 0, // Available cash value based on 10 points = 1 balance unit (e.g. INR)
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.CreatorWallet ||
  mongoose.model("CreatorWallet", creatorWalletSchema);
