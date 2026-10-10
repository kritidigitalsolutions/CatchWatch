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
    sub = await Subscription.findOne({
      user: userId,
    })
      .populate("plan", "name price duration appleProductId category")
      .sort({ createdAt: -1 })
      .lean();
  }

  const rawGateway =
    doc.paymentGateway ||
    sub?.paymentGateway ||
    (doc.paymentId?.startsWith("pay_") ? "razorpay" : doc.paymentId ? "apple" : "manual");

  const isApple =
    rawGateway === "apple" ||
    Boolean(doc.appleDetails?.transactionId) ||
    Boolean(sub?.appleDetails?.transactionId) ||
    Boolean(doc.paymentId && /^\d{10,}$/.test(String(doc.paymentId).trim()));

  const resolvedTxId =
    doc.appleDetails?.transactionId ||
    doc.paymentId ||
    sub?.appleDetails?.transactionId ||
    sub?.paymentId ||
    "";

  const resolvedOrigTxId =
    doc.appleDetails?.originalTransactionId ||
    doc.orderId ||
    sub?.appleDetails?.originalTransactionId ||
    sub?.subscriptionId ||
    "";

  const resolvedProductId =
    doc.appleDetails?.productId ||
    sub?.appleDetails?.productId ||
    doc.selectedPlan?.planId?.appleProductId ||
    sub?.plan?.appleProductId ||
    "";

  const resolvedEnv =
    doc.appleDetails?.environment ||
    sub?.appleDetails?.environment ||
    (resolvedTxId && String(resolvedTxId).startsWith("2") ? "Production" : "Sandbox");

  doc.paymentInfo = {
    paymentGateway: isApple ? "apple" : rawGateway,
    paymentStatus: doc.paymentStatus || (sub ? "PAID" : doc.paymentId ? "PAID" : "UNPAID"),
    transactionId: resolvedTxId,
    originalTransactionId: resolvedOrigTxId,
    appleProductId: resolvedProductId,
    environment: resolvedEnv,
    amount: doc.selectedPlan?.price || sub?.amount || sub?.plan?.price || 0,
    currency: sub?.currency || "INR",
    purchaseDate: doc.appleDetails?.purchaseDate || sub?.startDate || doc.createdAt,
    expiresDate: sub?.endDate || null,
    isApple,
    subscriptionStatus: sub?.status || (doc.paymentStatus === "PAID" ? "active" : "unpaid"),
    linkedSubscriptionId: sub?._id || null,
  };

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

    const idFront = getFilePath(idFrontFile);
    const idBack = getFilePath(idBackFile);
    const selfie = getFilePath(selfieFile);

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

    let paymentId =
      req.body.paymentId ||
      req.body.razorpay_payment_id ||
      req.body.transactionId ||
      "";
    let orderId =
      req.body.orderId ||
      req.body.razorpay_order_id ||
      req.body.originalTransactionId ||
      "";

    const Plan = require("../models/plan.model");
    const Subscription = require("../models/subscription.model");

    // Validate payment ownership if paymentId is provided
    if (paymentId) {
      const existingSub = await Subscription.findOne({ paymentId });
      if (existingSub && existingSub.user.toString() !== userId.toString()) {
        return res.status(409).json({
          success: false,
          message: "This payment transaction is already associated with another account.",
        });
      }
      if (existingSub && !orderId && existingSub.subscriptionId) {
        orderId = existingSub.subscriptionId;
      }
    } else {
      // If paymentId not passed, auto-link user's active Orange Tick subscription if exists
      const activeOrangeSub = await Subscription.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      if (
        activeOrangeSub &&
        activeOrangeSub.plan &&
        (activeOrangeSub.plan.category === "ORANGETICK" ||
          activeOrangeSub.plan.category === "BLUETICK")
      ) {
        paymentId = activeOrangeSub.paymentId || "";
        orderId = activeOrangeSub.subscriptionId || "";
      }
    }

    let selectedPlanData = null;
    let planId = req.body.planId;

    if ((!planId || !mongoose.Types.ObjectId.isValid(planId)) && (req.body.appleProductId || req.body.productId)) {
      const appleProd = req.body.appleProductId || req.body.productId;
      const foundPlan = await Plan.findOne({ appleProductId: appleProd });
      if (foundPlan) planId = foundPlan._id;
    }

    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      const planDoc = await Plan.findById(planId);
      if (planDoc) {
        selectedPlanData = {
          planId: planDoc._id,
          name: planDoc.name,
          price: planDoc.price,
          duration: planDoc.duration,
          paymentId,
          orderId,
        };
      }
    }

    const finalGovIdType = normalizeGovernmentIdType(governmentIdType);

    const verificationReq = await VerificationRequest.create({
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
      paymentId,
      orderId,
    });

    // Update user status to PENDING safely without full-document validation errors
    await User.findByIdAndUpdate(userId, {
      $set: {
        "verification.status": "PENDING",
        "verification.isVerified": false,
      },
    });

    try {
      const { notifyOrangeTickStatus } = require("../utils/notificationDispatcher.helper");
      notifyOrangeTickStatus(user._id, "SUBMITTED", selectedPlanData?.name || "Orange Tick Badge").catch((e) =>
        console.log("OrangeTick submitted notif err:", e.message)
      );
    } catch (e) {
      console.log("OrangeTick notif error:", e.message);
    }

    return res.status(201).json({
      success: true,
      message: "Verification request submitted successfully",
      request: verificationReq,
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
    const userId = req.user.id;
    const user = await User.findById(userId).select("verification name username profileImage phone");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const latestRequest = await VerificationRequest.findOne({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      verification: user.verification || { status: "NOT_VERIFIED", isVerified: false },
      latestRequest,
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
    const userId = req.user.id;
    const pendingReq = await VerificationRequest.findOne({ userId, status: "PENDING" });

    if (!pendingReq) {
      return res.status(404).json({
        success: false,
        message: "No pending verification request found",
      });
    }

    pendingReq.status = "CANCELLED";
    await pendingReq.save();

    await User.findByIdAndUpdate(userId, {
      "verification.status": "NOT_VERIFIED",
      "verification.isVerified": false,
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
// USER: UPDATE PENDING VERIFICATION
// ========================================
exports.updatePendingVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const pendingReq = await VerificationRequest.findOne({ userId, status: "PENDING" });

    if (!pendingReq) {
      return res.status(404).json({
        success: false,
        message: "No pending verification request available to update",
      });
    }

    const {
      fullName,
      governmentIdType,
      governmentIdNumber,
      website,
      instagram,
      facebook,
      youtube,
      twitter,
      linkedin,
      reason,
    } = req.body;

    if (fullName) pendingReq.fullName = fullName.trim();
    if (governmentIdType) pendingReq.governmentIdType = normalizeGovernmentIdType(governmentIdType);
    if (governmentIdNumber !== undefined) pendingReq.governmentIdNumber = String(governmentIdNumber).trim();
    if (website !== undefined) pendingReq.website = website;
    if (instagram !== undefined) pendingReq.instagram = instagram;
    if (facebook !== undefined) pendingReq.facebook = facebook;
    if (youtube !== undefined) pendingReq.youtube = youtube;
    if (twitter !== undefined) pendingReq.twitter = twitter;
    if (linkedin !== undefined) pendingReq.linkedin = linkedin;
    if (reason !== undefined) pendingReq.reason = reason;

    const files = req.files || {};
    if (files.idFront && files.idFront[0]) {
      pendingReq.idFront = getFilePath(files.idFront[0]);
    }
    if (files.idBack && files.idBack[0]) {
      pendingReq.idBack = getFilePath(files.idBack[0]);
    }
    if (files.selfie && files.selfie[0]) {
      pendingReq.selfie = getFilePath(files.selfie[0]);
    }

    await pendingReq.save();

    return res.status(200).json({
      success: true,
      message: "Pending verification request updated successfully",
      request: pendingReq,
    });
  } catch (error) {
    console.error("UPDATE VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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

    const vReq = await VerificationRequest.findById(requestId);
    if (!vReq) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    vReq.status = "VERIFIED";
    vReq.adminRemark = adminRemark || "Approved by admin";
    vReq.reviewedBy = req.user.id;
    vReq.reviewedAt = new Date();
    await vReq.save();

    const user = await User.findById(vReq.userId);
    if (user) {
      user.verification = {
        status: "VERIFIED",
        badgeType: "ORANGE",
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isVerified: true,
        rejectionReason: "",
        suspensionReason: "",
      };
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
