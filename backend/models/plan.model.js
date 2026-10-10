const mongoose = require("mongoose");

const planSchema =
  new mongoose.Schema(
    {
      // ========================================
      // PLAN NAME
      // ========================================

      name: {
        type: String,

        required: true,

        trim: true,
      },

      // ========================================
      // PRICE
      // ========================================

      price: {
        type: Number,

        required: true,

        min: 0,
      },

      // ========================================
      // DURATION (DAYS)
      // ========================================

      duration: {
        type: Number,

        required: true,

        min: 1,
      },

      // ========================================
      // FEATURES
      // ========================================

      features: [
        {
          type: String,

          trim: true,
        },
      ],

      // ========================================
      // ACTIVE STATUS
      // ========================================

      isActive: {
        type: Boolean,

        default: true,

        index: true,
      },

      // ========================================
      // OPTIONAL FUTURE SUPPORT
      // ========================================

      // weekly / monthly / quarterly / 3month / yearly / lifetime
      planType: {
        type: String,

        enum: [
          "weekly",
          "monthly",
          "quarterly",
          "3month",
          "yearly",
        ],

        default: "monthly",
      },

      // Apple In-App Purchase Product ID for iOS StoreKit
      appleProductId: {
        type: String,
        default: "",
        trim: true,
      },

      // Apple App Store Connect Internal Subscription ID
      appleSubscriptionId: {
        type: String,
        default: "",
        trim: true,
      },

      // Apple App Store Connect live customer price (INR)
      appleCurrentPrice: {
        type: Number,
        default: null,
      },

      // Apple scheduled future price change (INR)
      appleScheduledPrice: {
        type: Number,
        default: null,
      },

      // Apple scheduled price change effective date (e.g. YYYY-MM-DD)
      appleScheduledDate: {
        type: String,
        default: "",
      },

      // Apple scheduled price record ID (for cancellation)
      appleScheduledPriceId: {
        type: String,
        default: "",
      },

      // Apple pricing status flow
      applePriceStatus: {
        type: String,
        enum: [
          "NOT_SYNCED",
          "DRAFT",
          "PENDING_CONFIRMATION",
          "SCHEDULED",
          "ACTIVE",
          "FAILED",
          "CANCELLED",
        ],
        default: "NOT_SYNCED",
      },

      // Timestamp of last Apple IAP price scan/sync
      appleLastSyncedAt: {
        type: Date,
        default: null,
      },

      // display sorting
      sortOrder: {
        type: Number,

        default: 0,
      },

      // recommended badge
      isRecommended: {
        type: Boolean,

        default: false,
      },

      // plan category (SUBSCRIPTION vs BLUETICK / ORANGETICK)
      category: {
        type: String,
        enum: ["SUBSCRIPTION", "BLUETICK", "ORANGETICK"],
        default: "SUBSCRIPTION",
        index: true,
      },
    },

    {
      timestamps: true,
    }
  );


// ========================================
// INDEXES
// ========================================

planSchema.index({
  sortOrder: 1,
});


// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model(
  "Plan",
  planSchema
);