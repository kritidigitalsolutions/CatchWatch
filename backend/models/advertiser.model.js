const mongoose = require("mongoose");

// Deprecated model kept for backward DB compatibility
const advertiserSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Advertiser || mongoose.model("Advertiser", advertiserSchema);
