const mongoose = require("mongoose");
const User = require("../models/user.model");
const CreatorWallet = require("../models/creatorWallet.model");
const RedeemRequest = require("../models/redeemRequest.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const CreatorAnalytics = require("../models/creatorAnalytics.model");
const Notification = require("../models/notification.model");
const { decorateUserWithBlueTick, determineCreatorLevel } = require("../utils/creator.helper");

// ========================================
// ADMIN: CREATOR DASHBOARD ANALYTICS
// GET /api/admin/creator/dashboard
// ========================================
exports.getAdminCreatorDashboard = async (req, res) => {
  try {
    const totalCreators = await User.countDocuments({ isCreator: true });
    const verifiedCreators = await User.countDocuments({
      isCreator: true,
      $or: [{ isVerified: true }, { "verification.status": "VERIFIED" }],
    });

    const pendingRedeems = await RedeemRequest.countDocuments({ status: "PENDING" });
    const approvedRedeems = await RedeemRequest.countDocuments({ status: "APPROVED" });

    const walletTotals = await CreatorWallet.aggregate([
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$totalPoints" },
          redeemedPoints: { $sum: "$redeemedPoints" },
          availablePoints: { $sum: "$availablePoints" },
          walletBalance: { $sum: "$walletBalance" },
        },
      },
    ]);

    const stats = walletTotals[0] || {
      totalPoints: 0,
      redeemedPoints: 0,
      availablePoints: 0,
      walletBalance: 0,
    };

    return res.status(200).json({
      success: true,
      totalCreators,
      verifiedCreators,
      pendingRedeems,
      approvedRedeems,
      totalPointsIssued: stats.totalPoints,
      totalPointsRedeemed: stats.redeemedPoints,
      totalAvailablePoints: stats.availablePoints,
      totalWalletBalance: stats.walletBalance,
    });
  } catch (error) {
    console.error("ADMIN CREATOR DASHBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: CREATOR LIST
// GET /api/admin/creator/list
// ========================================
exports.getAdminCreatorList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || req.query.query || "";

    let query = { isCreator: true };
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { username: regex }, { phone: regex }];
    }

    const total = await User.countDocuments(query);
    const creators = await User.find(query)
      .select(
        "name username phone profileImage isVerified verification qualityScore creatorLevel totalEngagementPoints totalQualifiedViews totalWatchMinutes status createdAt"
      )
      .sort({ totalEngagementPoints: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const decoratedCreators = creators.map((c) => decorateUserWithBlueTick(c));

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      creators: decoratedCreators,
    });
  } catch (error) {
    console.error("ADMIN CREATOR LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: GET REDEEM REQUESTS
// GET /api/admin/redeem
// ========================================
exports.getAdminRedeemRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = {};
    if (status && status !== "ALL") {
      query.status = status;
    }

    const total = await RedeemRequest.countDocuments(query);
    const requests = await RedeemRequest.find(query)
      .populate("creatorId", "_id name username phone profileImage verification isVerified qualityScore creatorLevel status")
      .populate("processedBy", "_id name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const decoratedRequests = requests.map((r) => {
      if (r.creatorId) {
        r.creatorId = decorateUserWithBlueTick(r.creatorId);
      }
      return r;
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      requests: decoratedRequests,
    });
  } catch (error) {
    console.error("ADMIN GET REDEEM REQUESTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: APPROVE REDEEM REQUEST
// PUT /api/admin/redeem/:id/approve
// ========================================
exports.approveRedeem = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.id;
    const { amount, adminRemark } = req.body;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Valid Request ID required" });
    }

    const redeemReq = await RedeemRequest.findById(requestId);
    if (!redeemReq) {
      return res.status(404).json({ success: false, message: "Redeem request not found" });
    }

    if (redeemReq.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${redeemReq.status}`,
      });
    }

    // Set approved Rupee amount (either custom entered by Admin or calculated from points)
    const finalAmount = (amount !== undefined && amount !== null && Number(amount) >= 0)
      ? Number(amount)
      : Math.round(redeemReq.points * 0.1);

    redeemReq.amount = finalAmount;
    redeemReq.status = "APPROVED";
    redeemReq.adminRemark = adminRemark || "Approved by admin";
    redeemReq.processedAt = new Date();
    redeemReq.processedBy = req.user.id;
    await redeemReq.save();

    // Update Creator Wallet
    let wallet = await CreatorWallet.findOne({ creatorId: redeemReq.creatorId });
    if (wallet) {
      wallet.redeemedPoints += redeemReq.points;
      await wallet.save();
    }

    // Send Notification
    await Notification.create({
      title: "Redeem Request Approved! 🎉",
      message: `Your redeem request for ${redeemReq.points} coins has been approved! Payout Amount: ₹${finalAmount}`,
      type: "SYSTEM",
      targetUser: redeemReq.creatorId,
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Redeem request approved successfully",
      redeemRequest: redeemReq,
    });
  } catch (error) {
    console.error("APPROVE REDEEM ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: REJECT REDEEM REQUEST
// PUT /api/admin/redeem/:id/reject
// ========================================
exports.rejectRedeem = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.id;
    const { reason, adminRemark } = req.body;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Valid Request ID required" });
    }

    const redeemReq = await RedeemRequest.findById(requestId);
    if (!redeemReq) {
      return res.status(404).json({ success: false, message: "Redeem request not found" });
    }

    if (redeemReq.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${redeemReq.status}`,
      });
    }

    const rejectionReason = reason || adminRemark || "Redeem request rejected by admin.";

    redeemReq.status = "REJECTED";
    redeemReq.rejectionReason = rejectionReason;
    redeemReq.adminRemark = rejectionReason;
    redeemReq.processedAt = new Date();
    redeemReq.processedBy = req.user.id;
    await redeemReq.save();

    // Restore Creator Wallet available points
    let wallet = await CreatorWallet.findOne({ creatorId: redeemReq.creatorId });
    if (wallet) {
      wallet.availablePoints += redeemReq.points;
      await wallet.save();
    }

    // Send Notification
    await Notification.create({
      title: "Redeem Request Rejected",
      message: `Your redeem request for ${redeemReq.points} coins was rejected.\nReason: ${rejectionReason}`,
      type: "SYSTEM",
      targetUser: redeemReq.creatorId,
      createdBy: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Redeem request rejected and coins restored to user",
      redeemRequest: redeemReq,
    });
  } catch (error) {
    console.error("REJECT REDEEM ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: MANUAL POINTS ADDITION
// POST /api/admin/creator/points/add
// ========================================
exports.addCreatorPoints = async (req, res) => {
  try {
    const { creatorId, userId, points, reason } = req.body;
    const targetUserId = creatorId || userId;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Valid Creator ID required" });
    }

    const pointsNum = Number(points);
    if (!pointsNum || pointsNum <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive points required" });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    user.totalEngagementPoints = (user.totalEngagementPoints || 0) + pointsNum;
    await user.save();

    await CreatorPointHistory.create({
      creatorId: targetUserId,
      action: "MANUAL_ADD",
      points: pointsNum,
      userId: req.user.id,
    });

    let wallet = await CreatorWallet.findOne({ creatorId: targetUserId });
    if (!wallet) {
      wallet = new CreatorWallet({ creatorId: targetUserId });
    }
    wallet.totalPoints = user.totalEngagementPoints;
    wallet.availablePoints += pointsNum;
    wallet.walletBalance = Math.round(wallet.availablePoints * 0.1);
    await wallet.save();

    return res.status(200).json({
      success: true,
      message: `${pointsNum} points added to creator successfully`,
      totalPoints: user.totalEngagementPoints,
      availablePoints: wallet.availablePoints,
    });
  } catch (error) {
    console.error("ADD POINTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: MANUAL POINTS DEDUCTION
// POST /api/admin/creator/points/remove
// ========================================
exports.removeCreatorPoints = async (req, res) => {
  try {
    const { creatorId, userId, points, reason } = req.body;
    const targetUserId = creatorId || userId;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Valid Creator ID required" });
    }

    const pointsNum = Number(points);
    if (!pointsNum || pointsNum <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive points required" });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    user.totalEngagementPoints = Math.max(0, (user.totalEngagementPoints || 0) - pointsNum);
    await user.save();

    await CreatorPointHistory.create({
      creatorId: targetUserId,
      action: "MANUAL_REMOVE",
      points: -pointsNum,
      userId: req.user.id,
    });

    let wallet = await CreatorWallet.findOne({ creatorId: targetUserId });
    if (wallet) {
      wallet.totalPoints = user.totalEngagementPoints;
      wallet.availablePoints = Math.max(0, wallet.availablePoints - pointsNum);
      wallet.walletBalance = Math.round(wallet.availablePoints * 0.1);
      await wallet.save();
    }

    return res.status(200).json({
      success: true,
      message: `${pointsNum} points deducted from creator successfully`,
      totalPoints: user.totalEngagementPoints,
      availablePoints: wallet ? wallet.availablePoints : 0,
    });
  } catch (error) {
    console.error("REMOVE POINTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: VERIFY CREATOR (BLUE TICK)
// PUT /api/admin/creator/verify
// ========================================
exports.verifyCreator = async (req, res) => {
  try {
    const { userId, creatorId } = req.body;
    const targetUserId = userId || creatorId;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Valid User ID required" });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isVerified = true;
    user.isCreator = true;
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

    await Notification.create({
      title: "Congratulations! 💙",
      message: "Your profile has been verified by Admin. Creator Dashboard and Rewards are now unlocked!",
      type: "VERIFICATION",
      targetUser: user._id,
      createdBy: req.user.id,
    });

    const decoratedUser = decorateUserWithBlueTick(user);

    return res.status(200).json({
      success: true,
      message: "Creator verified and Blue Tick badge granted",
      user: decoratedUser,
    });
  } catch (error) {
    console.error("VERIFY CREATOR ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// ADMIN: REMOVE VERIFICATION (BLUE TICK)
// PUT /api/admin/creator/remove-verification
// ========================================
exports.removeCreatorVerification = async (req, res) => {
  try {
    const { userId, creatorId } = req.body;
    const targetUserId = userId || creatorId;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Valid User ID required" });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isVerified = false;
    user.verification = {
      status: "NOT_VERIFIED",
      badgeType: "BLUE",
      isVerified: false,
      rejectionReason: "",
      suspensionReason: "",
    };
    await user.save();

    const decoratedUser = decorateUserWithBlueTick(user);

    return res.status(200).json({
      success: true,
      message: "Creator verification and Blue Tick badge removed",
      user: decoratedUser,
    });
  } catch (error) {
    console.error("REMOVE CREATOR VERIFICATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
