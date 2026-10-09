const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const {
  createOrder,
  verifyPayment,
  verifyApplePayment,
} = require("../../controllers/payment.controller");

router.post("/create-order", isAuth, createOrder);
router.post("/verify", isAuth, verifyPayment);
router.post("/verify-apple", isAuth, verifyApplePayment);
router.post("/apple-verify", isAuth, verifyApplePayment);
router.post("/apple/verify", isAuth, verifyApplePayment);

module.exports = router;