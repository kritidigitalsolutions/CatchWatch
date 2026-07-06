require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const connectDB = require("../config/db");
const Plan = require("../models/plan.model");

const inspect = async () => {
  await connectDB();
  
  const plans = await Plan.find();
  console.log("=== PLANS IN DB ===");
  console.log(JSON.stringify(plans, null, 2));

  if (plans.length === 0) {
    console.log("No plans found. Seeding default plans...");
    const defaultPlans = [
      {
        name: "Standard SD Plan",
        price: 99,
        duration: 30, // 30 days
        features: [
          "Access to SD Quality Content",
          "Includes Ads",
          "1 Screen Stream"
        ],
        isActive: true,
        planType: "monthly",
        sortOrder: 1,
        isRecommended: false
      },
      {
        name: "Premium Monthly Plan",
        price: 199,
        duration: 30, // 30 days
        features: [
          "Access to Ultra HD 4K Content",
          "Ad-Free Streaming",
          "Standard Full HD High Display Resolution",
          "2 Screens Stream"
        ],
        isActive: true,
        planType: "monthly",
        sortOrder: 2,
        isRecommended: true
      },
      {
        name: "Premium Annual Plan",
        price: 1499,
        duration: 365, // 365 days
        features: [
          "Access to Ultra HD 4K Content",
          "Ad-Free Streaming",
          "Cinematic Ultra HD 4K High Fidelity Resolution",
          "4 Screens Stream"
        ],
        isActive: true,
        planType: "yearly",
        sortOrder: 3,
        isRecommended: false
      }
    ];

    const inserted = await Plan.insertMany(defaultPlans);
    console.log("Seeded default plans successfully:", inserted);
  }

  process.exit(0);
};

inspect();
