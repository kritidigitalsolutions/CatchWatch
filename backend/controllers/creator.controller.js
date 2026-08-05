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

    const Interaction = require("../models/interaction.model");
    const Comment = require("../models/comment.model");
    const QualifiedView = require("../models/qualifiedView.model");
    const CreatorPointHistory = require("../models/creatorPointHistory.model");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Helpers to count interactions excluding self-interactions
    const countLikes = async (since) => {
      if (reelIds.length === 0) return 0;
      const filter = { contentId: { $in: reelIds }, contentType: "reel", type: "like", user: { $ne: userId } };
      if (since) filter.createdAt = { $gte: since };
      return Interaction.countDocuments(filter);
    };

    const countComments = async (since) => {
      if (reelIds.length === 0) return 0;
      const filter = { reel: { $in: reelIds }, user: { $ne: userId }, status: { $ne: "DELETED" } };
      if (since) filter.createdAt = { $gte: since };
      return Comment.countDocuments(filter);
    };

    const countViews = async (since) => {
      const filter = { creatorId: userId, isQualified: true, viewerId: { $ne: userId } };
      if (since) filter.createdAt = { $gte: since };
      return QualifiedView.countDocuments(filter);
    };

    const countSaves = async (since) => {
      if (reelIds.length === 0) return 0;
      const filter = { contentId: { $in: reelIds }, contentType: "reel", type: "bookmark", user: { $ne: userId } };
      if (since) filter.createdAt = { $gte: since };
      return Interaction.countDocuments(filter);
    };

    const countShares = async (since) => {
      const filter = { creatorId: userId, action: "SHARE", userId: { $ne: userId } };
      if (since) filter.createdAt = { $gte: since };
      return CreatorPointHistory.countDocuments(filter);
    };

    const [
      likesToday, likesWeek, likesMonth, likesYear, likesTotal,
      commentsToday, commentsWeek, commentsMonth, commentsYear, commentsTotal,
      viewsToday, viewsWeek, viewsMonth, viewsYear, viewsTotal,
      savesToday, savesWeek, savesMonth, savesYear, savesTotal,
      sharesToday, sharesWeek, sharesMonth, sharesYear, sharesTotal,
      followersCount,
    ] = await Promise.all([
      countLikes(startOfToday), countLikes(startOfWeek), countLikes(startOfMonth), countLikes(startOfYear), countLikes(null),
      countComments(startOfToday), countComments(startOfWeek), countComments(startOfMonth), countComments(startOfYear), countComments(null),
      countViews(startOfToday), countViews(startOfWeek), countViews(startOfMonth), countViews(startOfYear), countViews(null),
      countSaves(startOfToday), countSaves(startOfWeek), countSaves(startOfMonth), countSaves(startOfYear), countSaves(null),
      countShares(startOfToday), countShares(startOfWeek), countShares(startOfMonth), countShares(startOfYear), countShares(null),
      Follow.countDocuments({ following: userId }),
    ]);

    const likesByTime = { today: likesToday, week: likesWeek, month: likesMonth, year: likesYear, total: likesTotal };
    const commentsByTime = { today: commentsToday, week: commentsWeek, month: commentsMonth, year: commentsYear, total: commentsTotal };
    const viewsByTime = { today: viewsToday, week: viewsWeek, month: viewsMonth, year: viewsYear, total: viewsTotal };
    const savesByTime = { today: savesToday, week: savesWeek, month: savesMonth, year: savesYear, total: savesTotal };
    const sharesByTime = { today: sharesToday, week: sharesWeek, month: sharesMonth, year: sharesYear, total: sharesTotal };

    const timeStats = {
      today: { likes: likesToday, comments: commentsToday, views: viewsToday, saves: savesToday, shares: sharesToday },
      week: { likes: likesWeek, comments: commentsWeek, views: viewsWeek, saves: savesWeek, shares: sharesWeek },
      month: { likes: likesMonth, comments: commentsMonth, views: viewsMonth, saves: savesMonth, shares: sharesMonth },
      year: { likes: likesYear, comments: commentsYear, views: viewsYear, saves: savesYear, shares: sharesYear },
      total: { likes: likesTotal, comments: commentsTotal, views: viewsTotal, saves: savesTotal, shares: sharesTotal },
    };

    const timeframe = String(req.query.timeframe || "all").toLowerCase();
    const selectedStats = timeStats[timeframe] || timeStats.total;

    let wallet = await CreatorWallet.findOne({ creatorId: userId });
    if (!wallet) {
      wallet = await CreatorWallet.create({
        creatorId: userId,
        totalPoints: user.totalEngagementPoints || 0,
        availablePoints: user.totalEngagementPoints || 0,
        walletBalance: Math.round((user.totalEngagementPoints || 0) * 0.1),
      });
    }

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

    // Format top reels with non-self interaction counts
    const topReels = await Promise.all(
      reelsList.map(async (r) => {
        const [likes, saves, comments] = await Promise.all([
          Interaction.countDocuments({ contentId: r._id, contentType: "reel", type: "like", user: { $ne: userId } }),
          Interaction.countDocuments({ contentId: r._id, contentType: "reel", type: "bookmark", user: { $ne: userId } }),
          Comment.countDocuments({ reel: r._id, user: { $ne: userId }, status: "ACTIVE" }),
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
      timeframe,
      creatorLevel,
      qualityScore,
      totalPoints: user.totalEngagementPoints || 0,
      todayPoints: Math.max(0, todayPoints),
      weeklyPoints: Math.max(0, weeklyPoints),
      monthlyPoints: Math.max(0, monthlyPoints),
      qualifiedViews: viewsByTime.total || user.totalQualifiedViews || 0,
      watchMinutes: user.totalWatchMinutes || 0,
      completionRate: analytics ? analytics.completionRate : 70,
      likes: selectedStats.likes,
      comments: selectedStats.comments,
      shares: selectedStats.shares,
      saves: selectedStats.saves,
      followers: followersCount,
      likesByTime,
      commentsByTime,
      viewsByTime,
      savesByTime,
      sharesByTime,
      timeStats,
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

// ========================================
// PUBLIC / USER CREATOR LEADERBOARD API
// GET /api/creator/leaderboard?timeframe=today|week|month|year|all&limit=50
// ========================================
exports.getLeaderboard = async (req, res) => {
  try {
    const timeframe = String(req.query.timeframe || "all").toLowerCase();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const viewerId = req.user?.id || null;

    const Follow = require("../models/follow.model");

    const now = new Date();
    let startDate = null;

    if (timeframe === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeframe === "week") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setDate(startDate.getDate() - startDate.getDay());
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    let topCreators = [];

    if (!startDate || timeframe === "all") {
      topCreators = await User.find({
        $or: [{ isCreator: true }, { totalEngagementPoints: { $gt: 0 } }]
      })
        .select("name username profileImage verification isVerified qualityScore creatorLevel totalEngagementPoints totalQualifiedViews totalWatchMinutes createdAt")
        .sort({ totalEngagementPoints: -1, qualityScore: -1, totalQualifiedViews: -1 })
        .limit(limit)
        .lean();
    } else {
      const pointAgg = await CreatorPointHistory.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$creatorId", periodPoints: { $sum: "$points" } } },
        { $sort: { periodPoints: -1 } },
        { $limit: limit }
      ]);

      const creatorIds = pointAgg.map((item) => item._id);
      const periodPointsMap = pointAgg.reduce((map, item) => {
        map[item._id.toString()] = item.periodPoints;
        return map;
      }, {});

      const users = await User.find({ _id: { $in: creatorIds } })
        .select("name username profileImage verification isVerified qualityScore creatorLevel totalEngagementPoints totalQualifiedViews totalWatchMinutes createdAt")
        .lean();

      topCreators = creatorIds
        .map((id) => {
          const userDoc = users.find((u) => u._id.toString() === id.toString());
          if (!userDoc) return null;
          return {
            ...userDoc,
            periodPoints: periodPointsMap[id.toString()] || 0
          };
        })
        .filter(Boolean);

      if (topCreators.length < limit) {
        const existingIds = new Set(topCreators.map((u) => u._id.toString()));
        const remaining = await User.find({
          _id: { $nin: Array.from(existingIds) },
          $or: [{ isCreator: true }, { totalEngagementPoints: { $gt: 0 } }]
        })
          .select("name username profileImage verification isVerified qualityScore creatorLevel totalEngagementPoints totalQualifiedViews totalWatchMinutes createdAt")
          .sort({ totalEngagementPoints: -1, qualityScore: -1 })
          .limit(limit - topCreators.length)
          .lean();

        topCreators.push(
          ...remaining.map((u) => ({ ...u, periodPoints: 0 }))
        );
      }
    }

    const rankedLeaderboard = await Promise.all(
      topCreators.map(async (creator, index) => {
        const decorated = decorateUserWithBlueTick(creator);
        const rank = index + 1;

        const [reelsCount, followersCount] = await Promise.all([
          Reel.countDocuments({ user: creator._id, status: "ACTIVE" }),
          Follow.countDocuments({ following: creator._id }),
        ]);

        const badges = [];
        if (rank === 1) badges.push("👑 #1 Champion");
        else if (rank === 2) badges.push("🥈 #2 Runner Up");
        else if (rank === 3) badges.push("🥉 #3 Podium Finish");

        if (decorated.blueTick) badges.push("Verified Official");
        if ((creator.qualityScore || 0) >= 81) badges.push("Premium Creator");
        if (reelsCount >= 5) badges.push("Top Publisher");
        if (followersCount >= 10) badges.push("Popular Creator");

        return {
          rank,
          _id: creator._id,
          name: creator.name || "Anonymous Creator",
          username: creator.username || `@creator_${creator._id.toString().slice(-4)}`,
          profileImage: creator.profileImage || "",
          blueTick: Boolean(decorated.blueTick),
          qualityScore: creator.qualityScore || 0,
          creatorLevel: creator.creatorLevel || determineCreatorLevel(creator.qualityScore || 0),
          totalPoints: creator.totalEngagementPoints || 0,
          periodPoints: creator.periodPoints !== undefined ? creator.periodPoints : (creator.totalEngagementPoints || 0),
          qualifiedViews: creator.totalQualifiedViews || 0,
          watchMinutes: creator.totalWatchMinutes || 0,
          reelsCount,
          followersCount,
          badges,
        };
      })
    );

    let currentUserRank = null;
    if (viewerId) {
      const viewerIndex = rankedLeaderboard.findIndex((u) => u._id.toString() === viewerId.toString());
      if (viewerIndex !== -1) {
        currentUserRank = rankedLeaderboard[viewerIndex];
      } else {
        const viewerDoc = await User.findById(viewerId);
        if (viewerDoc) {
          const decoratedViewer = decorateUserWithBlueTick(viewerDoc);
          const higherCount = await User.countDocuments({
            totalEngagementPoints: { $gt: viewerDoc.totalEngagementPoints || 0 }
          });
          const [reelsCount, followersCount] = await Promise.all([
            Reel.countDocuments({ user: viewerId, status: "ACTIVE" }),
            Follow.countDocuments({ following: viewerId }),
          ]);

          currentUserRank = {
            rank: higherCount + 1,
            _id: viewerDoc._id,
            name: viewerDoc.name || "You",
            username: viewerDoc.username || "@you",
            profileImage: viewerDoc.profileImage || "",
            blueTick: Boolean(decoratedViewer.blueTick),
            qualityScore: viewerDoc.qualityScore || 0,
            creatorLevel: viewerDoc.creatorLevel || determineCreatorLevel(viewerDoc.qualityScore || 0),
            totalPoints: viewerDoc.totalEngagementPoints || 0,
            periodPoints: viewerDoc.totalEngagementPoints || 0,
            qualifiedViews: viewerDoc.totalQualifiedViews || 0,
            watchMinutes: viewerDoc.totalWatchMinutes || 0,
            reelsCount,
            followersCount,
            badges: ["Active Member"],
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      timeframe,
      totalCount: rankedLeaderboard.length,
      leaderboard: rankedLeaderboard,
      currentUserRank,
    });
  } catch (error) {
    console.error("GET LEADERBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
