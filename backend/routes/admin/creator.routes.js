const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  getAdminCreatorDashboard,
  getAdminCreatorList,
  getAdminRedeemRequests,
  approveRedeem,
  rejectRedeem,
  addCreatorPoints,
  removeCreatorPoints,
  verifyCreator,
  removeCreatorVerification,
} = require("../../controllers/admin.creator.controller");

// Admin Creator Dashboard
router.get("/dashboard", isAdmin, getAdminCreatorDashboard);

// Admin Creator List
router.get("/list", isAdmin, getAdminCreatorList);

// Admin Points Adjustments
router.post("/points/add", isAdmin, addCreatorPoints);
router.post("/points/remove", isAdmin, removeCreatorPoints);

// Admin Verification Management
router.put("/verify", isAdmin, verifyCreator);
router.put("/remove-verification", isAdmin, removeCreatorVerification);

module.exports = router;
