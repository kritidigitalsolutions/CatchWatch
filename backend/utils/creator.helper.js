const User = require("../models/user.model");
const Reel = require("../models/reel.model");
const QualifiedView = require("../models/qualifiedView.model");
const CreatorAnalytics = require("../models/creatorAnalytics.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const CreatorWallet = require("../models/creatorWallet.model");

/**
 * Decorates any User object with Blue Tick verification details.
 */
const decorateUserWithBlueTick = (userObj) => {
  if (!userObj) return userObj;

  const isDoc = typeof userObj.toObject === "function";
  const user = isDoc ? userObj.toObject() : { ...userObj };

  const isVerified = Boolean(
    user.isVerified ||
    (user.verification &&
      (user.verification.isVerified || user.verification.status === "VERIFIED"))
  );

  user.isVerified = isVerified;
  user.verificationType = user.verificationType || "OFFICIAL";
  user.blueTick = isVerified;

  if (user.verification) {
    user.verification.isVerified = isVerified;
  }

  return user;
};

/**
 * Determines creator level based on quality score (0-100).
 */
const determineCreatorLevel = (score) => {
  if (score >= 81) return "Premium Creator";
  if (score >= 61) return "Professional Creator";
  if (score >= 31) return "Rising Creator";
  return "Beginner";
};

/**
 * Calculates Quality Score based on metrics and dynamic system weights.
 */
const calculateQualityScore = ({
  watchTime = 0, // in seconds or minutes
  completionRate = 0, // 0 - 100 %
  shares = 0,
  saves = 0,
  comments = 0,
  likes = 0,
  followers = 0,
  weights = {
    qualifiedWatchTime: 35,
    completionRate: 20,
    shares: 15,
    saves: 10,
    comments: 10,
    likes: 5,
    newFollowers: 5,
  },
}) => {
  const wWatch = (weights.qualifiedWatchTime || 35) / 100;
  const wComp = (weights.completionRate || 20) / 100;
  const wShare = (weights.shares || 15) / 100;
  const wSave = (weights.saves || 10) / 100;
  const wComment = (weights.comments || 10) / 100;
  const wLike = (weights.likes || 5) / 100;
  const wFollow = (weights.newFollowers || 5) / 100;

  const normalizedWatchTime = Math.min(100, (watchTime / 60) * 10);
  const normalizedCompletion = Math.min(100, Math.max(0, completionRate));
  const normalizedShares = Math.min(100, (shares / 50) * 100);
  const normalizedSaves = Math.min(100, (saves / 50) * 100);
  const normalizedComments = Math.min(100, (comments / 100) * 100);
  const normalizedLikes = Math.min(100, (likes / 500) * 100);
  const normalizedFollowers = Math.min(100, (followers / 1000) * 100);

  const rawScore =
    normalizedWatchTime * wWatch * 100 +
    normalizedCompletion * wComp +
    normalizedShares * wShare * 100 +
    normalizedSaves * wSave * 100 +
    normalizedComments * wComment * 100 +
    normalizedLikes * wLike * 100 +
    normalizedFollowers * wFollow * 100;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  return finalScore;
};

/**
 * Validates whether a view counts as a Qualified View.
 */
const validateQualifiedView = async ({
  reel,
  viewerId,
  watchDuration,
  ip,
  deviceId,
}) => {
  if (!reel || !viewerId) return { qualified: false, reason: "Invalid parameters" };

  const creatorId = reel.user?._id || reel.user;
  if (!creatorId) return { qualified: false, reason: "Creator not found" };

  // Rule 1: Viewer is not creator
  if (String(viewerId) === String(creatorId)) {
    return { qualified: false, reason: "Viewer is creator" };
  }

  // Rule 2: Watch duration >= 3 seconds
  if (!watchDuration || watchDuration < 3) {
    return { qualified: false, reason: "Watch time < 3 seconds" };
  }

  // Rule 3: Viewer account is active
  const viewer = await User.findById(viewerId);
  if (!viewer || viewer.status === "Blocked") {
    return { qualified: false, reason: "Viewer inactive or blocked" };
  }

  // Rule 4: Fraud Detection / Anti-refresh spam (No qualified view on same reel within last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentQualifiedView = await QualifiedView.findOne({
    reelId: reel._id,
    viewerId,
    isQualified: true,
    createdAt: { $gte: oneHourAgo },
  });

  if (recentQualifiedView) {
    return { qualified: false, reason: "Duplicate view within cooldown period" };
  }

  return { qualified: true, creatorId, viewerId };
};

/**
 * Updates Creator Analytics, Total Points, Quality Score, and Wallet for an engagement event.
 */
const recordEngagementEvent = async ({
  creatorId,
  reelId = null,
  userId = null,
  action, // LIKE, UNLIKE, COMMENT, UNCOMMENT, SAVE, UNSAVE, SHARE, FOLLOW, UNFOLLOW, QUALIFIED_VIEW
  pointsDelta = 0,
  watchDuration = 0,
}) => {
  try {
    if (!creatorId) return;

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Point History Entry
    if (pointsDelta !== 0 && action) {
      await CreatorPointHistory.create({
        creatorId,
        reelId,
        action,
        points: pointsDelta,
        userId,
      });
    }

    // 2. Fetch Creator User
    const creator = await User.findById(creatorId);
    if (!creator) return;

    // Update Creator Total Engagement Points
    const newTotalPoints = Math.max(0, (creator.totalEngagementPoints || 0) + pointsDelta);
    creator.totalEngagementPoints = newTotalPoints;

    if (action === "QUALIFIED_VIEW") {
      creator.totalQualifiedViews = (creator.totalQualifiedViews || 0) + 1;
      creator.totalWatchMinutes = Math.round(
        (creator.totalWatchMinutes || 0) + watchDuration / 60
      );
    }
    if (action === "FOLLOW") {
      creator.totalCreatorFollowers = (creator.totalCreatorFollowers || 0) + 1;
    } else if (action === "UNFOLLOW") {
      creator.totalCreatorFollowers = Math.max(0, (creator.totalCreatorFollowers || 0) - 1);
    }

    // 3. Upsert Daily Creator Analytics
    let analytics = await CreatorAnalytics.findOne({ creatorId, date: todayStr });
    if (!analytics) {
      analytics = new CreatorAnalytics({ creatorId, date: todayStr });
    }

    if (action === "QUALIFIED_VIEW") {
      analytics.qualifiedViews += 1;
      analytics.watchTime += watchDuration;
    } else if (action === "LIKE") {
      analytics.likes += 1;
    } else if (action === "UNLIKE") {
      analytics.likes = Math.max(0, analytics.likes - 1);
    } else if (action === "COMMENT") {
      analytics.comments += 1;
    } else if (action === "UNCOMMENT") {
      analytics.comments = Math.max(0, analytics.comments - 1);
    } else if (action === "SAVE") {
      analytics.saves += 1;
    } else if (action === "UNSAVE") {
      analytics.saves = Math.max(0, analytics.saves - 1);
    } else if (action === "SHARE") {
      analytics.shares += 1;
    } else if (action === "FOLLOW") {
      analytics.newFollowers += 1;
    } else if (action === "UNFOLLOW") {
      analytics.newFollowers = Math.max(0, analytics.newFollowers - 1);
    }

    analytics.engagementPoints = Math.max(0, analytics.engagementPoints + pointsDelta);

    // Calculate dynamic completion rate & Quality Score
    const totalViews = Math.max(1, analytics.qualifiedViews);
    const completedViews = Math.round(analytics.watchTime / 15); // Avg reel ~15s
    const completionRate = Math.min(100, Math.round((completedViews / totalViews) * 100));
    analytics.completionRate = completionRate;

    const qualityScore = calculateQualityScore({
      watchTime: analytics.watchTime,
      completionRate,
      shares: analytics.shares,
      saves: analytics.saves,
      comments: analytics.comments,
      likes: analytics.likes,
      followers: analytics.newFollowers,
    });

    analytics.qualityScore = qualityScore;
    analytics.estimatedReward = Math.round(newTotalPoints * 0.1); // 10 points = 1 balance unit

    await analytics.save();

    // 4. Update Creator Level & Quality Score on User
    creator.qualityScore = qualityScore;
    creator.creatorLevel = determineCreatorLevel(qualityScore);
    await creator.save();

    // 5. Update Creator Wallet
    let wallet = await CreatorWallet.findOne({ creatorId });
    if (!wallet) {
      wallet = new CreatorWallet({ creatorId });
    }
    const currentRedeemed = wallet.redeemedPoints || 0;
    const currentTotalPoints = newTotalPoints;
    const availablePoints = Math.max(0, currentTotalPoints - currentRedeemed);

    wallet.totalPoints = currentTotalPoints;
    wallet.availablePoints = availablePoints;
    wallet.walletBalance = Math.round(availablePoints * 0.1);
    await wallet.save();

  } catch (error) {
    console.error("Record Engagement Event Error:", error);
  }
};

module.exports = {
  decorateUserWithBlueTick,
  determineCreatorLevel,
  calculateQualityScore,
  validateQualifiedView,
  recordEngagementEvent,
};
