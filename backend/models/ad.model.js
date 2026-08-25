const mongoose = require("mongoose");

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdCampaign",
      required: true,
      index: true,
    },
    advertiserId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    adType: {
      type: String,
      enum: [
        "VIDEO",
        "IMAGE",
        "BANNER",
        "CAROUSEL",
        "SPONSORED_REELS",
        "SPONSORED_SHORTS",
        "MOVIES",
        "SHORT_FILMS",
        "TV_SHOWS",
        "ALL_CONTENT",
        "SPLASH",
      ],
      default: "SPONSORED_REELS",
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    ctaText: {
      type: String,
      default: "Learn More",
    },
    destinationUrl: {
      type: String,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 15,
    },
    category: {
      type: String,
      default: "General",
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Ad || mongoose.model("Ad", adSchema);
