const Plan = require("../models/plan.model");

// GET ACTIVE PLANS (Standard Subscription Plans or filtered by Category)
exports.getPlans = async (req, res) => {
  try {
    const category = req.query.category || "SUBSCRIPTION";
    const query = { isActive: true };
    if (category !== "ALL") {
      query.category = category;
    }

    const plans = await Plan.find(query).sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET ACTIVE BLUETICK / VERIFICATION PLANS
exports.getBluetickPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true, category: "BLUETICK" }).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};