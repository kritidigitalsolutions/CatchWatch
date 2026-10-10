const express = require("express");
const router = express.Router();
const {
  getAllApplePayments,
  verifySingleAppleTransaction,
} = require("../../controllers/admin/applePayment.controller");
const { isAdmin } = require("../../middlewares/admin.middleware");

// ========================================
// 🍏 ADMIN APPLE PAYMENTS & STOREKIT VERIFICATION
// ========================================

// 1. Get all Apple payments & stats
router.get("/all", isAdmin, getAllApplePayments);

// 2. Verify / Inspect single Apple transaction or StoreKit 2 JWS token
router.post("/verify-single", isAdmin, verifySingleAppleTransaction);

module.exports = router;
