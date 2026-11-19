const Subscription = require("../models/subscription.model");

// ========================================
// AUTO EXPIRE SUBSCRIPTION
// ========================================
const expireSubscriptionIfNeeded = async (
  subscription
) => {
  try {

    if (!subscription) {
      return null;
    }

    const now = new Date();

    // expire subscription automatically
    if (
      subscription.status === "active" &&
      subscription.endDate &&
      now > subscription.endDate
    ) {

      subscription.status = "expired";

      await subscription.save();
    }

    return subscription;

  } catch (error) {

    console.error(
      "Expire Subscription Error:",
      error
    );

    return subscription;
  }
};

// ========================================
// CHECK IF PLAN / SUBSCRIPTION IS VERIFICATION (ORANGE/BLUE TICK)
// ========================================
const isVerificationPlanOrSub = (subOrPlan) => {
  if (!subOrPlan) return false;
  const plan = subOrPlan.plan || subOrPlan;
  const category = String(plan?.category || "").toUpperCase();
  if (category === "ORANGETICK" || category === "BLUETICK") return true;

  const planName = String(plan?.name || "").toLowerCase();
  if (
    planName.includes("orange") ||
    planName.includes("blue tick") ||
    planName.includes("verification")
  ) {
    return true;
  }

  const appleProductId = String(
    plan?.appleProductId || subOrPlan?.appleDetails?.productId || ""
  ).toLowerCase();
  if (
    appleProductId.includes("orangetick") ||
    appleProductId.includes("bluetick")
  ) {
    return true;
  }

  return false;
};

module.exports = {
  expireSubscriptionIfNeeded,
  isVerificationPlanOrSub,
};