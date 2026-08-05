const mongoose = require("mongoose");
const Reel = require("../models/reel.model");
const User = require("../models/user.model");
const Interaction = require("../models/interaction.model");

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
      const { notifyNewContent } = require("../utils/contentNotification");
      await notifyNewContent({
        title: "🔥 New Reel Uploaded",
        message: caption ? `${caption.slice(0, 50)}...` : "A new short reel has been uploaded.",
        type: "NEW_REEL",
        actionUrl: `/reels-feed`,
        createdBy: req.user?.id || req.user?._id,
      });
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
// GET REELS FEED
// ========================================
exports.getReelsFeed = async (req, res) => {
  try {
    const reels = await Reel.find({
      status: "ACTIVE",
    })
      .populate(
        "user",
        "name username profileImage bio verification isVerified"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Check optional viewer auth token
    let userId = null;
    let isVerifiedUser = false;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded._id;
      } catch (err) {}
    }

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

    // AD INSERTION ENGINE (Only if user is UNVERIFIED & Ads are enabled)
    let finalFeed = reels;

    if (!isVerifiedUser) {
      try {
        const SystemSettings = require("../models/systemSettings.model");
        const AdCampaign = require("../models/adCampaign.model");
        const Ad = require("../models/ad.model");

        const settings = await SystemSettings.getSettings();
        const adFrequency = settings.adSettings?.adFrequency || 3;
        const now = new Date();

        // Query active ad campaigns
        const activeCampaigns = await AdCampaign.find({
          status: "ACTIVE",
          startDate: { $lte: now },
          endDate: { $gte: now },
          $expr: { $gt: ["$budget", "$spent"] },
        })
          .sort({ priority: -1 })
          .lean();

        if (activeCampaigns.length > 0) {
          const campaignIds = activeCampaigns.map((c) => c._id);
          const activeAds = await Ad.find({
            campaignId: { $in: campaignIds },
            status: "ACTIVE",
          }).lean();

          if (activeAds.length > 0) {
            finalFeed = [];
            let reelCounter = 0;

            reels.forEach((reelItem) => {
              finalFeed.push(reelItem);
              if (reelItem.allowAds !== false) {
                reelCounter++;
                if (reelCounter % adFrequency === 0) {
                  // Pick random active ad creative
                  const selectedAd =
                    activeAds[Math.floor(Math.random() * activeAds.length)];
                  finalFeed.push({
                    _id: `ad_${reelCounter}_${selectedAd._id}`,
                    adId: selectedAd._id,
                    campaignId: selectedAd.campaignId,
                    advertiserId: selectedAd.advertiserId,
                    title: selectedAd.title || "Sponsored Ad",
                    caption: selectedAd.title || "Sponsored Ad",
                    adType: selectedAd.adType || "VIDEO",
                    mediaUrl: selectedAd.mediaUrl,
                    videoUrl: selectedAd.mediaUrl,
                    thumbnailUrl: selectedAd.thumbnailUrl || selectedAd.mediaUrl,
                    ctaText: selectedAd.ctaText || "Learn More",
                    destinationUrl: selectedAd.destinationUrl || "#",
                    durationSeconds: selectedAd.durationSeconds || 15,
                    isAd: true,
                    user: {
                      name: "Sponsored Ad",
                      username: "@sponsored",
                      profileImage: selectedAd.thumbnailUrl || "",
                      isVerified: true,
                    },
                  });
                }
              }
            });
          }
        }
      } catch (adError) {
        console.error("Ad Insertion Error in Feed:", adError);
      }
    }

    return res.status(200).json({
      success: true,
      count: finalFeed.length,
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

    const filter = {
      user: userId,
      status: "ACTIVE",
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

    const filter = {
      user: targetUserId,
      status: "ACTIVE",
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
