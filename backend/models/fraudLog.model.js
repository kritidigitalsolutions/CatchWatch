const mongoose = require("mongoose");

const fraudLogSchema = new mongoose.Schema(
  {
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
    },
    ip: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    fraudType: {
      type: String,
      enum: [
        "BOT_VIEW",
        "DUPLICATE_DEVICE",
        "DUPLICATE_IP",
        "RAPID_REFRESH",
        "VPN_USAGE",
        "EMULATOR",
        "CLICK_FARM",
        "AUTO_REFRESH",
        "SUSPICIOUS_ACCOUNT",
      ],
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    actionTaken: {
      type: String,
      enum: ["LOGGED", "VIEW_DISQUALIFIED", "USER_BLOCKED", "IP_FLAGGED"],
      default: "VIEW_DISQUALIFIED",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.FraudLog || mongoose.model("FraudLog", fraudLogSchema);
