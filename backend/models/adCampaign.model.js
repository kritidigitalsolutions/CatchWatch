const mongoose = require("mongoose");

const adCampaignSchema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    advertiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertiser",
      required: true,
      index: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
    },
    dailyLimit: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: Number,
      default: 1, // Higher number = higher priority
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED", "REJECTED"],
      default: "PENDING",
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "REFUNDED", "FAILED"],
      default: "PENDING",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    targetAudience: {
      country: { type: [String], default: ["ALL"] },
      state: { type: [String], default: ["ALL"] },
      city: { type: [String], default: ["ALL"] },
      languages: { type: [String], default: ["ALL"] },
      ageRange: {
        min: { type: Number, default: 13 },
        max: { type: Number, default: 65 },
      },
      genders: { type: [String], default: ["ALL"] },
      interests: { type: [String], default: ["ALL"] },
      devices: { type: [String], default: ["ALL"] },
      subscriptionPlans: { type: [String], default: ["ALL"] },
      creatorFollowersOnly: { type: Boolean, default: false },
    },
    // Metrics cache
    totalImpressions: { type: Number, default: 0 },
    totalQualifiedImpressions: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalQualifiedViews: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalWatchTimeSeconds: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.AdCampaign || mongoose.model("AdCampaign", adCampaignSchema);
