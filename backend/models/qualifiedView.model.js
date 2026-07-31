const mongoose = require("mongoose");

const qualifiedViewSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: true,
      index: true,
    },
    watchDuration: {
      type: Number, // In seconds
      required: true,
    },
    isQualified: {
      type: Boolean,
      default: false,
    },
    deviceId: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.QualifiedView ||
  mongoose.model("QualifiedView", qualifiedViewSchema);
