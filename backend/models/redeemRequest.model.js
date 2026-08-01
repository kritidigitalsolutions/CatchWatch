const mongoose = require("mongoose");

const redeemRequestSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    paymentDetails: {
      paymentMethod: {
        type: String,
        enum: ["UPI", "BANK_TRANSFER"],
        default: "UPI",
      },
      upiId: {
        type: String,
        default: "",
      },
      accountHolderName: {
        type: String,
        default: "",
      },
      accountNumber: {
        type: String,
        default: "",
      },
      ifscCode: {
        type: String,
        default: "",
      },
      bankName: {
        type: String,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: "",
    },
    adminRemark: {
      type: String,
      default: "",
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.RedeemRequest ||
  mongoose.model("RedeemRequest", redeemRequestSchema);
