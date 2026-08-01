const mongoose = require("mongoose");

const adAnalyticsSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdCampaign",
      required: true,
      index: true,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
      index: true,
    },
    advertiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advertiser",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    hour: {
      type: Number, // 0 - 23
      required: true,
    },
    impressions: { type: Number, default: 0 },
    qualifiedImpressions: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    qualifiedViews: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    watchTimeSeconds: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

adAnalyticsSchema.index({ campaignId: 1, adId: 1, date: 1, hour: 1 }, { unique: true });

module.exports =
  mongoose.models.AdAnalytics || mongoose.model("AdAnalytics", adAnalyticsSchema);
