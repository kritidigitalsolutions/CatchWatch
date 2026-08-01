const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
  {
    // Quality Score Formula Weights (Sum should equal 100)
    qualityScoreWeights: {
      qualifiedWatchTime: { type: Number, default: 35 },
      completionRate: { type: Number, default: 20 },
      shares: { type: Number, default: 15 },
      saves: { type: Number, default: 10 },
      comments: { type: Number, default: 10 },
      likes: { type: Number, default: 5 },
      newFollowers: { type: Number, default: 5 },
    },

    // Engagement Point Matrix
    engagementPoints: {
      like: { type: Number, default: 1 },
      comment: { type: Number, default: 3 },
      share: { type: Number, default: 5 },
      save: { type: Number, default: 4 },
      follow: { type: Number, default: 8 },
    },

    // Ad Settings & Placement Rules
    adSettings: {
      adFrequency: { type: Number, default: 3 }, // Show ad every N reels (2, 3, 5, 7, 10)
      frequencyCapPerUserPerDay: { type: Number, default: 5 }, // Max impressions per user per day per campaign
      minWatchTimeSeconds: { type: Number, default: 3 }, // Min watch time for qualified view (default 3s)
      ctrThresholdAlert: { type: Number, default: 1.5 }, // % CTR alert threshold
    },

    // Fraud Detection Rules
    fraudRules: {
      cooldownSeconds: { type: Number, default: 60 },
      maxViewsPerIPPerMinute: { type: Number, default: 10 },
      maxViewsPerDevicePerMinute: { type: Number, default: 10 },
      blockVpn: { type: Boolean, default: true },
      detectEmulator: { type: Boolean, default: true },
      detectClickFarm: { type: Boolean, default: true },
    },

    // Creator Level Boundaries
    creatorLevels: {
      beginnerMax: { type: Number, default: 30 }, // 0 - 30
      risingMax: { type: Number, default: 60 }, // 31 - 60
      professionalMax: { type: Number, default: 80 }, // 61 - 80
      premiumMax: { type: Number, default: 100 }, // 81 - 100
    },

    // Reward Formula Settings
    rewardFormula: {
      baseCpm: { type: Number, default: 150 }, // Base CPM rate (INR/USD) per 1000 qualified views
      pointValue: { type: Number, default: 0.05 }, // Value per engagement point
    },
  },
  {
    timestamps: true,
  }
);

// Method to get or initialize singleton settings
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports =
  mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", systemSettingsSchema);
