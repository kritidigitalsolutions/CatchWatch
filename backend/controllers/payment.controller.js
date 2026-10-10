const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");

const Plan = require("../models/plan.model");
const Promo = require("../models/promocode.model");
const Subscription = require("../models/subscription.model");
const VerificationRequest = require("../models/verificationRequest.model");

const {
  expireSubscriptionIfNeeded,
} = require("../utils/subscription.helper");
const {
  verifyApplePurchase,
} = require("../utils/applePayment.helper");
// =====================================================
// CREATE ORDER
// =====================================================
exports.createOrder = async (
  req,
  res
) => {
  try {

    const {
      planId,
      promoCode,
    } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId required",
      });
    }

    const plan =
      await Plan.findById(planId);

    if (
      !plan ||
      !plan.isActive
    ) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    let finalAmount = plan.price;

    let appliedPromo = null;

    // ========================================
    // APPLY PROMO
    // ========================================

    if (promoCode) {

      const promo =
        await Promo.findOne({
          code:
            promoCode.toUpperCase(),
          isActive: true,
        });

      if (!promo) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid promo code",
        });
      }

      // promo expired
      if (
        promo.expiryDate &&
        promo.expiryDate <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Promo expired",
        });
      }

      // promo limit
      if (
        promo.usedCount >=
        promo.maxUses
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo limit reached",
        });
      }

      // applicable plans
      if (
        promo.applicablePlans
          .length &&
        !promo.applicablePlans.some(
          (id) =>
            id.toString() ===
            planId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Promo not valid for this plan",
        });
      }

      let discount = 0;

      if (
        promo.discountType ===
        "percentage"
      ) {

        discount =
          (
            plan.price *
            promo.discountValue
          ) / 100;

      } else {

        discount =
          promo.discountValue;
      }

      finalAmount = Math.max(
        plan.price - discount,
        0
      );

      appliedPromo = promo.code;
    }

    // ========================================
    // RAZORPAY CONFIG
    // ========================================

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message:
          "Payment gateway not configured",
      });
    }

    // ========================================
    // CREATE ORDER
    // ========================================

    const order =
      await razorpay.orders.create({
        amount:
          finalAmount * 100,
        currency: "INR",
        receipt:
          "rcpt_" + Date.now(),

        notes: {
          planId,
          userId: req.user.id,
          promoCode:
            appliedPromo || "",
        },
      });

    res.status(200).json({
      success: true,
      key:
        process.env
          .RAZORPAY_KEY_ID,
      order,
      finalAmount,
    });

  } catch (err) {

    console.error(
      "Create Order Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// =====================================================
// VERIFY PAYMENT
// =====================================================
exports.verifyPayment = async (
  req,
  res
) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      // Gracefully delegate if Apple In-App Purchase data is supplied
      if (
        req.body.serverVerificationData ||
        req.body.receiptData ||
        req.body.jwsRepresentation ||
        (req.body.transactionId && !req.body.razorpay_signature)
      ) {
        return exports.verifyApplePayment(req, res);
      }

      return res.status(400).json({
        success: false,
        message:
          "Missing required payment fields",
      });
    }

    // ========================================
    // VERIFY SIGNATURE
    // ========================================

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(body)
        .digest("hex");

    if (
      expectedSignature !==
      razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification failed",
      });
    }

    const userId = req.user?.id || req.user?._id;

    // ========================================
    // PREVENT DUPLICATE PAYMENT
    // ========================================

    const alreadyPaid =
      await Subscription.findOne({
        paymentId:
          razorpay_payment_id,
      });

    if (alreadyPaid) {
      return res.status(200).json({
        success: true,
        message:
          "Payment already processed",
        subscription:
          alreadyPaid,
      });
    }

    // ========================================
    // GET PLAN
    // ========================================

    const plan =
      await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const isOrangeOrBlueTick =
      plan.category === "ORANGETICK" ||
      plan.category === "BLUETICK" ||
      plan.type === "ORANGETICK" ||
      plan.type === "BLUETICK" ||
      plan.planType === "ORANGETICK" ||
      plan.planType === "BLUETICK";

    // ========================================
    // CHECK EXISTING SUBSCRIPTION (Only for video streaming plans, skip for ORANGETICK / BLUETICK)
    // ========================================

    if (!isOrangeOrBlueTick) {
      let existing =
        await Subscription.findOne({
          user: userId,
          status: "active",
        });

      existing =
        await expireSubscriptionIfNeeded(
          existing
        );

      if (
        existing &&
        existing.status ===
          "active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You already have an active subscription",
        });
      }
    }

    let finalAmount =
      plan.price;

    let appliedCode = "";

    // ========================================
    // FETCH ORDER DETAILS (Safely)
    // ========================================

    if (razorpay) {
      try {
        const orderDetails =
          await razorpay.orders.fetch(
            razorpay_order_id
          );
        appliedCode =
          orderDetails?.notes?.promoCode || "";
      } catch (fetchErr) {
        console.warn("Could not fetch order from Razorpay API, proceeding with verified signature:", fetchErr.message);
      }
    }

    // ========================================
    // APPLY PROMO
    // ========================================

    if (appliedCode) {

      const promo =
        await Promo.findOne({
          code:
            appliedCode.toUpperCase(),
          isActive: true,
        });

      if (promo) {

        let discount = 0;

        if (
          promo.discountType ===
          "percentage"
        ) {

          discount =
            (
              plan.price *
              promo.discountValue
            ) / 100;

        } else {

          discount =
            promo.discountValue;
        }

        finalAmount = Math.max(
          plan.price - discount,
          0
        );

        promo.usedCount += 1;

        await promo.save();
      }
    }

    // ========================================
    // CREATE SUBSCRIPTION
    // ========================================

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setUTCDate(
      endDate.getUTCDate() +
        (plan.duration || 30)
    );

    const subscription =
      await Subscription.create({
        user: userId,
        plan: plan._id,
        status: "active",

        paymentId:
          razorpay_payment_id,

        subscriptionId:
          razorpay_order_id,

        amount: finalAmount,

        startDate,
        endDate,
      });

    try {
      const { notifySubscriptionStatus } = require("../utils/notificationDispatcher.helper");
      if (notifySubscriptionStatus) {
        notifySubscriptionStatus(userId, "ACTIVE", plan.name).catch((e) =>
          console.log("Sub active notif err:", e.message)
        );
      }
    } catch (e) {
      console.log("Sub notif dispatcher err:", e.message);
    }

    res.status(200).json({
      success: true,
      message:
        "Payment verified",
      subscription,
    });

  } catch (err) {

    console.error(
      "Verify Payment Error:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================================
// VERIFY APPLE PAYMENT (StoreKit 1 & StoreKit 2)
// =====================================================
exports.verifyApplePayment = async (req, res) => {
  try {
    const {
      serverVerificationData,
      receiptData,
      receipt,
      signedPayload,
      jwsRepresentation,
      productId,
      appleProductId,
      transactionId,
      originalTransactionId,
      planId,
      promoCode,
    } = req.body;

    const verificationPayload =
      serverVerificationData ||
      receiptData ||
      receipt ||
      signedPayload ||
      jwsRepresentation ||
      "";

    const clientProductId = productId || appleProductId || "";
    const clientTransactionId = transactionId ? String(transactionId).trim() : "";
    const clientOriginalTxId = originalTransactionId
      ? String(originalTransactionId).trim()
      : "";

    if (!verificationPayload && !clientTransactionId && !clientProductId && !planId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Apple purchase verification data (serverVerificationData or App Store receipt is required)",
      });
    }

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 1. Cryptographically Verify Apple transaction using StoreKit helper
    const verification = await verifyApplePurchase({
      serverVerificationData: verificationPayload,
      productId: clientProductId,
      transactionId: clientTransactionId,
      originalTransactionId: clientOriginalTxId,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        message: verification.message || "Apple purchase verification failed",
      });
    }

    const resolvedTransactionId = String(verification.transactionId || "").trim();
    const resolvedOriginalTransactionId = String(
      verification.originalTransactionId || resolvedTransactionId || ""
    ).trim();
    const verifiedProductId = String(verification.productId || "").trim();

    if (!resolvedTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Could not resolve valid transaction ID from Apple verification",
      });
    }

    // 2. Prevent Duplicate Payment & Verify Transaction Ownership
    const existingTx = await Subscription.findOne({
      paymentId: resolvedTransactionId,
    }).populate("plan");

    if (existingTx) {
      // Idempotent retry for the same authenticated user
      if (existingTx.user.toString() === userId.toString()) {
        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          subscription: existingTx,
          verification: {
            transactionId: resolvedTransactionId,
            originalTransactionId: resolvedOriginalTransactionId,
            productId: verifiedProductId,
            environment: verification.environment || "Production",
          },
        });
      }

      // Conflict: Transaction belongs to a different account
      return res.status(409).json({
        success: false,
        code: "TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT",
        message:
          "This Apple transaction is already associated with another Catch & Watch account. Cross-account transfer is not permitted.",
      });
    }

    // Verify originalTransactionId ownership across active subscriptions
    if (
      resolvedOriginalTransactionId &&
      resolvedOriginalTransactionId !== resolvedTransactionId
    ) {
      const existingOriginalTx = await Subscription.findOne({
        subscriptionId: resolvedOriginalTransactionId,
        status: "active",
      }).populate("plan");

      if (existingOriginalTx) {
        if (existingOriginalTx.user.toString() !== userId.toString()) {
          return res.status(409).json({
            success: false,
            code: "ORIGINAL_TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT",
            message:
              "The original Apple subscription is already associated with another active Catch & Watch account.",
          });
        }
      }
    }

    // 3. Resolve & Verify Plan against Verified Product ID
    let plan = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      plan = await Plan.findById(planId);
      if (plan && plan.appleProductId && plan.appleProductId !== verifiedProductId) {
        return res.status(400).json({
          success: false,
          message: `Requested plan '${plan.name}' appleProductId (${plan.appleProductId}) does not match verified Apple product ID (${verifiedProductId}).`,
        });
      }
    }

    if (!plan && verifiedProductId) {
      plan = await Plan.findOne({
        appleProductId: verifiedProductId,
        isActive: true,
      });
      if (!plan) {
        plan = await Plan.findOne({ appleProductId: verifiedProductId });
      }
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: `Plan not found for Apple product ID '${verifiedProductId || planId}'. Please configure appleProductId in Admin panel.`,
      });
    }

    const isOrangeOrBlueTick =
      plan.category === "BLUETICK" ||
      plan.category === "ORANGETICK" ||
      plan.type === "BLUETICK" ||
      plan.type === "ORANGETICK" ||
      plan.planType === "BLUETICK" ||
      plan.planType === "ORANGETICK";

    // 4. Check existing subscription (for regular video streaming plans)
    if (!isOrangeOrBlueTick) {
      let existing = await Subscription.findOne({
        user: userId,
        status: "active",
      });

      existing = await expireSubscriptionIfNeeded(existing);

      if (existing && existing.status === "active") {
        if (
          resolvedOriginalTransactionId &&
          (existing.subscriptionId === resolvedOriginalTransactionId ||
            existing.paymentId === resolvedTransactionId)
        ) {
          return res.status(200).json({
            success: true,
            message: "Subscription is already active",
            subscription: existing,
          });
        }

        return res.status(400).json({
          success: false,
          message: "You already have an active subscription",
        });
      }
    }

    // 5. Apply Promo atomically (if applicable)
    let finalAmount = plan.price;
    if (promoCode) {
      const promo = await Promo.findOne({
        code: String(promoCode).toUpperCase().trim(),
        isActive: true,
      });

      if (promo && (!promo.expiryDate || promo.expiryDate >= new Date())) {
        const updatedPromo = await Promo.findOneAndUpdate(
          { _id: promo._id, usedCount: { $lt: promo.maxUses } },
          { $inc: { usedCount: 1 } },
          { new: true }
        );
        if (updatedPromo) {
          let discount = 0;
          if (promo.discountType === "percentage") {
            discount = (plan.price * promo.discountValue) / 100;
          } else {
            discount = promo.discountValue;
          }
          finalAmount = Math.max(plan.price - discount, 0);
        }
      }
    }

    // 6. Calculate Start and End Dates
    const startDate = verification.purchaseDate || new Date();
    let endDate;
    if (verification.expiresDate && new Date(verification.expiresDate) > startDate) {
      endDate = new Date(verification.expiresDate);
    } else {
      endDate = new Date(startDate);
      endDate.setUTCDate(
        endDate.getUTCDate() + (plan.duration || 30)
      );
    }

    // 7. Create Subscription record with Concurrency / Duplicate-key protection
    let subscription;
    try {
      subscription = await Subscription.create({
        user: userId,
        plan: plan._id,
        status: "active",
        paymentGateway: "apple",
        paymentId: resolvedTransactionId,
        subscriptionId: resolvedOriginalTransactionId,
        appleDetails: {
          transactionId: resolvedTransactionId,
          originalTransactionId: resolvedOriginalTransactionId,
          productId: verifiedProductId,
          environment: verification.environment || "Production",
          purchaseDate: startDate,
          expiresDate: endDate,
        },
        amount: finalAmount,
        currency: "INR",
        startDate,
        endDate,
      });
    } catch (createErr) {
      if (createErr.code === 11000 || createErr.name === "MongoServerError") {
        const retrySub = await Subscription.findOne({
          paymentId: resolvedTransactionId,
        }).populate("plan");

        if (retrySub) {
          if (retrySub.user.toString() === userId.toString()) {
            return res.status(200).json({
              success: true,
              message: "Payment verified successfully",
              subscription: retrySub,
              verification: {
                transactionId: resolvedTransactionId,
                originalTransactionId: resolvedOriginalTransactionId,
                productId: verifiedProductId,
                environment: verification.environment || "Production",
              },
            });
          }
          return res.status(409).json({
            success: false,
            code: "TRANSACTION_OWNED_BY_ANOTHER_ACCOUNT",
            message:
              "This Apple transaction is already associated with another Catch & Watch account.",
          });
        }
      }
      throw createErr;
    }

    // 8. Link to Pending Verification Request if this is Orange Tick / Blue Tick
    if (isOrangeOrBlueTick) {
      try {
        const pendingVR = await VerificationRequest.findOne({
          userId,
          status: "PENDING",
        });
        if (pendingVR) {
          pendingVR.paymentId = resolvedTransactionId;
          pendingVR.orderId = resolvedOriginalTransactionId;
          pendingVR.paymentGateway = "apple";
          pendingVR.paymentStatus = "PAID";
          pendingVR.appleDetails = {
            transactionId: resolvedTransactionId,
            originalTransactionId: resolvedOriginalTransactionId,
            productId: verifiedProductId,
            environment: verification.environment || "Production",
            purchaseDate: startDate,
          };
          pendingVR.selectedPlan = {
            planId: plan._id,
            name: plan.name,
            price: plan.price,
            duration: plan.duration,
            paymentId: resolvedTransactionId,
            orderId: resolvedOriginalTransactionId,
          };
          await pendingVR.save();
        }
      } catch (vrErr) {
        console.warn("Could not link verification request with Apple payment:", vrErr.message);
      }
    }

    // 9. Trigger Notification
    try {
      const { notifySubscriptionStatus } = require("../utils/notificationDispatcher.helper");
      if (notifySubscriptionStatus) {
        notifySubscriptionStatus(userId, "ACTIVE", plan.name).catch((e) =>
          console.log("Apple sub notif err:", e.message)
        );
      }
    } catch (e) {
      console.log("Apple sub dispatcher err:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: "Apple payment verified successfully",
      subscription,
      verification: {
        transactionId: resolvedTransactionId,
        originalTransactionId: resolvedOriginalTransactionId,
        productId: verifiedProductId,
        environment: verification.environment || "Production",
      },
    });
  } catch (err) {
    console.error("Verify Apple Payment Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify Apple payment",
    });
  }
};