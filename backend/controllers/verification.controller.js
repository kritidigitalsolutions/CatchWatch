const mongoose = require("mongoose");
const User = require("../models/user.model");
const VerificationRequest = require("../models/verificationRequest.model");
const Notification = require("../models/notification.model");

const getFilePath = (file) => {
  if (!file) return "";
  if (file.path) return file.path.replace(/\\/g, "/");
  if (file.cdnUrl) return file.cdnUrl;
  return "";
};

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

    const paymentId = req.body.paymentId || req.body.razorpay_payment_id || "";
    const orderId = req.body.orderId || req.body.razorpay_order_id || "";

    const Plan = require("../models/plan.model");
    let selectedPlanData = null;
    const planId = req.body.planId;
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

    const verificationReq = await VerificationRequest.create({
      userId,
      fullName: fullName.trim(),
      username: userUsername,
      governmentIdType,
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

    // Update user status to PENDING
    user.verification = {
      ...user.verification,
      status: "PENDING",
      isVerified: false,
    };
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Verification request submitted successfully",
      request: verificationReq,
    });
  } catch (error) {
    console.error("APPLY VERIFICATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
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
    if (governmentIdType) pendingReq.governmentIdType = governmentIdType;
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
      .populate("userId", "_id name username phone profileImage verification status")
      .populate("reviewedBy", "_id name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      requests,
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

    const request = await VerificationRequest.findById(id)
      .populate("userId", "_id name username phone profileImage verification status createdAt")
      .populate("reviewedBy", "_id name email");

    if (!request) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

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
        badgeType: "BLUE",
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isVerified: true,
        rejectionReason: "",
        suspensionReason: "",
      };
      await user.save();

      // Create Notification
      await Notification.create({
        title: "Congratulations!",
        message: "Your Catch & Watch Profile has been officially verified. Your Blue Tick has been activated.",
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
    });
  } catch (error) {
    console.error("SUSPEND VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: REMOVE VERIFICATION (BLUE TICK)
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
      badgeType: "BLUE",
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
// ADMIN: MANUALLY VERIFY USER
// ========================================
exports.manuallyVerifyUser = async (req, res) => {
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
      status: "VERIFIED",
      badgeType: "BLUE",
      verifiedAt: new Date(),
      verifiedBy: req.user.id,
      isVerified: true,
      rejectionReason: "",
      suspensionReason: "",
    };
    await user.save();

    // Create Notification
    await Notification.create({
      title: "Congratulations!",
      message: "Your Catch & Watch Profile has been officially verified by Admin. Your Blue Tick has been activated.",
      type: "VERIFICATION",
      targetUser: user._id,
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "User verified manually by admin",
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
