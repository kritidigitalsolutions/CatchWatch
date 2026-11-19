const mongoose = require("mongoose");
const User = require("../models/user.model");
const VerificationRequest = require("../models/verificationRequest.model");
const Notification = require("../models/notification.model");
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");

const getFilePath = (file) => {
  if (!file) return "";
  if (file.path) return file.path.replace(/\\/g, "/");
  if (file.cdnUrl) return file.cdnUrl;
  return "";
};

const normalizeGovernmentIdType = (type) => {
  if (!type) return "Aadhaar";
  const str = String(type).trim();
  const lower = str.toLowerCase();
  if (lower.includes("aadha") || lower.includes("adhar")) return "Aadhaar";
  if (lower.includes("pan")) return "PAN";
  if (lower.includes("passport")) return "Passport";
  if (lower.includes("driving") || lower.includes("license") || lower.includes("licence")) return "Driving License";
  if (lower.includes("voter")) return "Voter ID";
  return str;
};

/**
 * Helper to dynamically enrich a VerificationRequest with linked Subscription
 * and complete Apple IAP or Razorpay payment details.
 */
async function enrichVerificationWithPaymentDetails(requestDoc) {
  if (!requestDoc) return null;
  const doc = requestDoc.toObject ? requestDoc.toObject() : { ...requestDoc };
  const userId = doc.userId?._id || doc.userId;

  let sub = null;
  const txId = doc.appleDetails?.transactionId || doc.paymentId;
  if (txId) {
    sub = await Subscription.findOne({
      $or: [
        { paymentId: txId },
        { subscriptionId: txId },
        { "appleDetails.transactionId": txId },
      ],
    })
      .populate("plan", "name price duration appleProductId category")
      .lean();
  }

  if (!sub && userId) {
    // Specifically search for user's active Orange / Blue Tick verification subscription
    sub = await Subscription.findOne({
      user: userId,
      status: "active",
    })
      .populate("plan", "name price duration appleProductId category")
      .sort({ createdAt: -1 })
      .lean();

    if (
      sub &&
      sub.plan &&
      sub.plan.category !== "ORANGETICK" &&
      sub.plan.category !== "BLUETICK"
    ) {
      sub = null;
    }
  }

  // 1. Determine if this is Apple payment
  const hasAppleTxId = Boolean(
    (doc.appleDetails?.transactionId && /^\d{10,}$/.test(String(doc.appleDetails.transactionId).trim())) ||
    (doc.paymentId && /^\d{10,}$/.test(String(doc.paymentId).trim())) ||
    (sub?.appleDetails?.transactionId && /^\d{10,}$/.test(String(sub.appleDetails.transactionId).trim())) ||
    (sub?.paymentId && /^\d{10,}$/.test(String(sub.paymentId).trim()))
  );

  const rawGateway =
    doc.paymentGateway ||
    sub?.paymentGateway ||
    (hasAppleTxId ? "apple" : doc.paymentId?.startsWith("pay_") ? "razorpay" : "");

  const isApple =
    rawGateway === "apple" ||
    sub?.paymentGateway === "apple" ||
    Boolean(doc.appleDetails?.transactionId) ||
    Boolean(sub?.appleDetails?.transactionId) ||
    hasAppleTxId;

  const resolvedGateway = isApple
    ? "apple"
    : (rawGateway || (doc.paymentId?.startsWith("pay_") ? "razorpay" : "apple"));

  // 2. Resolve verified transaction ID
  const resolvedTxId = String(
    doc.appleDetails?.transactionId ||
    (isApple && hasAppleTxId ? doc.paymentId : "") ||
    sub?.appleDetails?.transactionId ||
    (sub?.paymentGateway === "apple" ? sub?.paymentId : "") ||
    doc.paymentId ||
    ""
  ).trim();

  // 3. Resolve Apple originalTransactionId (NEVER allow internal orderId like order_...)
  let resolvedOrigTxId = "";
  if (isApple) {
    const candidateOrigs = [
      doc.appleDetails?.originalTransactionId,
      sub?.appleDetails?.originalTransactionId,
      (sub?.paymentGateway === "apple" && sub?.subscriptionId ? sub.subscriptionId : ""),
    ];

    for (const cand of candidateOrigs) {
      if (cand && !String(cand).startsWith("order_") && !String(cand).startsWith("ord_")) {
        resolvedOrigTxId = String(cand).trim();
        break;
      }
    }

    if (!resolvedOrigTxId && resolvedTxId) {
      resolvedOrigTxId = resolvedTxId;
    }
  } else {
    resolvedOrigTxId = String(
      doc.appleDetails?.originalTransactionId ||
      sub?.appleDetails?.originalTransactionId ||
      ""
    ).trim();
  }

  // 4. Resolve internal orderId (Stored separately, e.g. order_U1xpedRj23PZ8T)
  let resolvedOrderId = "";
  if (doc.orderId && !/^\d{10,}$/.test(String(doc.orderId).trim())) {
    resolvedOrderId = String(doc.orderId).trim();
  } else if (sub?.subscriptionId && String(sub.subscriptionId).startsWith("order_")) {
    resolvedOrderId = String(sub.subscriptionId).trim();
  } else if (doc.selectedPlan?.orderId && !/^\d{10,}$/.test(String(doc.selectedPlan.orderId).trim())) {
    resolvedOrderId = String(doc.selectedPlan.orderId).trim();
  }

  // 5. Resolve verified product ID
  const resolvedProductId = String(
    doc.appleDetails?.productId ||
    sub?.appleDetails?.productId ||
    doc.selectedPlan?.planId?.appleProductId ||
    sub?.plan?.appleProductId ||
    "com.app.catchWatch.creator.orangetick"
  ).trim();

  // 6. Resolve environment
  const resolvedEnv = String(
    doc.appleDetails?.environment ||
    sub?.appleDetails?.environment ||
    (resolvedTxId && String(resolvedTxId).startsWith("2") ? "Production" : "Sandbox")
  ).trim();

  // 7. Resolve dates
  const resolvedPurchaseDate =
    doc.appleDetails?.purchaseDate ||
    sub?.appleDetails?.purchaseDate ||
    sub?.startDate ||
    doc.createdAt ||
    new Date();

  const resolvedExpiresDate =
    doc.appleDetails?.expiresDate ||
    sub?.appleDetails?.expiresDate ||
    sub?.endDate ||
    null;

  // 8. Payment status: MUST BE CONSISTENT at both levels
  const isPaid = Boolean(
    doc.paymentStatus === "PAID" ||
    doc.isPaid ||
    sub?.status === "active" ||
    (doc.paymentId && String(doc.paymentId).trim()) ||
    Boolean(resolvedTxId)
  );
  const resolvedPaymentStatus = isPaid ? "PAID" : "UNPAID";

  // Align application-level fields
  doc.paymentStatus = resolvedPaymentStatus;
  doc.paymentGateway = resolvedGateway;
  doc.isPaid = isPaid;
  doc.orderId = resolvedOrderId;
  if (resolvedTxId) {
    doc.paymentId = resolvedTxId;
  }

  // Application-level appleDetails
  if (isApple) {
    doc.appleDetails = {
      transactionId: resolvedTxId,
      originalTransactionId: resolvedOrigTxId,
      productId: resolvedProductId,
      environment: resolvedEnv,
      purchaseDate: resolvedPurchaseDate,
      expiresDate: resolvedExpiresDate,
    };
  }

  // Nested paymentInfo object - EXACT MATCH with application level
  doc.paymentInfo = {
    paymentGateway: resolvedGateway,
    paymentStatus: resolvedPaymentStatus,
    transactionId: resolvedTxId,
    originalTransactionId: resolvedOrigTxId,
    productId: resolvedProductId,
    appleProductId: resolvedProductId,
    environment: resolvedEnv,
    amount: doc.selectedPlan?.price || sub?.amount || sub?.plan?.price || 0,
    currency: sub?.currency || "INR",
    purchaseDate: resolvedPurchaseDate,
    expiresDate: resolvedExpiresDate,
    expiryDate: resolvedExpiresDate,
    orderId: resolvedOrderId,
    isApple,
    subscriptionStatus: sub?.status || (isPaid ? "active" : "unpaid"),
    linkedSubscriptionId: sub?._id || null,
  };

  // Populate plan and planId for Flutter models
  const planObj = doc.selectedPlan?.planId
    ? (doc.selectedPlan.planId.name ? doc.selectedPlan.planId : {
        _id: doc.selectedPlan.planId,
        name: doc.selectedPlan.name,
        price: doc.selectedPlan.price,
        duration: doc.selectedPlan.duration,
      })
    : sub?.plan
    ? sub.plan
    : null;

  if (planObj) {
    doc.plan = planObj;
    doc.planId = planObj;
  }

  // Ensure Flutter's user field is populated
  doc.user = doc.user || doc.userId?._id || doc.userId;

  return doc;
}

// ========================================
// USER: APPLY VERIFICATION
// ========================================
exports.applyVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      username,
      governmentIdType,
      governmentIdNumber,
      website,
      instagram,
      facebook,
      youtube,
      twitter,
      linkedin,
      reason,
      confirmation,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.verification?.isVerified || user.verification?.status === "VERIFIED") {
      return res.status(400).json({
        success: false,
        message: "Your profile is already verified",
      });
    }

    // Check for existing pending request
    const existingPending = await VerificationRequest.findOne({
      userId,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have an active verification request under review",
      });
    }

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full Name is required",
      });
    }

    if (!governmentIdType) {
      return res.status(400).json({
        success: false,
        message: "Government ID Type is required",
      });
    }

    const files = req.files || {};
    const idFrontFile = files.idFront ? files.idFront[0] : null;
    const idBackFile = files.idBack ? files.idBack[0] : null;
    const selfieFile = files.selfie ? files.selfie[0] : null;

    // Check for previous request in DB as fallback for documents
    const previousReq = await VerificationRequest.findOne({ userId }).sort({ createdAt: -1 });

    const idFront =
      getFilePath(idFrontFile) ||
      (typeof req.body.idFront === "string" ? req.body.idFront.trim() : "") ||
      req.body.idFrontUrl ||
      req.body.idFrontPath ||
      previousReq?.idFront ||
      "";

    const idBack =
      getFilePath(idBackFile) ||
      (typeof req.body.idBack === "string" ? req.body.idBack.trim() : "") ||
      req.body.idBackUrl ||
      req.body.idBackPath ||
      previousReq?.idBack ||
      "";

    const selfie =
      getFilePath(selfieFile) ||
      (typeof req.body.selfie === "string" ? req.body.selfie.trim() : "") ||
      req.body.selfieUrl ||
      req.body.selfiePath ||
      previousReq?.selfie ||
      "";

    if (!idFront) {
      return res.status(400).json({
        success: false,
        message: "Front ID Image is required",
      });
    }

    if (!selfie) {
      return res.status(400).json({
        success: false,
        message: "Selfie Photo is required",
      });
    }

    let userUsername = username || user.username || "";
    if (userUsername && !userUsername.startsWith("@")) {
      userUsername = "@" + userUsername;
    }

    let clientPaymentId =
      req.body.paymentId ||
      req.body.razorpay_payment_id ||
      req.body.transactionId ||
      "";
    let rawOrderId =
      req.body.orderId ||
      req.body.razorpay_order_id ||
      "";
    let rawOrigTxId =
      req.body.originalTransactionId ||
      req.body.appleOriginalTransactionId ||
      "";

    // Check if this payment transaction is already associated with another user
    let existingReqWithPayment = null;
    if (clientPaymentId) {
      existingReqWithPayment = await VerificationRequest.findOne({ paymentId: clientPaymentId });
      if (existingReqWithPayment) {
        if (existingReqWithPayment.userId.toString() !== userId.toString()) {
          return res.status(409).json({
            success: false,
            message: "This payment transaction is already associated with another verification request.",
          });
        }
        // If it's already active/pending under review for this user, return current status
        if (
          existingReqWithPayment.status === "PENDING" ||
          existingReqWithPayment.status === "pending"
        ) {
          const enriched = await enrichVerificationWithPaymentDetails(existingReqWithPayment);
          return res.status(200).json({
            success: true,
            message: "You already have an active verification request under review",
            request: enriched || existingReqWithPayment,
            application: enriched || existingReqWithPayment,
            latestRequest: enriched || existingReqWithPayment,
          });
        }
      }
    }

    const Plan = require("../models/plan.model");
    const Subscription = require("../models/subscription.model");

    // Retrieve verified linked subscription if paymentId provided or user has active Orange Tick
    let linkedSub = null;
    if (clientPaymentId) {
      linkedSub = await Subscription.findOne({
        $or: [
          { paymentId: clientPaymentId },
          { subscriptionId: clientPaymentId },
          { "appleDetails.transactionId": clientPaymentId },
        ],
      }).populate("plan");

      if (linkedSub && linkedSub.user.toString() !== userId.toString()) {
        return res.status(409).json({
          success: false,
          message: "This payment transaction is already associated with another account.",
        });
      }
    }

    if (!linkedSub) {
      const activeSubs = await Subscription.find({
        user: userId,
        status: "active",
      })
        .populate("plan")
        .sort({ createdAt: -1 });

      for (const s of activeSubs) {
        if (s.plan && (s.plan.category === "ORANGETICK" || s.plan.category === "BLUETICK")) {
          linkedSub = s;
          break;
        }
      }
    }

    // Resolve verified Apple payment metadata
    const hasAppleTxId = Boolean(
      (clientPaymentId && /^\d{10,}$/.test(String(clientPaymentId).trim())) ||
      (linkedSub?.appleDetails?.transactionId && /^\d{10,}$/.test(String(linkedSub.appleDetails.transactionId).trim())) ||
      (linkedSub?.paymentId && /^\d{10,}$/.test(String(linkedSub.paymentId).trim()))
    );

    const isApple = Boolean(
      linkedSub?.paymentGateway === "apple" ||
      Boolean(linkedSub?.appleDetails?.transactionId) ||
      hasAppleTxId ||
      req.body.appleProductId
    );

    const resolvedGateway = isApple
      ? "apple"
      : (linkedSub?.paymentGateway || (clientPaymentId.startsWith("pay_") ? "razorpay" : "apple"));

    const resolvedTxId = String(
      linkedSub?.appleDetails?.transactionId ||
      (isApple && hasAppleTxId ? clientPaymentId : "") ||
      linkedSub?.paymentId ||
      clientPaymentId ||
      ""
    ).trim();

    let resolvedOrigTxId = "";
    if (isApple) {
      const candidateOrigs = [
        linkedSub?.appleDetails?.originalTransactionId,
        rawOrigTxId,
        (linkedSub?.paymentGateway === "apple" && linkedSub?.subscriptionId ? linkedSub.subscriptionId : ""),
      ];
      for (const cand of candidateOrigs) {
        if (cand && !String(cand).startsWith("order_") && !String(cand).startsWith("ord_")) {
          resolvedOrigTxId = String(cand).trim();
          break;
        }
      }
      if (!resolvedOrigTxId && resolvedTxId) {
        resolvedOrigTxId = resolvedTxId;
      }
    }

    // Safe internal order ID (stored separately, NEVER mapped to originalTransactionId!)
    let safeOrderId = "";
    if (rawOrderId && !/^\d{10,}$/.test(String(rawOrderId).trim())) {
      safeOrderId = String(rawOrderId).trim();
    } else if (linkedSub?.subscriptionId && String(linkedSub.subscriptionId).startsWith("order_")) {
      safeOrderId = String(linkedSub.subscriptionId).trim();
    }

    const resolvedProductId = String(
      linkedSub?.appleDetails?.productId ||
      req.body.appleProductId ||
      req.body.productId ||
      linkedSub?.plan?.appleProductId ||
      "com.app.catchWatch.creator.orangetick"
    ).trim();

    const resolvedEnv = String(
      linkedSub?.appleDetails?.environment ||
      req.body.environment ||
      (resolvedTxId.startsWith("2") ? "Production" : "Sandbox")
    ).trim();

    const resolvedPurchaseDate =
      linkedSub?.appleDetails?.purchaseDate ||
      linkedSub?.startDate ||
      new Date();

    const resolvedExpiresDate =
      linkedSub?.appleDetails?.expiresDate ||
      linkedSub?.endDate ||
      null;

    const isPaid = Boolean(linkedSub || resolvedTxId);

    let selectedPlanData = null;
    let planId = req.body.planId || linkedSub?.plan?._id;

    if ((!planId || !mongoose.Types.ObjectId.isValid(planId)) && (req.body.appleProductId || req.body.productId)) {
      const appleProd = req.body.appleProductId || req.body.productId;
      const foundPlan = await Plan.findOne({ appleProductId: appleProd });
      if (foundPlan) planId = foundPlan._id;
    }

    let planDoc = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      planDoc = await Plan.findById(planId);
      if (planDoc) {
        selectedPlanData = {
          planId: planDoc._id,
          name: planDoc.name,
          price: planDoc.price,
          duration: planDoc.duration,
          paymentId: resolvedTxId,
          orderId: safeOrderId,
        };
      }
    }

    const finalGovIdType = normalizeGovernmentIdType(governmentIdType);

    // Check if user has an existing request to update (re-application after REJECTED / CANCELLED / etc.)
    let targetReq = existingReqWithPayment || null;
    if (!targetReq) {
      targetReq = await VerificationRequest.findOne({
        userId,
        status: {
          $in: [
            "REJECTED",
            "rejected",
            "CHANGES_REQUESTED",
            "changes_requested",
            "ACTION_REQUIRED",
            "action_required",
            "CANCELLED",
            "cancelled",
            "SUSPENDED",
            "suspended",
            "UNPAID",
            "unpaid",
          ],
        },
      }).sort({ createdAt: -1 });
    }

    let verificationReq;

    if (targetReq) {
      // Re-application or update of existing editable request (e.g. after REJECTION)
      targetReq.fullName = fullName.trim();
      targetReq.username = userUsername;
      targetReq.governmentIdType = finalGovIdType;
      targetReq.governmentIdNumber = governmentIdNumber ? String(governmentIdNumber).trim() : (targetReq.governmentIdNumber || "");
      targetReq.idFront = idFront;
      if (idBack) targetReq.idBack = idBack;
      targetReq.selfie = selfie;
      if (website !== undefined) targetReq.website = website;
      if (instagram !== undefined) targetReq.instagram = instagram;
      if (facebook !== undefined) targetReq.facebook = facebook;
      if (youtube !== undefined) targetReq.youtube = youtube;
      if (twitter !== undefined) targetReq.twitter = twitter;
      if (linkedin !== undefined) targetReq.linkedin = linkedin;
      if (reason !== undefined) targetReq.reason = reason;

      // Reset to PENDING for admin review and clear previous rejection remark
      targetReq.status = "PENDING";
      targetReq.adminRemark = "";
      targetReq.reviewedBy = null;
      targetReq.reviewedAt = null;

      if (selectedPlanData) targetReq.selectedPlan = selectedPlanData;
      if (planDoc?._id || linkedSub?.plan?._id) targetReq.plan = planDoc?._id || linkedSub?.plan?._id;
      if (resolvedTxId) targetReq.paymentId = resolvedTxId;
      if (safeOrderId) targetReq.orderId = safeOrderId;
      targetReq.paymentGateway = resolvedGateway;
      if (isPaid || resolvedTxId) {
        targetReq.paymentStatus = "PAID";
        targetReq.isPaid = true;
      }
      if (isApple) {
        targetReq.appleDetails = {
          transactionId: resolvedTxId || targetReq.appleDetails?.transactionId || "",
          originalTransactionId: resolvedOrigTxId || targetReq.appleDetails?.originalTransactionId || "",
          productId: resolvedProductId || targetReq.appleDetails?.productId || "",
          environment: resolvedEnv || targetReq.appleDetails?.environment || "",
          purchaseDate: resolvedPurchaseDate,
          expiresDate: resolvedExpiresDate,
        };
      }

      await targetReq.save();
      verificationReq = targetReq;
    } else {
      verificationReq = await VerificationRequest.create({
        userId,
        fullName: fullName.trim(),
        username: userUsername,
        governmentIdType: finalGovIdType,
        governmentIdNumber: governmentIdNumber ? String(governmentIdNumber).trim() : "",
        idFront,
        idBack,
        selfie,
        website: website || "",
        instagram: instagram || "",
        facebook: facebook || "",
        youtube: youtube || "",
        twitter: twitter || "",
        linkedin: linkedin || "",
        reason: reason || "",
        status: "PENDING",
        selectedPlan: selectedPlanData || undefined,
        plan: planDoc?._id || linkedSub?.plan?._id || undefined,
        paymentId: resolvedTxId,
        orderId: safeOrderId,
        paymentGateway: resolvedGateway,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        isPaid,
        appleDetails: isApple ? {
          transactionId: resolvedTxId,
          originalTransactionId: resolvedOrigTxId,
          productId: resolvedProductId,
          environment: resolvedEnv,
          purchaseDate: resolvedPurchaseDate,
          expiresDate: resolvedExpiresDate,
        } : undefined,
      });
    }

    // Update user status to PENDING and clear rejectionReason
    await User.findByIdAndUpdate(userId, {
      $set: {
        "verification.status": "PENDING",
        "verification.isVerified": false,
        "verification.rejectionReason": "",
      },
    });

    try {
      const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
      notifyOrangeTickStatus(
        user._id,
        "SUBMITTED",
        selectedPlanData?.name || verificationReq.selectedPlan?.name || "Orange Tick Badge"
      ).catch((e) => console.log("OrangeTick submitted notif err:", e.message));
    } catch (e) {
      console.log("OrangeTick notif error:", e.message);
    }

    const enriched = await enrichVerificationWithPaymentDetails(verificationReq);
    const responseDoc = enriched || (verificationReq.toObject ? verificationReq.toObject() : verificationReq);

    return res.status(200).json({
      success: true,
      message: "Verification request submitted successfully and is now under review",
      request: responseDoc,
      application: responseDoc,
      latestRequest: responseDoc,
    });
  } catch (error) {
    console.error("APPLY VERIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit verification request",
      error: error.message,
    });
  }
};

// ========================================
// USER: GET VERIFICATION STATUS
// ========================================
exports.getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select("verification name username profileImage phone isVerified");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const latestRequest = await VerificationRequest.findOne({ userId })
      .populate("selectedPlan.planId", "_id name price duration appleProductId category type planType")
      .populate("plan", "_id name price duration appleProductId category type planType")
      .sort({ createdAt: -1 });

    const enriched = latestRequest
      ? await enrichVerificationWithPaymentDetails(latestRequest)
      : null;

    let verificationObj = user.verification
      ? (user.verification.toObject ? user.verification.toObject() : { ...user.verification })
      : { status: "NOT_VERIFIED", isVerified: false };

    // 1. Auto-heal expiryDate if null for VERIFIED user
    let resolvedExpiry = verificationObj.expiryDate || null;
    if (!resolvedExpiry && (verificationObj.status === "VERIFIED" || verificationObj.isVerified)) {
      resolvedExpiry =
        enriched?.paymentInfo?.expiryDate ||
        enriched?.paymentInfo?.expiresDate ||
        enriched?.appleDetails?.expiresDate ||
        latestRequest?.appleDetails?.expiresDate ||
        null;

      if (resolvedExpiry) {
        user.verification.expiryDate = new Date(resolvedExpiry);
        verificationObj.expiryDate = user.verification.expiryDate;
        await User.findByIdAndUpdate(userId, {
          $set: { "verification.expiryDate": user.verification.expiryDate },
        });
      }
    }

    // 2. ENFORCE EXPIRY: If expiryDate exists and has passed, revoke verification
    if (
      resolvedExpiry &&
      new Date(resolvedExpiry) <= new Date() &&
      (verificationObj.status === "VERIFIED" || verificationObj.isVerified)
    ) {
      verificationObj.status = "NOT_VERIFIED";
      verificationObj.isVerified = false;
      user.verification.status = "NOT_VERIFIED";
      user.verification.isVerified = false;
      user.isVerified = false;
      await User.findByIdAndUpdate(userId, {
        $set: {
          "verification.status": "NOT_VERIFIED",
          "verification.isVerified": false,
          isVerified: false,
        },
      });
      if (latestRequest && (latestRequest.status === "VERIFIED" || latestRequest.status === "verified")) {
        latestRequest.status = "CANCELLED";
        await latestRequest.save();
      }
    }

    if (enriched) {
      const isPaid = Boolean(
        enriched.isPaid ||
        enriched.paymentStatus === "PAID" ||
        enriched.paymentId ||
        enriched.paymentInfo?.paymentStatus === "PAID" ||
        enriched.paymentInfo?.subscriptionStatus === "active"
      );
      enriched.isPaid = isPaid;
      if (isPaid && enriched.paymentStatus !== "PAID") {
        enriched.paymentStatus = "PAID";
      }
    }

    const returnDoc = enriched || latestRequest || null;

    return res.status(200).json({
      success: true,
      verification: verificationObj,
      latestRequest: returnDoc,
      application: returnDoc,
      request: returnDoc,
    });
  } catch (error) {
    console.error("GET VERIFICATION STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// USER: CANCEL VERIFICATION REQUEST
// ========================================
exports.cancelVerificationRequest = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const pendingReq = await VerificationRequest.findOne({
      userId,
      status: { $in: ["PENDING", "pending"] },
    });

    if (!pendingReq) {
      return res.status(404).json({
        success: false,
        message: "No pending verification request found",
      });
    }

    pendingReq.status = "CANCELLED";
    await pendingReq.save();

    await User.findByIdAndUpdate(userId, {
      $set: {
        "verification.status": "NOT_VERIFIED",
        "verification.isVerified": false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Verification request cancelled successfully",
    });
  } catch (error) {
    console.error("CANCEL VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// USER: UPDATE PENDING / EDIT VERIFICATION
// ========================================
exports.updatePendingVerification = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Find user's existing request:
    // Check for editable requests first (PENDING, REJECTED, CHANGES_REQUESTED, etc.)
    let targetReq = await VerificationRequest.findOne({
      userId,
      status: {
        $in: [
          "PENDING",
          "pending",
          "REJECTED",
          "rejected",
          "CHANGES_REQUESTED",
          "changes_requested",
          "ACTION_REQUIRED",
          "action_required",
          "CANCELLED",
          "cancelled",
          "SUSPENDED",
          "suspended",
          "UNPAID",
          "unpaid",
        ],
      },
    }).sort({ createdAt: -1 });

    // Fallback: check ANY latest verification request for this user
    if (!targetReq) {
      targetReq = await VerificationRequest.findOne({ userId }).sort({ createdAt: -1 });
    }

    const {
      fullName,
      username,
      governmentIdType,
      governmentIdNumber,
      website,
      instagram,
      facebook,
      youtube,
      twitter,
      linkedin,
      reason,
      planId,
      appleProductId,
      productId,
      paymentId,
      orderId,
    } = req.body;

    const files = req.files || {};
    const idFrontFile = files.idFront ? files.idFront[0] : null;
    const idBackFile = files.idBack ? files.idBack[0] : null;
    const selfieFile = files.selfie ? files.selfie[0] : null;

    // Check for active Orange Tick / Blue Tick subscription for this user
    const activeOrangeSub = await Subscription.findOne({
      user: userId,
      status: "active",
    })
      .populate("plan")
      .sort({ createdAt: -1 });

    const isOrangeTickSub =
      activeOrangeSub &&
      activeOrangeSub.plan &&
      (activeOrangeSub.plan.category === "ORANGETICK" ||
        activeOrangeSub.plan.category === "BLUETICK" ||
        activeOrangeSub.plan.type === "ORANGETICK" ||
        activeOrangeSub.plan.type === "BLUETICK");

    // Resolve plan details
    let resolvedPlanDoc = null;
    let targetPlanId = planId || activeOrangeSub?.plan?._id;
    if (
      (!targetPlanId || !mongoose.Types.ObjectId.isValid(targetPlanId)) &&
      (appleProductId || productId)
    ) {
      const appleProd = appleProductId || productId;
      resolvedPlanDoc = await Plan.findOne({ appleProductId: appleProd });
      if (resolvedPlanDoc) targetPlanId = resolvedPlanDoc._id;
    }

    if (!resolvedPlanDoc && targetPlanId && mongoose.Types.ObjectId.isValid(targetPlanId)) {
      resolvedPlanDoc = await Plan.findById(targetPlanId);
    }

    let clientPaymentId =
      paymentId ||
      req.body.razorpay_payment_id ||
      req.body.transactionId ||
      activeOrangeSub?.paymentId ||
      "";
    let rawOrderId =
      orderId ||
      req.body.razorpay_order_id ||
      "";
    let rawOrigTxId =
      req.body.originalTransactionId ||
      req.body.appleOriginalTransactionId ||
      "";

    const hasAppleTxId = Boolean(
      (clientPaymentId && /^\d{10,}$/.test(String(clientPaymentId).trim())) ||
      (activeOrangeSub?.appleDetails?.transactionId && /^\d{10,}$/.test(String(activeOrangeSub.appleDetails.transactionId).trim())) ||
      (activeOrangeSub?.paymentId && /^\d{10,}$/.test(String(activeOrangeSub.paymentId).trim()))
    );

    const isApple = Boolean(
      activeOrangeSub?.paymentGateway === "apple" ||
      Boolean(activeOrangeSub?.appleDetails?.transactionId) ||
      hasAppleTxId ||
      req.body.appleProductId
    );

    const resolvedGateway = isApple
      ? "apple"
      : (activeOrangeSub?.paymentGateway || (clientPaymentId.startsWith("pay_") ? "razorpay" : "apple"));

    const resolvedTxId = String(
      activeOrangeSub?.appleDetails?.transactionId ||
      (isApple && hasAppleTxId ? clientPaymentId : "") ||
      activeOrangeSub?.paymentId ||
      clientPaymentId ||
      ""
    ).trim();

    let resolvedOrigTxId = "";
    if (isApple) {
      const candidateOrigs = [
        activeOrangeSub?.appleDetails?.originalTransactionId,
        rawOrigTxId,
        (activeOrangeSub?.paymentGateway === "apple" && activeOrangeSub?.subscriptionId ? activeOrangeSub.subscriptionId : ""),
      ];
      for (const cand of candidateOrigs) {
        if (cand && !String(cand).startsWith("order_") && !String(cand).startsWith("ord_")) {
          resolvedOrigTxId = String(cand).trim();
          break;
        }
      }
      if (!resolvedOrigTxId && resolvedTxId) {
        resolvedOrigTxId = resolvedTxId;
      }
    }

    let safeOrderId = "";
    if (rawOrderId && !/^\d{10,}$/.test(String(rawOrderId).trim())) {
      safeOrderId = String(rawOrderId).trim();
    } else if (activeOrangeSub?.subscriptionId && String(activeOrangeSub.subscriptionId).startsWith("order_")) {
      safeOrderId = String(activeOrangeSub.subscriptionId).trim();
    }

    const resolvedProductId = String(
      activeOrangeSub?.appleDetails?.productId ||
      req.body.appleProductId ||
      req.body.productId ||
      activeOrangeSub?.plan?.appleProductId ||
      "com.app.catchWatch.creator.orangetick"
    ).trim();

    const resolvedEnv = String(
      activeOrangeSub?.appleDetails?.environment ||
      req.body.environment ||
      (resolvedTxId.startsWith("2") ? "Production" : "Sandbox")
    ).trim();

    const resolvedPurchaseDate =
      activeOrangeSub?.appleDetails?.purchaseDate ||
      activeOrangeSub?.startDate ||
      new Date();

    const resolvedExpiresDate =
      activeOrangeSub?.appleDetails?.expiresDate ||
      activeOrangeSub?.endDate ||
      null;

    const isPaid = Boolean(isOrangeTickSub || resolvedTxId);

    // 2. If NO existing request was found at all in DB, create one instead of 404!
    if (!targetReq) {
      const idFrontPath =
        getFilePath(idFrontFile) ||
        (typeof req.body.idFront === "string" ? req.body.idFront.trim() : "") ||
        "";
      const selfiePath =
        getFilePath(selfieFile) ||
        (typeof req.body.selfie === "string" ? req.body.selfie.trim() : "") ||
        "";
      const idBackPath =
        getFilePath(idBackFile) ||
        (typeof req.body.idBack === "string" ? req.body.idBack.trim() : "") ||
        "";

      let userUsername = username || req.currentUser?.username || "";
      if (userUsername && !userUsername.startsWith("@")) {
        userUsername = "@" + userUsername;
      }

      let selectedPlanData = undefined;
      if (resolvedPlanDoc) {
        selectedPlanData = {
          planId: resolvedPlanDoc._id,
          name: resolvedPlanDoc.name,
          price: resolvedPlanDoc.price,
          duration: resolvedPlanDoc.duration,
          paymentId: resolvedTxId,
          orderId: safeOrderId,
        };
      }

      targetReq = await VerificationRequest.create({
        userId,
        fullName: (fullName || req.currentUser?.name || "User").trim(),
        username: userUsername || `@user_${String(userId).slice(-4)}`,
        governmentIdType: normalizeGovernmentIdType(governmentIdType),
        governmentIdNumber: governmentIdNumber ? String(governmentIdNumber).trim() : "",
        idFront: idFrontPath || "",
        idBack: idBackPath || "",
        selfie: selfiePath || "",
        website: website || "",
        instagram: instagram || "",
        facebook: facebook || "",
        youtube: youtube || "",
        twitter: twitter || "",
        linkedin: linkedin || "",
        reason: reason || "",
        status: "PENDING",
        selectedPlan: selectedPlanData,
        plan: resolvedPlanDoc?._id || activeOrangeSub?.plan?._id || undefined,
        paymentId: resolvedTxId,
        orderId: safeOrderId,
        paymentGateway: resolvedGateway,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        isPaid,
        appleDetails: isApple ? {
          transactionId: resolvedTxId,
          originalTransactionId: resolvedOrigTxId,
          productId: resolvedProductId,
          environment: resolvedEnv,
          purchaseDate: resolvedPurchaseDate,
          expiresDate: resolvedExpiresDate,
        } : undefined,
      });
    } else {
      // 3. Update existing request
      if (fullName && fullName.trim()) targetReq.fullName = fullName.trim();
      if (username && username.trim()) {
        let u = username.trim();
        targetReq.username = u.startsWith("@") ? u : "@" + u;
      }
      if (governmentIdType) targetReq.governmentIdType = normalizeGovernmentIdType(governmentIdType);
      if (governmentIdNumber !== undefined) targetReq.governmentIdNumber = String(governmentIdNumber).trim();
      if (website !== undefined) targetReq.website = website;
      if (instagram !== undefined) targetReq.instagram = instagram;
      if (facebook !== undefined) targetReq.facebook = facebook;
      if (youtube !== undefined) targetReq.youtube = youtube;
      if (twitter !== undefined) targetReq.twitter = twitter;
      if (linkedin !== undefined) targetReq.linkedin = linkedin;
      if (reason !== undefined) targetReq.reason = reason;

      if (idFrontFile) {
        targetReq.idFront = getFilePath(idFrontFile);
      } else if (req.body.idFront && typeof req.body.idFront === "string" && req.body.idFront.trim()) {
        targetReq.idFront = req.body.idFront.trim();
      }

      if (idBackFile) {
        targetReq.idBack = getFilePath(idBackFile);
      } else if (req.body.idBack && typeof req.body.idBack === "string" && req.body.idBack.trim()) {
        targetReq.idBack = req.body.idBack.trim();
      }

      if (selfieFile) {
        targetReq.selfie = getFilePath(selfieFile);
      } else if (req.body.selfie && typeof req.body.selfie === "string" && req.body.selfie.trim()) {
        targetReq.selfie = req.body.selfie.trim();
      }

      if (resolvedPlanDoc) {
        targetReq.selectedPlan = {
          planId: resolvedPlanDoc._id,
          name: resolvedPlanDoc.name,
          price: resolvedPlanDoc.price,
          duration: resolvedPlanDoc.duration,
          paymentId: resolvedTxId || targetReq.paymentId || "",
          orderId: safeOrderId || targetReq.orderId || "",
        };
        targetReq.plan = resolvedPlanDoc._id;
      }

      if (resolvedTxId) {
        targetReq.paymentId = resolvedTxId;
      }
      if (safeOrderId) {
        targetReq.orderId = safeOrderId;
      }

      targetReq.paymentGateway = resolvedGateway;
      if (isPaid || targetReq.paymentId) {
        targetReq.paymentStatus = "PAID";
        targetReq.isPaid = true;
      }

      if (isApple) {
        targetReq.appleDetails = {
          transactionId: resolvedTxId || targetReq.appleDetails?.transactionId || "",
          originalTransactionId: resolvedOrigTxId || targetReq.appleDetails?.originalTransactionId || "",
          productId: resolvedProductId || targetReq.appleDetails?.productId || "",
          environment: resolvedEnv || targetReq.appleDetails?.environment || "",
          purchaseDate: resolvedPurchaseDate,
          expiresDate: resolvedExpiresDate,
        };
      }

      // Reset status to PENDING so admins can review the updated details
      targetReq.status = "PENDING";
      targetReq.adminRemark = ""; // Reset previous rejection reason
      targetReq.reviewedBy = null;
      targetReq.reviewedAt = null;

      await targetReq.save();
    }

    // Update User model status to PENDING
    await User.findByIdAndUpdate(userId, {
      $set: {
        "verification.status": "PENDING",
        "verification.isVerified": false,
        "verification.rejectionReason": "",
      },
    });

    // Notify user/admin
    try {
      const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
      notifyOrangeTickStatus(
        userId,
        "SUBMITTED",
        targetReq.selectedPlan?.name || "Orange Tick Badge"
      ).catch((e) => console.log("OrangeTick update notif err:", e.message));
    } catch (e) {
      console.log("OrangeTick notif error:", e.message);
    }

    const enriched = await enrichVerificationWithPaymentDetails(targetReq);
    const responseDoc = enriched || (targetReq.toObject ? targetReq.toObject() : targetReq);
    responseDoc.isPaid =
      targetReq.isPaid ||
      targetReq.paymentStatus === "PAID" ||
      Boolean(targetReq.paymentId) ||
      Boolean(isOrangeTickSub);

    return res.status(200).json({
      success: true,
      message: "Verification details updated successfully",
      request: responseDoc,
      application: responseDoc,
      latestRequest: responseDoc,
    });
  } catch (error) {
    console.error("UPDATE VERIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update verification request",
      error: error.message,
    });
  }
};

// ========================================
// ADMIN: GET ALL VERIFICATION REQUESTS
// ========================================
exports.getAllVerificationRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search || req.query.query || "";

    let query = {};
    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { fullName: searchRegex },
        { username: searchRegex },
        { governmentIdNumber: searchRegex },
      ];
    }

    const total = await VerificationRequest.countDocuments(query);
    const requests = await VerificationRequest.find(query)
      .populate(
        "userId",
        "_id name username email phone profileImage verification status role isCreator createdAt"
      )
      .populate("reviewedBy", "_id name email")
      .populate("selectedPlan.planId", "_id name price duration appleProductId category type planType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enrichedRequests = await Promise.all(
      requests.map((r) => enrichVerificationWithPaymentDetails(r))
    );

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      requests: enrichedRequests,
    });
  } catch (error) {
    console.error("ADMIN GET ALL VERIFICATION REQUESTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: GET PENDING VERIFICATION REQUESTS
// ========================================
exports.getPendingVerificationRequests = async (req, res) => {
  try {
    req.query.status = "PENDING";
    return exports.getAllVerificationRequests(req, res);
  } catch (error) {
    console.error("ADMIN GET PENDING ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: GET DASHBOARD VERIFICATION STATS
// ========================================
exports.getVerificationStats = async (req, res) => {
  try {
    const totalVerifiedUsers = await User.countDocuments({
      "verification.status": "VERIFIED",
    });

    const pendingRequests = await VerificationRequest.countDocuments({
      status: "PENDING",
    });

    const rejectedRequests = await VerificationRequest.countDocuments({
      status: "REJECTED",
    });

    const suspendedUsers = await User.countDocuments({
      "verification.status": "SUSPENDED",
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayApplications = await VerificationRequest.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    const totalProcessed = totalVerifiedUsers + rejectedRequests;
    const verificationRate = totalProcessed > 0
      ? Math.round((totalVerifiedUsers / totalProcessed) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      totalVerifiedUsers,
      pendingRequests,
      rejectedRequests,
      suspendedUsers,
      todayApplications,
      verificationRate: `${verificationRate}%`,
    });
  } catch (error) {
    console.error("GET VERIFICATION STATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: GET SINGLE VERIFICATION REQUEST
// ========================================
exports.getVerificationRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    const rawRequest = await VerificationRequest.findById(id)
      .populate(
        "userId",
        "_id name username email phone profileImage verification status role isCreator createdAt"
      )
      .populate("reviewedBy", "_id name email")
      .populate("selectedPlan.planId", "_id name price duration appleProductId category type planType");

    if (!rawRequest) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    const request = await enrichVerificationWithPaymentDetails(rawRequest);

    const history = await VerificationRequest.find({ userId: request.userId?._id || request.userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      request,
      history,
    });
  } catch (error) {
    console.error("GET SINGLE VERIFICATION REQUEST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: APPROVE VERIFICATION REQUEST
// ========================================
exports.approveVerification = async (req, res) => {
  try {
    const { id, expiryDate, adminRemark } = req.body;
    const requestId = id || req.body.requestId;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Valid Request ID is required" });
    }

    const vReq = await VerificationRequest.findById(requestId)
      .populate("plan")
      .populate("selectedPlan.planId");
    if (!vReq) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    // Resolve accurate expiry date:
    let resolvedExpiry = expiryDate ? new Date(expiryDate) : null;
    if (!resolvedExpiry || isNaN(resolvedExpiry.getTime())) {
      // 1. Check Apple purchase expiresDate
      if (vReq.appleDetails?.expiresDate) {
        resolvedExpiry = new Date(vReq.appleDetails.expiresDate);
      }
      // 2. Check linked subscription
      if (!resolvedExpiry || isNaN(resolvedExpiry.getTime())) {
        const txId = vReq.appleDetails?.transactionId || vReq.paymentId;
        let linkedSub = null;
        if (txId) {
          linkedSub = await Subscription.findOne({
            $or: [
              { paymentId: txId },
              { subscriptionId: txId },
              { "appleDetails.transactionId": txId },
            ],
          });
        }
        if (!linkedSub) {
          linkedSub = await Subscription.findOne({
            user: vReq.userId,
            status: "active",
          }).populate("plan").sort({ createdAt: -1 });
        }
        if (linkedSub) {
          resolvedExpiry = linkedSub.appleDetails?.expiresDate || linkedSub.endDate || null;
        }
      }
      // 3. Fallback to plan duration (days)
      if (!resolvedExpiry || isNaN(resolvedExpiry.getTime())) {
        const durationDays = vReq.selectedPlan?.duration || vReq.plan?.duration || 30;
        resolvedExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      }
    }

    vReq.status = "VERIFIED";
    vReq.adminRemark = adminRemark || "Approved by admin";
    vReq.reviewedBy = req.user.id;
    vReq.reviewedAt = new Date();
    if (resolvedExpiry) {
      if (!vReq.appleDetails) vReq.appleDetails = {};
      vReq.appleDetails.expiresDate = resolvedExpiry;
    }
    await vReq.save();

    const user = await User.findById(vReq.userId);
    if (user) {
      user.verification = {
        status: "VERIFIED",
        badgeType: "ORANGE",
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
        expiryDate: resolvedExpiry,
        isVerified: true,
        rejectionReason: "",
        suspensionReason: "",
      };
      user.isVerified = true;
      await user.save();

      try {
        const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
        notifyOrangeTickStatus(user._id, "APPROVED").catch((e) => console.log("OrangeTick approve notif err:", e.message));
      } catch (e) {
        console.log("OrangeTick notif error:", e.message);
      }

      // Create Notification
      await Notification.create({
        title: "Congratulations!",
        message: "Your Catch & Watch Profile has been officially verified. Your Orange Tick has been activated.",
        type: "VERIFICATION",
        targetUser: user._id,
        createdBy: req.user.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification request approved successfully",
      request: vReq,
    });
  } catch (error) {
    console.error("APPROVE VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: REJECT VERIFICATION REQUEST
// ========================================
exports.rejectVerification = async (req, res) => {
  try {
    const { id, reason, adminRemark } = req.body;
    const requestId = id || req.body.requestId;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Valid Request ID is required" });
    }

    const rejectionReason = reason || adminRemark || "Submitted documents could not be verified.";

    const vReq = await VerificationRequest.findById(requestId);
    if (!vReq) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    vReq.status = "REJECTED";
    vReq.adminRemark = rejectionReason;
    vReq.reviewedBy = req.user.id;
    vReq.reviewedAt = new Date();
    await vReq.save();

    const user = await User.findById(vReq.userId);
    if (user) {
      user.verification = {
        ...user.verification,
        status: "REJECTED",
        isVerified: false,
        rejectionReason: rejectionReason,
      };
      await user.save();

      try {
        const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
        notifyOrangeTickStatus(user._id, "REJECTED", "Orange Tick Badge", rejectionReason).catch((e) =>
          console.log("OrangeTick reject notif err:", e.message)
        );
      } catch (e) {
        console.log("OrangeTick notif error:", e.message);
      }

      // Send notification
      await Notification.create({
        title: "Verification Request Rejected",
        message: `Your verification request has been rejected.\nReason: ${rejectionReason}`,
        type: "VERIFICATION",
        targetUser: user._id,
        createdBy: req.user.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification request rejected",
      request: vReq,
    });
  } catch (error) {
    console.error("REJECT VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: SUSPEND VERIFICATION
// ========================================
exports.suspendVerification = async (req, res) => {
  try {
    const { id, userId, reason } = req.body;
    const suspensionReason = reason || "Suspended due to policy violation.";

    let targetUser = null;
    let vReq = null;

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      vReq = await VerificationRequest.findById(id);
      if (vReq) {
        vReq.status = "SUSPENDED";
        vReq.adminRemark = suspensionReason;
        vReq.reviewedBy = req.user.id;
        vReq.reviewedAt = new Date();
        await vReq.save();
        targetUser = await User.findById(vReq.userId);
      }
    }

    if (!targetUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
      targetUser = await User.findById(userId);
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User or request not found" });
    }

    targetUser.verification = {
      ...targetUser.verification,
      status: "SUSPENDED",
      isVerified: false,
      suspensionReason: suspensionReason,
    };
    await targetUser.save();

    try {
      const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
      notifyOrangeTickStatus(targetUser._id, "REJECTED", "Orange Tick Badge", suspensionReason).catch((e) =>
        console.log("OrangeTick suspend notif err:", e.message)
      );
    } catch (e) {
      console.log("OrangeTick notif error:", e.message);
    }

    // Send notification
    await Notification.create({
      title: "Verification Badge Suspended",
      message: `Your verification badge has been suspended.\nReason: ${suspensionReason}`,
      type: "VERIFICATION",
      targetUser: targetUser._id,
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "User verification suspended successfully",
      user: targetUser,
    });
  } catch (error) {
    console.error("SUSPEND VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: REMOVE VERIFICATION (ORANGE TICK)
// ========================================
exports.removeVerification = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.verification = {
      status: "NOT_VERIFIED",
      badgeType: "ORANGE",
      isVerified: false,
      rejectionReason: "",
      suspensionReason: "",
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Verification badge removed successfully",
    });
  } catch (error) {
    console.error("REMOVE VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: GET USERS FOR VERIFICATION SELECTION
// ========================================
exports.getUsersForSelection = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/^@/, ""), "i");
      query.$or = [{ name: searchRegex }, { username: searchRegex }];
    }
    const users = await User.find(query)
      .select("_id name username profileImage bio verification isVerified createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GET USERS FOR SELECTION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: MANUALLY VERIFY USER
// ========================================
exports.manuallyVerifyUser = async (req, res) => {
  try {
    const { userId, username } = req.body;
    let user;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else if (username || userId) {
      const targetStr = (username || userId).toString().trim().replace(/^@/, "");
      user = await User.findOne({ username: new RegExp(`^${targetStr}$`, "i") });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please select a valid user." });
    }

    user.verification = {
      status: "VERIFIED",
      badgeType: "ORANGE",
      verifiedAt: new Date(),
      verifiedBy: req.user.id,
      isVerified: true,
      rejectionReason: "",
      suspensionReason: "",
    };
    user.isVerified = true;
    await user.save();

    try {
      const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
      notifyOrangeTickStatus(user._id, "APPROVED").catch((e) => console.log("OrangeTick manual verify err:", e.message));
    } catch (e) {
      console.log("OrangeTick notif error:", e.message);
    }

    // Create Notification
    await Notification.create({
      title: "Congratulations!",
      message: "Your Catch & Watch Profile has been officially verified by Admin. Your Orange Tick has been activated.",
      type: "VERIFICATION",
      targetUser: user._id,
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: `Orange Tick granted successfully to ${user.name} (@${user.username})!`,
      user,
    });
  } catch (error) {
    console.error("MANUAL VERIFY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: DELETE VERIFICATION REQUEST (PERMANENT)
// ========================================
exports.deleteVerificationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = id || req.body.id;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Valid Request ID is required" });
    }

    const vReq = await VerificationRequest.findByIdAndDelete(requestId);
    if (!vReq) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Verification request deleted permanently",
    });
  } catch (error) {
    console.error("DELETE VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
