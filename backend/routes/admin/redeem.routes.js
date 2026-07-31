const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  getAdminRedeemRequests,
  approveRedeem,
  rejectRedeem,
} = require("../../controllers/admin.creator.controller");

// Admin Redeem List
router.get("/", isAdmin, getAdminRedeemRequests);

// Admin Approve Redeem
router.put("/:id/approve", isAdmin, approveRedeem);

// Admin Reject Redeem
router.put("/:id/reject", isAdmin, rejectRedeem);

module.exports = router;
