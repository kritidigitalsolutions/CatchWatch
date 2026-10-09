const express = require("express");
const router = express.Router();

const {
  getPlans,
  getBluetickPlans,
} = require("../../controllers/plan.controller");

// ================= USER PLAN ROUTES =================

// Get all standard subscription plans
router.get("/", getPlans);

// Get active bluetick / verification plans
router.get("/bluetick", getBluetickPlans);
router.get("/orangetick", getBluetickPlans);

module.exports = router;