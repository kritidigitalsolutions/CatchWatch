const Plan = require("../../models/plan.model");
const {
  scanAppleProduct,
  scheduleApplePriceChange,
  cancelAppleScheduledPriceChange,
  isAppStoreConnectConfigured,
} = require("../../utils/appStoreConnect.helper");

// ==========================================
// CREATE PLAN (ADMIN)
// ==========================================
exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      price,
      duration,
      features,
      isActive,
      category,
      planType,
      sortOrder,
      isRecommended,
      appleProductId,
      appleSubscriptionId,
      appleCurrentPrice,
    } = req.body;

    const cleanAppleProductId =
      typeof appleProductId === "string" ? appleProductId.trim() : "";

    const plan = await Plan.create({
      name,
      price,
      duration,
      features,
      isActive,
      category: category || "SUBSCRIPTION",
      planType: planType || "monthly",
      sortOrder: sortOrder || 0,
      isRecommended: !!isRecommended,
      appleProductId: cleanAppleProductId,
      appleSubscriptionId: appleSubscriptionId || "",
      appleCurrentPrice:
        appleCurrentPrice !== undefined ? Number(appleCurrentPrice) : null,
      applePriceStatus: cleanAppleProductId ? "ACTIVE" : "NOT_SYNCED",
      appleLastSyncedAt: cleanAppleProductId ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// UPDATE PLAN (ADMIN)
// ==========================================
exports.updatePlan = async (req, res) => {
  try {
    if (typeof req.body.appleProductId === "string") {
      req.body.appleProductId = req.body.appleProductId.trim();
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: "Plan updated successfully",
      plan,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// DELETE PLAN (ADMIN)
// ==========================================
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// GET ALL PLANS (ADMIN)
// ==========================================
exports.getAllPlans = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) {
      if (category === "ORANGETICK" || category === "BLUETICK") {
        query.category = { $in: ["ORANGETICK", "BLUETICK"] };
      } else {
        query.category = category;
      }
    }
    const plans = await Plan.find(query).sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      count: plans.length,
      isAppleApiConfigured: isAppStoreConnectConfigured(),
      plans,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// SCAN & MATCH APPLE IN-APP PURCHASE PRODUCT
// ==========================================
exports.scanAppleProductInfo = async (req, res) => {
  try {
    const { productId, planId } = req.body;

    if (!productId || !productId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Apple Product ID is required to scan.",
      });
    }

    const scanResult = await scanAppleProduct(productId.trim());

    // If planId provided, sync scanned metadata into the Plan document
    let updatedPlan = null;
    if (planId) {
      updatedPlan = await Plan.findByIdAndUpdate(
        planId,
        {
          appleProductId: scanResult.productId,
          appleSubscriptionId: scanResult.appleSubscriptionId,
          appleCurrentPrice: scanResult.currentPrice,
          appleScheduledPrice: scanResult.scheduledPrice,
          appleScheduledDate: scanResult.scheduledDate || "",
          appleScheduledPriceId: scanResult.scheduledPriceId || "",
          applePriceStatus: scanResult.status,
          appleLastSyncedAt: new Date(),
        },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Apple product scanned successfully. Found current price: ₹${scanResult.currentPrice}.`,
      scanResult,
      plan: updatedPlan,
    });
  } catch (err) {
    console.error("Scan Apple Product Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to scan Apple In-App Purchase product",
    });
  }
};

// ==========================================
// SCHEDULE APPLE SUBSCRIPTION PRICE CHANGE
// ==========================================
exports.scheduleApplePlanPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pricePointId,
      customerPrice,
      startDate,
      preserveCurrentSubscribers,
    } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    if (!plan.appleProductId) {
      return res.status(400).json({
        success: false,
        message: "Plan does not have an Apple Product ID configured.",
      });
    }

    if (!pricePointId || !customerPrice) {
      return res.status(400).json({
        success: false,
        message: "Price Point ID and target Customer Price are required.",
      });
    }

    const subscriptionId =
      plan.appleSubscriptionId ||
      `apple_sub_${plan.appleProductId.replace(/[^a-zA-Z0-9]/g, "_")}`;

    const scheduleResult = await scheduleApplePriceChange({
      subscriptionId,
      pricePointId,
      newCustomerPrice: customerPrice,
      startDate: startDate || null,
      preserveCurrentSubscribers: preserveCurrentSubscribers !== false,
    });

    // Update Plan document with scheduled details
    plan.appleScheduledPrice = Number(customerPrice);
    plan.appleScheduledDate = startDate || "Immediate";
    plan.appleScheduledPriceId = scheduleResult.priceId || "";
    plan.applePriceStatus = "SCHEDULED";
    plan.appleLastSyncedAt = new Date();

    // If immediate change, update the current live price immediately
    if (!startDate || startDate === "Immediate") {
      plan.appleCurrentPrice = Number(customerPrice);
      plan.applePriceStatus = "ACTIVE";
    }

    await plan.save();

    return res.status(200).json({
      success: true,
      message: `Apple price change scheduled successfully for ₹${customerPrice} (${startDate || "Immediate"}).`,
      scheduleResult,
      plan,
    });
  } catch (err) {
    console.error("Schedule Apple Price Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to schedule price change on Apple",
    });
  }
};

// ==========================================
// CANCEL APPLE SCHEDULED PRICE CHANGE
// ==========================================
exports.cancelAppleScheduledPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    if (plan.appleScheduledPriceId) {
      await cancelAppleScheduledPriceChange(plan.appleScheduledPriceId);
    }

    plan.appleScheduledPrice = null;
    plan.appleScheduledDate = "";
    plan.appleScheduledPriceId = "";
    plan.applePriceStatus = "CANCELLED";
    plan.appleLastSyncedAt = new Date();

    await plan.save();

    return res.status(200).json({
      success: true,
      message: "Scheduled price change cancelled successfully.",
      plan,
    });
  } catch (err) {
    console.error("Cancel Apple Price Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to cancel scheduled price change",
    });
  }
};

// ==========================================
// 1-CLICK SYNC BACKEND PLAN PRICE FROM APPLE LIVE PRICE
// ==========================================
exports.syncPriceFromApple = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    if (!plan.appleProductId) {
      return res.status(400).json({
        success: false,
        message: "Plan does not have an Apple Product ID configured.",
      });
    }

    // Scan latest live price from Apple
    const scan = await scanAppleProduct(plan.appleProductId);
    const appleLivePrice = scan.currentPrice;

    if (!appleLivePrice || isNaN(appleLivePrice)) {
      return res.status(400).json({
        success: false,
        message: "Could not retrieve live price from Apple.",
      });
    }

    const previousPrice = plan.price;
    plan.price = Number(appleLivePrice);
    plan.appleCurrentPrice = Number(appleLivePrice);
    plan.appleSubscriptionId = scan.appleSubscriptionId || plan.appleSubscriptionId;
    plan.applePriceStatus = scan.status || "ACTIVE";
    plan.appleLastSyncedAt = new Date();

    await plan.save();

    return res.status(200).json({
      success: true,
      message: `Plan price updated from ₹${previousPrice} to match Apple live price ₹${appleLivePrice}!`,
      plan,
    });
  } catch (err) {
    console.error("Sync Price From Apple Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to sync price from Apple",
    });
  }
};