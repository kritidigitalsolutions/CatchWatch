const express = require("express");
const router = express.Router();

const {
  createPlan,
  updatePlan,
  deletePlan,
  getAllPlans,
  scanAppleProductInfo,
  scheduleApplePlanPrice,
  cancelAppleScheduledPrice,
  syncPriceFromApple,
} = require("../../controllers/admin/plan.controller");

const { isAdmin } = require("../../middlewares/admin.middleware");

// ================= ADMIN PLAN ROUTES =================

router.post("/", isAdmin, createPlan);
router.get("/", isAdmin, getAllPlans);

// Apple In-App Purchase pricing management routes
router.post("/apple/scan", isAdmin, scanAppleProductInfo);
router.post("/:id/apple-price/schedule", isAdmin, scheduleApplePlanPrice);
router.delete("/:id/apple-price/cancel", isAdmin, cancelAppleScheduledPrice);
router.post("/:id/sync-price-from-apple", isAdmin, syncPriceFromApple);

router.patch("/:id", isAdmin, updatePlan);
router.delete("/:id", isAdmin, deletePlan);

module.exports = router;