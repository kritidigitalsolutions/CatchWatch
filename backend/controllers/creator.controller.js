const mongoose = require("mongoose");
const User = require("../models/user.model");
const CreatorWallet = require("../models/creatorWallet.model");
const RedeemRequest = require("../models/redeemRequest.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const CreatorAnalytics = require("../models/creatorAnalytics.model");
const QualifiedView = require("../models/qualifiedView.model");
const Reel = require("../models/reel.model");
const Follow = require("../models/follow.model");

const { decorateUserWithBlueTick, determineCreatorLevel } = require("../utils/creator.helper");

// Helper to check creator verification & active status
const isVerifiedCreator = (user) => {
  const decorated = decorateUserWithBlueTick(user);
  return Boolean(
    decorated.blueTick &&
    user.status === "Active" &&
    user.isCreator !== false
  );
};

// ========================================
// GET CREATOR WALLET API
// GET /api/creator/wallet
// ========================================
exports.getCreatorWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await CreatorWallet.findOne({ creatorId: userId });
    if (!wallet) {
      const user = await User.findById(userId);
      const totalPoints = user ? user.totalEngagementPoints || 0 : 0;
      wallet = await CreatorWallet.create({
        creatorId: userId,
        totalPoints,
        redeemedPoints: 0,
        availablePoints: totalPoints,
      });
    }

    return res.status(200).json({
      success: true,
      totalPoints: wallet.totalPoints || 0,
      redeemedPoints: wallet.redeemedPoints || 0,
      availablePoints: wallet.availablePoints || 0,
    });
  } catch (error) {
    console.error("GET WALLET ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// REDEEM REQUEST API
// POST /api/creator/redeem
// ========================================
exports.requestRedeem = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      points,
      paymentMethod = "UPI",
      upiId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
    } = req.body;

    const pointsNum = Number(points);
    if (!pointsNum || pointsNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid positive coins/points amount is required",
      });
    }

    // Minimum redeem threshold (500 points)
    if (pointsNum < 500) {
      return res.status(400).json({
        success: false,
        message: "Minimum redeem threshold is 500 coins",
      });
    }

    // Payment details validation
    if (paymentMethod === "UPI") {
      if (!upiId || !upiId.trim()) {
        return res.status(400).json({
          success: false,
          message: "Valid UPI ID or UPI phone number is required",
        });
      }
    } else if (paymentMethod === "BANK_TRANSFER") {
      if (!accountHolderName || !accountHolderName.trim()) {
        return res.status(400).json({ success: false, message: "Account Holder Name is required" });
      }
      if (!accountNumber || !accountNumber.trim()) {
        return res.status(400).json({ success: false, message: "Bank Account Number is required" });
      }
      if (!ifscCode || !ifscCode.trim()) {
        return res.status(400).json({ success: false, message: "Bank IFSC Code is required" });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Use 'UPI' or 'BANK_TRANSFER'",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verification & Status Eligibility Checks
    if (!isVerifiedCreator(user)) {
      return res.status(403).json({
        success: false,
        message: "Only verified active creators are eligible for coins redeem request",
      });
    }

    let wallet = await CreatorWallet.findOne({ creatorId: userId });
    if (!wallet) {
      wallet = await CreatorWallet.create({
        creatorId: userId,
        totalPoints: user.totalEngagementPoints || 0,
        redeemedPoints: 0,
        availablePoints: user.totalEngagementPoints || 0,
      });
    }

    if (wallet.availablePoints < pointsNum) {
      return res.status(400).json({
        success: false,
        message: `Sufficient balance required. Available coins: ${wallet.availablePoints}`,
      });
    }

    const paymentDetails = {
      paymentMethod,
      upiId: upiId ? upiId.trim() : "",
      accountHolderName: accountHolderName ? accountHolderName.trim() : "",
      accountNumber: accountNumber ? accountNumber.trim() : "",
      ifscCode: ifscCode ? ifscCode.trim() : "",
      bankName: bankName ? bankName.trim() : "",
    };

    // Deduct available points temporarily for pending request
    const redeemReq = await RedeemRequest.create({
      creatorId: userId,
      points: pointsNum,
      amount: 0, // Admin will set final calculated Rupee amount upon approval
      paymentDetails,
      status: "PENDING",
    });

    wallet.availablePoints -= pointsNum;
    await wallet.save();

    return res.status(201).json({
      success: true,
      message: "Coins redeem request submitted successfully with payment details for admin approval",
      redeemRequest: redeemReq,
      wallet: {
        totalPoints: wallet.totalPoints,
        redeemedPoints: wallet.redeemedPoints,
        availablePoints: wallet.availablePoints,
      },
    });
  } catch (error) {
    console.error("REDEEM REQUEST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// REDEEM HISTORY API
// GET /api/creator/redeem/history
// ========================================
exports.getRedeemHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await RedeemRequest.find({ creatorId: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      history: requests,
      requests,
    });
  } catch (error) {
    console.error("GET REDEEM HISTORY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// USER TOTAL POINTS API
// GET /api/creator/points
// ========================================
exports.getCreatorPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayHistory = await CreatorPointHistory.find({
      creatorId: userId,
      createdAt: { $gte: startOfToday },
    });
    const todayPoints = todayHistory.reduce((sum, h) => sum + (h.points || 0), 0);

    const weeklyHistory = await CreatorPointHistory.find({
      creatorId: userId,
      createdAt: { $gte: startOfWeek },
    });
    const weeklyPoints = weeklyHistory.reduce((sum, h) => sum + (h.points || 0), 0);

    const monthlyHistory = await CreatorPointHistory.find({
      creatorId: userId,
      createdAt: { $gte: startOfMonth },
    });
    const monthlyPoints = monthlyHistory.reduce((sum, h) => sum + (h.points || 0), 0);

    const totalPoints = user ? user.totalEngagementPoints || 0 : 0;

    return res.status(200).json({
      success: true,
      todayPoints: Math.max(0, todayPoints),
      weeklyPoints: Math.max(0, weeklyPoints),
      monthlyPoints: Math.max(0, monthlyPoints),
      totalPoints,
    });
  } catch (error) {
    console.error("GET CREATOR POINTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// TOTAL POINTS HISTORY API
// GET /api/creator/point-history
// ========================================
exports.getPointHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await CreatorPointHistory.find({ creatorId: userId })
      .populate("userId", "name username profileImage")
      .populate("reelId", "caption thumbnail")
      .sort({ createdAt: -1 })
      .lean();

    const formattedHistory = history.map((item) => ({
      _id: item._id,
      action: item.action,
      points: item.points,
      user: item.userId,
      reel: item.reelId,
      createdAt: item.createdAt,
    }));

    return res.status(200).json(formattedHistory);
  } catch (error) {
    console.error("GET POINT HISTORY ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// CREATOR DASHBOARD API (VERIFIED USERS ONLY)
// GET /api/creator/dashboard
// ========================================
exports.getCreatorDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isVerified = isVerifiedCreator(user);

    const todayStr = new Date().toISOString().split("T")[0];
    const analytics = await CreatorAnalytics.findOne({ creatorId: userId, date: todayStr });

    const reels = await Reel.find({ user: userId, status: "ACTIVE" }).select("_id viewsCount sharesCount").lean();
    const reelIds = reels.map((r) => r._id);

    const qualifiedViewsCount = await QualifiedView.countDocuments({
      creatorId: userId,
      isQualified: true,
    });

    const Interaction = require("../models/interaction.model");
    const Comment = require("../models/comment.model");

    let totalLikes = 0;
    let totalSaves = 0;

    if (reelIds.length > 0) {
      totalLikes = await Interaction.countDocuments({
        contentId: { $in: reelIds },
        contentType: "reel",
        type: "like",
      });

      totalSaves = await Interaction.countDocuments({
        contentId: { $in: reelIds },
        contentType: "reel",
        type: "bookmark",
      });
    }

    const totalComments = reelIds.length > 0 ? await Comment.countDocuments({ reel: { $in: reelIds }, status: "ACTIVE" }) : 0;

    const totalShares = reels.reduce((sum, r) => sum + (r.sharesCount || 0), 0);

    const followersCount = await Follow.countDocuments({ following: userId });

    let wallet = await CreatorWallet.findOne({ creatorId: userId });
    if (!wallet) {
      wallet = await CreatorWallet.create({
        creatorId: userId,
        totalPoints: user.totalEngagementPoints || 0,
        availablePoints: user.totalEngagementPoints || 0,
        walletBalance: Math.round((user.totalEngagementPoints || 0) * 0.1),
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayPointsHistory, weeklyHistory, monthlyHistory, recentHistoryDocs, reelsList] = await Promise.all([
      CreatorPointHistory.find({ creatorId: userId, createdAt: { $gte: startOfToday } }),
      CreatorPointHistory.find({ creatorId: userId, createdAt: { $gte: startOfWeek } }),
      CreatorPointHistory.find({ creatorId: userId, createdAt: { $gte: startOfMonth } }),
      CreatorPointHistory.find({ creatorId: userId })
        .populate("userId", "name username profileImage")
        .populate("reelId", "caption thumbnail thumbnailUrl viewsCount likesCount commentsCount sharesCount")
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      Reel.find({ user: userId, status: "ACTIVE" })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const todayPoints = todayPointsHistory.reduce((sum, h) => sum + (h.points || 0), 0);
    const weeklyPoints = weeklyHistory.reduce((sum, h) => sum + (h.points || 0), 0);
    const monthlyPoints = monthlyHistory.reduce((sum, h) => sum + (h.points || 0), 0);

    // Format top reels with interactions
    const topReels = await Promise.all(
      reelsList.map(async (r) => {
        const [likes, saves, comments] = await Promise.all([
          Interaction.countDocuments({ contentId: r._id, contentType: "reel", type: "like" }),
          Interaction.countDocuments({ contentId: r._id, contentType: "reel", type: "bookmark" }),
          Comment.countDocuments({ reel: r._id, status: "ACTIVE" }),
        ]);

        return {
          _id: r._id,
          caption: r.caption || "Untitled Reel",
          thumbnailUrl: r.thumbnailUrl || r.thumbnail || "",
          viewsCount: r.viewsCount || 0,
          sharesCount: r.sharesCount || 0,
          likesCount: likes,
          savesCount: saves,
          commentsCount: comments,
          createdAt: r.createdAt,
        };
      })
    );

    const qualityScore = user.qualityScore || (analytics ? analytics.qualityScore : 0);
    const creatorLevel = user.creatorLevel || determineCreatorLevel(qualityScore);

    return res.status(200).json({
      success: true,
      creatorLevel,
      qualityScore,
      totalPoints: user.totalEngagementPoints || 0,
      todayPoints: Math.max(0, todayPoints),
      weeklyPoints: Math.max(0, weeklyPoints),
      monthlyPoints: Math.max(0, monthlyPoints),
      qualifiedViews: qualifiedViewsCount || user.totalQualifiedViews || 0,
      watchMinutes: user.totalWatchMinutes || 0,
      completionRate: analytics ? analytics.completionRate : 70,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      followers: followersCount,
      redeemablePoints: wallet.availablePoints || 0,
      blueTick: isVerified,
      pointHistory: recentHistoryDocs.map((item) => ({
        _id: item._id,
        action: item.action,
        points: item.points,
        user: item.userId,
        reel: item.reelId,
        createdAt: item.createdAt,
      })),
      topReels,
    });
  } catch (error) {
    console.error("GET CREATOR DASHBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
