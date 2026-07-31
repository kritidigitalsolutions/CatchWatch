const mongoose = require("mongoose");

const creatorAnalyticsSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    qualifiedViews: {
      type: Number,
      default: 0,
    },
    watchTime: {
      type: Number, // In seconds
      default: 0,
    },
    completionRate: {
      type: Number, // Percentage 0-100
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
    newFollowers: {
      type: Number,
      default: 0,
    },
    engagementPoints: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
      default: 0,
    },
    estimatedReward: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

creatorAnalyticsSchema.index({ creatorId: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.CreatorAnalytics ||
  mongoose.model("CreatorAnalytics", creatorAnalyticsSchema);
