const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["reel", "comment", "user"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "SPAM",
        "INAPPROPRIATE_CONTENT",
        "HARASSMENT",
        "HATE_SPEECH",
        "NUDITY_OR_SEXUAL",
        "VIOLENCE",
        "COPYRIGHT_VIOLATION",
        "SCAM_OR_FRAUD",
        "OTHER",
      ],
      required: true,
      default: "INAPPROPRIATE_CONTENT",
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["PENDING", "REVIEWED", "ACTION_TAKEN", "DISMISSED"],
      default: "PENDING",
      index: true,
    },
    actionTaken: {
      type: String,
      enum: [
        "NONE",
        "CONTENT_DELETED",
        "USER_WARNED",
        "USER_BLOCKED",
        "USER_BANNED",
      ],
      default: "NONE",
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.Report || mongoose.model("Report", reportSchema);
