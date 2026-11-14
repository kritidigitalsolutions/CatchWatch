const mongoose = require("mongoose");
const Reel = require("../models/reel.model");
const User = require("../models/user.model");
const Interaction = require("../models/interaction.model");
const {
  REELS_COMPLIANCE_REGEX,
  isIOSRequest,
  getCompliantReelsFilter,
  isCompliantFeedAd,
  formatSponsoredFeedAd,
} = require("../utils/reelCompliance.helper");
const createDefaultSponsoredAds = require("../utils/createDefaultSponsoredAds");

// ========================================
// UPLOAD REEL
// ========================================
exports.uploadReel = async (req, res) => {
  try {
    const { caption, hashtags } = req.body;

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    let hashtagsArray = [];

    if (hashtags) {
      try {
        hashtagsArray =
          typeof hashtags === "string"
            ? JSON.parse(hashtags)
            : hashtags;
      } catch {
        hashtagsArray = hashtags
          .split(",")
          .map((tag) => tag.trim());
      }
    }

    const resolvedVideoUrl = videoFile.path.replace(/\\/g, "/");
    const { parseBunnyStreamUrl } = require("../utils/mediaUrl");
    const streamInfo = parseBunnyStreamUrl(resolvedVideoUrl) || {};

    const uploadedThumbnail = thumbnailFile ? thumbnailFile.path.replace(/\\/g, "/") : (req.body.thumbnailUrl || req.body.thumbnail || "");
    const finalThumbnail = streamInfo.thumbnailUrl || uploadedThumbnail || "";

    const reel = await Reel.create({
      user: req.user.id,
      videoUrl: videoFile.path.replace(/\\/g, "/"),
      caption,
      hashtags: hashtagsArray,
      videoSource: streamInfo.videoSource || "bunny_storage",
      storageType: streamInfo.storageType || "bunny_storage",
      videoId: streamInfo.videoId || "",
      streamUrl: streamInfo.streamUrl || "",
      playlistUrl: streamInfo.playlistUrl || "",
      playbackUrl: streamInfo.playbackUrl || "",
      thumbnailUrl: finalThumbnail,
      encodingStatus: streamInfo.encodingStatus || "",
      thumbnail: finalThumbnail
    });

    try {
      const { notifyReelUploaded } = require("../utils/notificationDispatcher.helper");
      const creatorUser = await User.findById(req.user.id).select("name username avatar profileImage");
      if (creatorUser) {
        notifyReelUploaded(creatorUser, reel).catch((e) => console.log("Reel follower notif err:", e.message));
      }
    } catch (err) {
      console.error("Reel notification failed:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Reel uploaded successfully",
      reel,
    });
  } catch (error) {
    console.error("UPLOAD REEL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET REELS FEED (WITH UGC BLOCK FILTERING)
// ========================================
exports.getReelsFeed = async (req, res) => {
  try {
    // Check optional viewer auth token
    let userId = req.user?.id || req.user?._id || null;
    let isVerifiedUser = false;
    const authHeader = req.headers.authorization;

    if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded._id;
      } catch (err) {}
    }

    // Filter out content from blocked users (Apple Guideline 1.2)
    let blockedUserIds = [];
    if (userId) {
      const UserBlock = require("../models/userBlock.model");
      const blocks = await UserBlock.find({
        $or: [{ blocker: userId }, { blocked: userId }],
      }).select("blocker blocked").lean();
      blockedUserIds = blocks.map((b) =>
        b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
      );
    }

    const isIOS = isIOSRequest(req);
    const complianceFilter = getCompliantReelsFilter(isIOS);

    const reelQuery = {
      status: "ACTIVE",
      videoUrl: complianceFilter.videoUrl,
    };
    if (blockedUserIds.length > 0) {
      reelQuery.user = { $nin: blockedUserIds };
    }

    const parsedLimit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const parsedPage = req.query.page ? parseInt(req.query.page, 10) : 1;
    const defaultAdFrequency = 3;

    // Apply content filtering before pagination while maintaining expected page size
    let queryLimit = parsedLimit;
    let skip = 0;
    if (parsedLimit) {
      const adsPerPage = Math.max(1, Math.floor(parsedLimit / defaultAdFrequency));
      const reelsPerPage = Math.max(1, parsedLimit - adsPerPage);
      skip = (parsedPage - 1) * reelsPerPage;
      queryLimit = parsedLimit;
    }

    let reelFindQuery = Reel.find(reelQuery)
      .populate(
        "user",
        "name username profileImage bio verification isVerified"
      )
      .sort({ createdAt: -1 });

    if (queryLimit) {
      reelFindQuery = reelFindQuery.skip(skip).limit(queryLimit);
    }

    const [totalReelsCount, reels] = await Promise.all([
      Reel.countDocuments(reelQuery),
      reelFindQuery.lean(),
    ]);

    if (userId) {
      const User = require("../models/user.model");
      const Subscription = require("../models/subscription.model");

      const [viewerUser, activeSub] = await Promise.all([
        User.findById(userId).lean(),
        Subscription.findOne({
          user: userId,
          status: "ACTIVE",
          endDate: { $gte: new Date() },
        }),
      ]);

      if (
        viewerUser &&
        (viewerUser.isVerified ||
          viewerUser.verification?.status === "VERIFIED" ||
          Boolean(activeSub))
      ) {
        isVerifiedUser = true; // Premium / Verified user gets Ad-Free experience!
      }
    }

    const { decorateUserWithBlueTick } = require("../utils/creator.helper");

    if (reels.length > 0) {
      const reelIds = reels.map((r) => r._id);

      // Calculate total likes for all active reels
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach((item) => {
        likesMap[item._id.toString()] = item.count;
      });

      let interactionMap = {};
      let followedSet = new Set();

      if (userId) {
        const interactions = await Interaction.find({
          user: userId,
          contentId: { $in: reelIds },
          contentType: "reel",
        });
        interactions.forEach((int) => {
          interactionMap[int.contentId.toString()] = int.type;
        });

        const Follow = require("../models/follow.model");
        const authorIds = reels.map((r) => r.user?._id).filter(Boolean);
        const follows = await Follow.find({
          follower: userId,
          following: { $in: authorIds },
        })
          .select("following")
          .lean();
        follows.forEach((f) => followedSet.add(f.following.toString()));
      }

      reels.forEach((r) => {
        if (r.user) {
          r.user = decorateUserWithBlueTick(r.user);
        }
        const thumb = r.thumbnailUrl || r.thumbnail || "";
        r.thumbnailUrl = thumb;
        r.thumbnail = thumb;
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
        r.isFollowing = r.user?._id
          ? followedSet.has(r.user._id.toString())
          : false;
        r.isAd = false;
      });
    }

    // ── VERIFIED CREATOR ALGORITHMIC RECOMMENDATION BOOST ──
    // Verified (Orange Tick) creators get higher recommendation priority in the feed
    reels.sort((a, b) => {
      const aVerified =
        a.user?.orangeTick ||
        a.user?.blueTick ||
        a.user?.isVerified ||
        a.user?.verification?.isVerified ||
        a.user?.verification?.status === "VERIFIED" ||
        a.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      const bVerified =
        b.user?.orangeTick ||
        b.user?.blueTick ||
        b.user?.isVerified ||
        b.user?.verification?.isVerified ||
        b.user?.verification?.status === "VERIFIED" ||
        b.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // ── INSTAGRAM-STYLE SPONSORED AD INSERTION ENGINE ──
    let finalFeed = reels;

    try {
      const SystemSettings = require("../models/systemSettings.model");
      const AdCampaign = require("../models/adCampaign.model");
      const Ad = require("../models/ad.model");

      const settings = await SystemSettings.getSettings();
      const adFrequency = settings?.adSettings?.adFrequency || 3;
      const now = new Date();

      // Query active ad campaigns (Filtered specifically for Reels and Video placements, excluding movie-only ads)
      let activeCampaigns = await AdCampaign.find({
        $or: [
          { status: "ACTIVE" },
          { status: "active" },
          { status: { $exists: false } },
        ],
        adType: { $in: ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO"] },
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      // Filter by budget & dates
      let validCampaigns = activeCampaigns.filter((c) => {
        if (typeof c.budget === "number" && typeof c.spent === "number" && c.budget > 0 && c.spent >= c.budget) {
          return false;
        }
        if (c.startDate && new Date(c.startDate) > now) return false;
        return true;
      });

      let campaignIds = validCampaigns.map((c) => c._id);
      let activeAds = await Ad.find({
        $or: [
          { campaignId: { $in: campaignIds } },
          { status: "ACTIVE" },
          { status: "active" },
        ],
        adType: { $in: ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO"] },
        mediaUrl: { $exists: true, $ne: "" },
      })
        .populate("campaignId advertiserId", "name companyName businessName logo")
        .lean();

      // Compliance filtering: exclude YouTube, magnific.com, static images, and unsupported external redirects
      let eligibleAds = activeAds.filter((ad) => isCompliantFeedAd(ad, isIOS));

      // Guarantee legitimate sponsored video ads are available in feed
      if (eligibleAds.length === 0) {
        await createDefaultSponsoredAds();
        activeCampaigns = await AdCampaign.find({
          status: "ACTIVE",
          adType: { $in: ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO"] },
        }).lean();
        campaignIds = activeCampaigns.map((c) => c._id);
        activeAds = await Ad.find({
          campaignId: { $in: campaignIds },
          status: "ACTIVE",
          mediaUrl: { $exists: true, $ne: "" },
        }).lean();
        eligibleAds = activeAds.filter((ad) => isCompliantFeedAd(ad, isIOS));
      }

      if (eligibleAds.length > 0 && reels.length > 0) {
        finalFeed = [];
        let reelCounter = 0;
        let adInserted = false;

        const pickAd = () => {
          const weights = eligibleAds.map((ad) => {
            let p = ad.priority;
            if (!p && ad.campaignId) {
              const parent = validCampaigns.find((c) => String(c._id) === String(ad.campaignId));
              if (parent && parent.priority) p = parent.priority;
            }
            return Math.max(1, Number(p) || 1);
          });

          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          let randomVal = Math.random() * totalWeight;
          let chosenIdx = 0;

          for (let i = 0; i < eligibleAds.length; i++) {
            if (randomVal < weights[i]) {
              chosenIdx = i;
              break;
            }
            randomVal -= weights[i];
          }
          return eligibleAds[chosenIdx];
        };

        reels.forEach((reelItem) => {
          finalFeed.push(reelItem);
          if (reelItem.allowAds !== false) {
            reelCounter++;
            if (reelCounter % adFrequency === 0) {
              adInserted = true;
              const chosen = pickAd();
              finalFeed.push(formatSponsoredFeedAd(chosen, reelCounter));
            }
          }
        });

        // Ensure at least one legitimate sponsored video ad is included in feed
        if (!adInserted && eligibleAds.length > 0) {
          const chosen = pickAd();
          finalFeed.push(formatSponsoredFeedAd(chosen, reelCounter + 1));
        }

        // Maintain exact page size when limit is requested
        if (parsedLimit && finalFeed.length > parsedLimit) {
          finalFeed = finalFeed.slice(0, parsedLimit);
        }
      }
    } catch (adError) {
      console.error("Ad Insertion Error in Feed:", adError);
    }

    return res.status(200).json({
      success: true,
      count: finalFeed.length,
      total: totalReelsCount,
      page: parsedPage,
      limit: parsedLimit || finalFeed.length,
      isAdFree: isVerifiedUser,
      reels: finalFeed,
    });
  } catch (error) {
    console.error("GET FEED ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET SINGLE REEL
// ========================================
exports.getSingleReel = async (
  req,
  res
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    let reel = await Reel.findById(
      req.params.id
    )
      .populate(
        "user",
        "name username profileImage bio verification"
      )
      .lean();

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const { decorateUserWithBlueTick } = require("../utils/creator.helper");
    if (reel.user) {
      reel.user = decorateUserWithBlueTick(reel.user);
    }

    // Check if user is logged in (optional auth)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Ignored
      }
    }

    // Count likes dynamically from Interaction collection
    reel.likesCount = await Interaction.countDocuments({
      contentId: reel._id,
      contentType: "reel",
      type: "like",
    });

    const thumb = reel.thumbnailUrl || reel.thumbnail || "";
    reel.thumbnailUrl = thumb;
    reel.thumbnail = thumb;

    reel.userInteraction = null;
    if (userId) {
      const interaction = await Interaction.findOne({
        user: userId,
        contentId: reel._id,
        contentType: "reel",
      });
      if (interaction) {
        reel.userInteraction = interaction.type;
      }
    }

    return res.status(200).json({
      success: true,
      reel,
    });
  } catch (error) {
    console.error(
      "GET SINGLE REEL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// DELETE REEL
// ========================================
exports.deleteReel = async (
  req,
  res
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    const reel = await Reel.findById(
      req.params.id
    );

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const reelUserId = reel.user._id ? reel.user._id.toString() : reel.user.toString();
    if (reelUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your reels",
      });
    }

    reel.status = "DELETED";

    await reel.save();

    return res.status(200).json({
      success: true,
      message: "Reel deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE REEL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// INCREMENT VIEWS COUNT (WITH QUALIFIED VIEW RULES)
// ========================================
exports.incrementViews = async (req, res) => {
  try {
    const { id, reelId } = req.params;
    const targetReelId = id || reelId;
    const { watchDuration, deviceId } = req.body;
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

    if (!mongoose.Types.ObjectId.isValid(targetReelId)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    let reel = await Reel.findById(targetReelId);

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    // Try extract logged in viewer ID if auth header present
    let viewerId = req.user?.id || null;
    if (!viewerId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const jwt = require("jsonwebtoken");
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          viewerId = decoded.id;
        } catch (err) {}
      }
    }

    const isSelfView = viewerId && String(viewerId) === String(reel.user);

    // Only increment view count if viewer is NOT the creator
    if (!isSelfView) {
      reel = await Reel.findByIdAndUpdate(
        targetReelId,
        { $inc: { viewsCount: 1 } },
        { new: true }
      );
    }

    const { validateQualifiedView, recordEngagementEvent } = require("../utils/creator.helper");
    const { validateViewAttempt } = require("./fraud.controller");
    const QualifiedView = require("../models/qualifiedView.model");

    let isQualified = false;
    const durationNum = Number(watchDuration) || 0;
    const userAgent = req.headers["user-agent"] || "";

    // 1. Fraud Check
    const fraudCheck = await validateViewAttempt({
      viewerId,
      creatorId: reel.user,
      reelId: reel._id,
      watchDuration: durationNum,
      ip,
      deviceId: deviceId || "",
      userAgent,
    });

    if (viewerId && !isSelfView && fraudCheck.isQualified) {
      const validation = await validateQualifiedView({
        reel,
        viewerId,
        watchDuration: durationNum,
        ip,
        deviceId: deviceId || "",
      });

      isQualified = validation.qualified;

      await QualifiedView.create({
        creatorId: reel.user,
        viewerId,
        reelId: reel._id,
        watchDuration: durationNum,
        isQualified,
        deviceId: deviceId || "",
        ip,
      });

      if (isQualified) {
        await recordEngagementEvent({
          creatorId: reel.user,
          reelId: reel._id,
          userId: viewerId,
          action: "QUALIFIED_VIEW",
          pointsDelta: 0,
          watchDuration: durationNum,
        });
      }
    }

    return res.status(200).json({
      success: true,
      qualifiedView: isQualified,
      viewsCount: reel.viewsCount || 0,
    });
  } catch (error) {
    console.error("INCREMENT VIEWS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// REEL COMMENT COUNT API
// ========================================
exports.getCommentCount = async (req, res) => {
  try {
    const { id, reelId } = req.params;
    const targetReelId = id || reelId;

    if (!mongoose.Types.ObjectId.isValid(targetReelId)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    const Comment = require("../models/comment.model");
    const count = await Comment.countDocuments({
      reel: targetReelId,
      status: "ACTIVE",
    });

    return res.status(200).json({
      success: true,
      commentCount: count,
    });
  } catch (error) {
    console.error("GET COMMENT COUNT ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// INCREMENT SHARES COUNT (GRANT +5 POINTS FOR NON-SELF SHARES)
// ========================================
exports.incrementShares = async (req, res) => {
  try {
    const { id, reelId } = req.params;
    const targetReelId = id || reelId;

    if (!mongoose.Types.ObjectId.isValid(targetReelId)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    let reel = await Reel.findById(targetReelId);

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    // Try extract logged in user ID
    let userId = req.user?.id || null;
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const jwt = require("jsonwebtoken");
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
        } catch (err) {}
      }
    }

    const isSelfShare = userId && String(userId) === String(reel.user);

    // Only increment shares count if user is NOT the creator
    if (!isSelfShare) {
      reel = await Reel.findByIdAndUpdate(
        targetReelId,
        { $inc: { sharesCount: 1 } },
        { new: true }
      );
    }

    const { recordEngagementEvent } = require("../utils/creator.helper");
    await recordEngagementEvent({
      creatorId: reel.user,
      reelId: reel._id,
      userId,
      action: "SHARE",
      pointsDelta: isSelfShare ? 0 : 5,
    });

    return res.status(200).json({
      success: true,
      message: isSelfShare ? "Self share recorded (no points or count added)" : "Shares count incremented",
      shareCount: reel.sharesCount || 0,
      sharesCount: reel.sharesCount || 0,
    });
  } catch (error) {
    console.error("INCREMENT SHARES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// SAVE REEL API (GRANT +4 POINTS)
// ========================================
exports.saveReel = async (req, res) => {
  try {
    const { id, reelId } = req.params;
    const targetReelId = id || reelId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetReelId)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    const reel = await Reel.findById(targetReelId);
    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    const Interaction = require("../models/interaction.model");
    let existingSave = await Interaction.findOne({
      user: userId,
      contentId: reel._id,
      contentType: "reel",
      type: "bookmark",
    });

    if (!existingSave) {
      await Interaction.create({
        user: userId,
        contentId: reel._id,
        contentType: "reel",
        type: "bookmark",
      });

      const { recordEngagementEvent } = require("../utils/creator.helper");
      await recordEngagementEvent({
        creatorId: reel.user,
        reelId: reel._id,
        userId,
        action: "SAVE",
        pointsDelta: 4,
      });
    }

    const saveCount = await Interaction.countDocuments({
      contentId: reel._id,
      contentType: "reel",
      type: "bookmark",
    });

    return res.status(200).json({
      success: true,
      saved: true,
      saveCount,
    });
  } catch (error) {
    console.error("SAVE REEL ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// UNSAVE REEL API (DEDUCT -4 POINTS)
// ========================================
exports.unsaveReel = async (req, res) => {
  try {
    const { id, reelId } = req.params;
    const targetReelId = id || reelId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetReelId)) {
      return res.status(400).json({ success: false, message: "Invalid Reel ID" });
    }

    const reel = await Reel.findById(targetReelId);
    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    const Interaction = require("../models/interaction.model");
    const existingSave = await Interaction.findOneAndDelete({
      user: userId,
      contentId: reel._id,
      contentType: "reel",
      type: "bookmark",
    });

    if (existingSave) {
      const { recordEngagementEvent } = require("../utils/creator.helper");
      await recordEngagementEvent({
        creatorId: reel.user,
        reelId: reel._id,
        userId,
        action: "UNSAVE",
        pointsDelta: -4,
      });
    }

    const saveCount = await Interaction.countDocuments({
      contentId: reel._id,
      contentType: "reel",
      type: "bookmark",
    });

    return res.status(200).json({
      success: true,
      saved: false,
      saveCount,
    });
  } catch (error) {
    console.error("UNSAVE REEL ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================
// GET MY REELS
// ========================================
exports.getMyReels = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const isIOS = isIOSRequest(req);
    const complianceFilter = getCompliantReelsFilter(isIOS);

    const filter = {
      user: userId,
      status: "ACTIVE",
      videoUrl: complianceFilter.videoUrl,
    };

    const reels = await Reel.find(filter)
      .populate("user", "name username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Reel.countDocuments(filter);

    if (reels.length > 0) {
      const reelIds = reels.map(r => r._id);
      
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach(item => {
        likesMap[item._id.toString()] = item.count;
      });

      const interactions = await Interaction.find({
        user: userId,
        contentId: { $in: reelIds },
        contentType: "reel"
      });
      
      const interactionMap = {};
      interactions.forEach(int => {
        interactionMap[int.contentId.toString()] = int.type;
      });

      reels.forEach(r => {
        const thumb = r.thumbnailUrl || r.thumbnail || "";
        r.thumbnailUrl = thumb;
        r.thumbnail = thumb;
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
      });
    }

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      reels,
    });
  } catch (error) {
    console.error("GET MY REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET USER REELS
// ========================================
exports.getUserReels = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const isIOS = isIOSRequest(req);
    const complianceFilter = getCompliantReelsFilter(isIOS);

    const filter = {
      user: targetUserId,
      status: "ACTIVE",
      videoUrl: complianceFilter.videoUrl,
    };

    const reels = await Reel.find(filter)
      .populate("user", "name username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Reel.countDocuments(filter);

    let requesterId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requesterId = decoded.id;
      } catch (err) {
        // Ignored
      }
    }

    if (reels.length > 0) {
      const reelIds = reels.map(r => r._id);
      
      const likesCounts = await Interaction.aggregate([
        {
          $match: {
            contentId: { $in: reelIds },
            contentType: "reel",
            type: "like",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ]);

      const likesMap = {};
      likesCounts.forEach(item => {
        likesMap[item._id.toString()] = item.count;
      });

      let interactionMap = {};
      if (requesterId) {
        const interactions = await Interaction.find({
          user: requesterId,
          contentId: { $in: reelIds },
          contentType: "reel"
        });
        interactions.forEach(int => {
          interactionMap[int.contentId.toString()] = int.type;
        });
      }

      reels.forEach(r => {
        const thumb = r.thumbnailUrl || r.thumbnail || "";
        r.thumbnailUrl = thumb;
        r.thumbnail = thumb;
        r.likesCount = likesMap[r._id.toString()] || 0;
        r.userInteraction = interactionMap[r._id.toString()] || null;
      });
    }

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      reels,
    });
  } catch (error) {
    console.error("GET USER REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// SEARCH REELS (CASE-INSENSITIVE / LETTER-BY-LETTER)
// ========================================
exports.searchReels = async (req, res) => {
  try {
    const { q, query, search, limit = 50, page = 1 } = req.query;
    const searchTerm = (q || query || search || "").trim();

    if (!searchTerm) {
      return res.status(200).json({
        success: true,
        count: 0,
        reels: [],
      });
    }

    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

    // 1. Find users matching name or username
    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { username: searchRegex },
      ],
    }).select("_id").lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    // 2. Find Reels matching caption, hashtags, or creator user ID with compliance filtering before pagination
    const isIOS = isIOSRequest(req);
    const complianceFilter = getCompliantReelsFilter(isIOS);

    const filter = {
      status: "ACTIVE",
      videoUrl: complianceFilter.videoUrl,
      $or: [
        { caption: searchRegex },
        { hashtags: searchRegex },
        { user: { $in: matchingUserIds } },
      ],
    };

    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [total, reels] = await Promise.all([
      Reel.countDocuments(filter),
      Reel.find(filter)
        .populate("user", "name username profileImage bio verification isVerified")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
    ]);

    // Format thumbnails & apply Verified Creator Search Ranking Boost
    reels.forEach((r) => {
      const thumb = r.thumbnailUrl || r.thumbnail || "";
      r.thumbnailUrl = thumb;
      r.thumbnail = thumb;
    });

    // ── HIGHER SEARCH RANKING FOR VERIFIED CREATORS ──
    reels.sort((a, b) => {
      const aVerified =
        a.user?.isVerified ||
        a.user?.verification?.isVerified ||
        a.user?.verification?.status === "VERIFIED" ||
        a.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      const bVerified =
        b.user?.isVerified ||
        b.user?.verification?.isVerified ||
        b.user?.verification?.status === "VERIFIED" ||
        b.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json({
      success: true,
      count: reels.length,
      total,
      page: parsedPage,
      limit: parsedLimit,
      reels,
    });
  } catch (error) {
    console.error("SEARCH REELS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during reels search",
    });
  }
};
