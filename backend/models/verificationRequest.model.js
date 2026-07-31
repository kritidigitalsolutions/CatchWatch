const mongoose = require("mongoose");

const verificationRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    governmentIdType: {
      type: String,
      enum: ["Aadhar", "Passport", "Driving License", "PAN"],
      required: true,
    },
    governmentIdNumber: {
      type: String,
      trim: true,
      default: "",
    },
    idFront: {
      type: String,
      required: true,
    },
    idBack: {
      type: String,
      default: "",
    },
    selfie: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    instagram: {
      type: String,
      trim: true,
      default: "",
    },
    facebook: {
      type: String,
      trim: true,
      default: "",
    },
    youtube: {
      type: String,
      trim: true,
      default: "",
    },
    twitter: {
      type: String,
      trim: true,
      default: "",
    },
    linkedin: {
      type: String,
      trim: true,
      default: "",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    adminRemark: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },
    selectedPlan: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
      },
      name: { type: String, default: "" },
      price: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      paymentId: { type: String, default: "" },
      orderId: { type: String, default: "" },
    },
    paymentId: {
      type: String,
      default: "",
    },
    orderId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.VerificationRequest ||
  mongoose.model("VerificationRequest", verificationRequestSchema);
