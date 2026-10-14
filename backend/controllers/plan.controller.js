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

    // Optional user active subscription context if token provided
    let activeSub = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId || decoded._id;
        if (userId) {
          const Subscription = require("../models/subscription.model");
          const { expireSubscriptionIfNeeded } = require("../utils/subscription.helper");
          let sub = await Subscription.findOne({ user: userId, status: "active" }).populate("plan");
          activeSub = await expireSubscriptionIfNeeded(sub);
        }
      }
    } catch (e) {
      // ignore guest / expired token
    }

    const currentPrice = activeSub?.plan?.price || activeSub?.amount || 0;
    const enrichedPlans = plans.map((p) => {
      const pObj = p.toObject();
      if (activeSub && activeSub.status === "active") {
        const isCurrent = String(activeSub.plan?._id || activeSub.plan) === String(p._id);
        pObj.isCurrentPlan = isCurrent;
        pObj.canUpgrade = !isCurrent && p.price > currentPrice;
        pObj.isDowngrade = !isCurrent && p.price < currentPrice;
        pObj.actionLabel = isCurrent
          ? "Current Plan"
          : p.price > currentPrice
          ? "Upgrade"
          : "Downgrade (Locked)";
      } else {
        pObj.isCurrentPlan = false;
        pObj.canUpgrade = true;
        pObj.isDowngrade = false;
        pObj.actionLabel = "Subscribe";
      }
      return pObj;
    });

    res.json({
      success: true,
      count: plans.length,
      currentActiveSubscription: activeSub && activeSub.status === "active"
        ? {
            id: activeSub._id,
            planId: activeSub.plan?._id,
            planName: activeSub.plan?.name,
            price: currentPrice,
            startDate: activeSub.startDate,
            endDate: activeSub.endDate,
          }
        : null,
      plans: enrichedPlans,
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
    const plans = await Plan.find({ isActive: true, category: { $in: ["ORANGETICK", "BLUETICK"] } }).sort({
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
exports.getOrangeTickPlans = exports.getBluetickPlans;
