const mongoose = require("mongoose");
const AdCampaign = require("../models/adCampaign.model");
const Ad = require("../models/ad.model");
const AdAnalytics = require("../models/adAnalytics.model");
const SystemSettings = require("../models/systemSettings.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

/**
 * Create Ad Campaign (Direct Admin & System Campaign Creation)
 */
exports.createCampaign = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    let {
      campaignName,
      businessName,
      companyName,
      email,
      phone,
      budget,
      dailyLimit,
      startDate,
      endDate,
      priority,
      targetAudience,
      adType,
      title,
      mediaUrl,
      thumbnailUrl,
      ctaText,
      destinationUrl,
      durationSeconds,
      category,
    } = req.body;

    // Extract uploaded files from Multer if present
    const mediaFile = req.files?.mediaFile?.[0] || req.files?.media?.[0];
    const thumbnailFile = req.files?.thumbnailFile?.[0] || req.files?.thumbnail?.[0];

    if (mediaFile) {
      mediaUrl = mediaFile.cdnUrl || mediaFile.path || mediaUrl;
    }
    if (thumbnailFile) {
      thumbnailUrl = thumbnailFile.cdnUrl || thumbnailFile.path || thumbnailUrl;
    }

    const campaign = await AdCampaign.create({
      campaignName: campaignName || "New Campaign",
      businessName: businessName || req.user?.name || "CatchWatch Advertiser",
      companyName: companyName || businessName || "CatchWatch Advertiser",
      email: email || "ads@catchwatch.com",
      phone: phone || "0000000000",
      adType: adType || (mediaFile?.mimetype?.startsWith("image/") ? "IMAGE" : "SPONSORED_REELS"),
      mediaUrl: mediaUrl || "",
      destinationUrl: destinationUrl || "#",
      budget: budget || 1000,
      dailyLimit: dailyLimit || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: priority || 1,
      targetAudience: targetAudience || {},
      status: req.user?.role === "ADMIN" ? "ACTIVE" : "ACTIVE",
      paymentStatus: "PAID",
    });

    // If creative media or file included, create initial Ad creative
    if (mediaUrl || title || mediaFile) {
      await Ad.create({
        title: title || campaignName,
        campaignId: campaign._id,
        adType: adType || (mediaFile?.mimetype?.startsWith("image/") ? "IMAGE" : "SPONSORED_REELS"),
        mediaUrl: mediaUrl || "",
        thumbnailUrl: thumbnailUrl || "",
        ctaText: ctaText || "Learn More",
        destinationUrl: destinationUrl || "#",
        durationSeconds: durationSeconds || 15,
        category: category || "General",
        priority: priority ? Number(priority) : 1,
        status: "ACTIVE",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    console.error("CREATE CAMPAIGN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Campaigns list with filtering (Admin & Advertiser)
 */
exports.getCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    let query = {};
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (search) {
      query.campaignName = new RegExp(search.trim(), "i");
    }

    const total = await AdCampaign.countDocuments(query);
    const campaigns = await AdCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach ads count & ctr
    const formattedCampaigns = await Promise.all(
      campaigns.map(async (c) => {
        const adsCount = await Ad.countDocuments({ campaignId: c._id });
        const ctr = c.totalImpressions > 0 ? ((c.totalClicks / c.totalImpressions) * 100).toFixed(2) : "0.00";
        return {
          ...c,
          adsCount,
          ctr,
          remainingBudget: Math.max(0, c.budget - c.spent),
        };
      })
    );

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      campaigns: formattedCampaigns,
    });
  } catch (error) {
    console.error("GET CAMPAIGNS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update Campaign (Status approve/reject/pause/resume, budget)
 */
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, budget, rejectionReason } = req.body;

    const campaign = await AdCampaign.findById(id).populate("advertiserId");
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    let newStatus = status;
    if (action === "APPROVE") newStatus = "ACTIVE";
    if (action === "REJECT") newStatus = "REJECTED";
    if (action === "PAUSE") newStatus = "PAUSED";
    if (action === "RESUME") newStatus = "ACTIVE";
    if (action === "CANCEL") newStatus = "COMPLETED";

    if (newStatus) campaign.status = newStatus;
    if (budget) campaign.budget = budget;
    if (rejectionReason) campaign.rejectionReason = rejectionReason;

    await campaign.save();

    // Update ads status
    if (newStatus === "ACTIVE" || newStatus === "PAUSED" || newStatus === "COMPLETED") {
      await Ad.updateMany({ campaignId: campaign._id }, { status: newStatus });
    }

    // Send Notification to Advertiser
    if (campaign.advertiserId?.userId) {
      let notifTitle = "Campaign Status Update";
      let notifMsg = `Your campaign "${campaign.campaignName}" is now ${campaign.status}.`;
      if (newStatus === "ACTIVE") {
        notifTitle = "Campaign Approved & Running 🚀";
        notifMsg = `Your campaign "${campaign.campaignName}" has been approved and is now active!`;
      } else if (newStatus === "REJECTED") {
        notifTitle = "Campaign Rejected";
        notifMsg = `Your campaign "${campaign.campaignName}" was rejected. ${rejectionReason ? "Reason: " + rejectionReason : ""}`;
      }

      await Notification.create({
        title: notifTitle,
        message: notifMsg,
        type: "SYSTEM",
        targetUser: campaign.advertiserId.userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Campaign status updated to ${campaign.status}`,
      campaign,
    });
  } catch (error) {
    console.error("UPDATE CAMPAIGN STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Duplicate Campaign
 */
exports.duplicateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await AdCampaign.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const newCampaign = await AdCampaign.create({
      campaignName: `${existing.campaignName} (Copy)`,
      advertiserId: existing.advertiserId,
      budget: existing.budget,
      dailyLimit: existing.dailyLimit,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: existing.priority,
      targetAudience: existing.targetAudience,
      status: "DRAFT",
      paymentStatus: "PENDING",
    });

    const ads = await Ad.find({ campaignId: existing._id });
    for (let ad of ads) {
      await Ad.create({
        title: `${ad.title} (Copy)`,
        campaignId: newCampaign._id,
        advertiserId: ad.advertiserId,
        adType: ad.adType,
        mediaUrl: ad.mediaUrl,
        thumbnailUrl: ad.thumbnailUrl,
        ctaText: ad.ctaText,
        destinationUrl: ad.destinationUrl,
        durationSeconds: ad.durationSeconds,
        category: ad.category,
        status: "DRAFT",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Campaign duplicated successfully",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("DUPLICATE CAMPAIGN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Universal Content Ad Placement Server (Movies, Short Films, TV Shows, Banners, Reels)
 * Returns an active Ad creative for insertion into Movies, Short Films, TV Shows, Banners, or Reels
 */
exports.getContentAd = async (req, res) => {
  try {
    const { placement = "ALL" } = req.query; // "MOVIES", "SHORT_FILMS", "TV_SHOWS", "BANNER", "SPONSORED_REELS", "ALL"
    const upperPlacement = String(placement || "ALL").toUpperCase();
    const now = new Date();

    // Query active campaigns (resilient to date/budget/casing)
    let activeCampaigns = await AdCampaign.find({
      $or: [
        { status: "ACTIVE" },
        { status: "active" },
        { status: { $exists: false } },
      ],
    }).sort({ priority: -1, createdAt: -1 });

    // Filter by budget & dates if present
    activeCampaigns = activeCampaigns.filter((c) => {
      // If budget and spent are numbers and spent >= budget, skip
      if (typeof c.budget === "number" && typeof c.spent === "number" && c.budget > 0 && c.spent >= c.budget) {
        return false;
      }
      // If startDate is set and in future, skip
      if (c.startDate && new Date(c.startDate) > now) {
        return false;
      }
      // If endDate is set and in past, skip
      if (c.endDate && new Date(c.endDate) < now) {
        return false;
      }
      return true;
    });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return res.status(200).json({
        success: true,
        hasAd: false,
        ad: null,
      });
    }

    let targetTypes = [];
    if (upperPlacement === "MOVIES" || upperPlacement === "MOVIE") {
      targetTypes = ["MOVIES", "ALL_CONTENT"];
    } else if (upperPlacement === "SHORT_FILMS" || upperPlacement === "SHORT_FILM" || upperPlacement === "SHORTS") {
      targetTypes = ["SHORT_FILMS", "ALL_CONTENT"];
    } else if (upperPlacement === "TV_SHOWS" || upperPlacement === "TV_SHOW" || upperPlacement === "SERIES" || upperPlacement === "EPISODE") {
      targetTypes = ["TV_SHOWS", "ALL_CONTENT"];
    } else if (upperPlacement === "BANNER" || upperPlacement === "IMAGE" || upperPlacement === "DISPLAY") {
      targetTypes = ["BANNER", "IMAGE", "ALL_CONTENT"];
    } else if (upperPlacement === "REELS" || upperPlacement === "SPONSORED_REELS") {
      targetTypes = ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT"];
    } else {
      targetTypes = ["MOVIES", "SHORT_FILMS", "TV_SHOWS", "SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO", "IMAGE", "BANNER"];
    }

    // Filter campaigns matching placement or ALL_CONTENT
    const matchingCampaigns = activeCampaigns.filter((c) => {
      if (!c.adType || c.adType === "ALL_CONTENT") return true;
      return targetTypes.includes(c.adType);
    });

    if (matchingCampaigns.length === 0) {
      return res.status(200).json({
        success: true,
        hasAd: false,
        ad: null,
      });
    }

    const campaignIds = matchingCampaigns.map((c) => c._id);

    // Find active ads matching the placement strictly
    let adCreatives = await Ad.find({
      campaignId: { $in: campaignIds },
      adType: { $in: targetTypes },
      $or: [{ status: "ACTIVE" }, { status: "active" }, { status: { $exists: false } }],
    });

    let selectedAd = null;
    let parentCampaign = null;

    if (adCreatives && adCreatives.length > 0) {
      // Weighted Random Selection: Higher priority ads have proportionally higher chance to be chosen
      const weights = adCreatives.map((ad) => {
        let p = ad.priority;
        if (!p && ad.campaignId) {
          const parent = matchingCampaigns.find((c) => String(c._id) === String(ad.campaignId));
          if (parent && parent.priority) p = parent.priority;
        }
        return Math.max(1, Number(p) || 1);
      });

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let randomVal = Math.random() * totalWeight;
      let chosenIdx = 0;

      for (let i = 0; i < adCreatives.length; i++) {
        if (randomVal < weights[i]) {
          chosenIdx = i;
          break;
        }
        randomVal -= weights[i];
      }

      selectedAd = adCreatives[chosenIdx];
      parentCampaign = matchingCampaigns.find(
        (c) => String(c._id) === String(selectedAd.campaignId)
      ) || matchingCampaigns[0];
    } else {
      // Fallback directly to matching campaigns with mediaUrl (also weighted by campaign priority)
      const validCampaignsWithMedia = matchingCampaigns.filter(
        (c) => c.mediaUrl && c.mediaUrl.trim() !== "" && (!c.adType || targetTypes.includes(c.adType))
      );

      if (validCampaignsWithMedia.length > 0) {
        const weights = validCampaignsWithMedia.map((c) => Math.max(1, Number(c.priority) || 1));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let randomVal = Math.random() * totalWeight;
        let chosenIdx = 0;

        for (let i = 0; i < validCampaignsWithMedia.length; i++) {
          if (randomVal < weights[i]) {
            chosenIdx = i;
            break;
          }
          randomVal -= weights[i];
        }

        const campaignWithMedia = validCampaignsWithMedia[chosenIdx];
        parentCampaign = campaignWithMedia;
        selectedAd = {
          _id: campaignWithMedia._id,
          campaignId: campaignWithMedia._id,
          title: campaignWithMedia.campaignName || campaignWithMedia.businessName || "Featured Ad",
          adType: campaignWithMedia.adType || (upperPlacement === "BANNER" ? "BANNER" : "VIDEO"),
          mediaUrl: campaignWithMedia.mediaUrl,
          thumbnailUrl: campaignWithMedia.mediaUrl,
          ctaText: "Learn More",
          destinationUrl: campaignWithMedia.destinationUrl || "#",
          durationSeconds: 15,
        };
      }
    }

    if (!selectedAd || !selectedAd.mediaUrl) {
      return res.status(200).json({
        success: true,
        hasAd: false,
        ad: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasAd: true,
      ad: {
        _id: selectedAd._id,
        campaignId: selectedAd.campaignId || parentCampaign?._id,
        title: selectedAd.title || parentCampaign?.campaignName || "Featured Ad",
        businessName: parentCampaign?.businessName || "CatchWatch Sponsored",
        adType: selectedAd.adType || parentCampaign?.adType || "VIDEO",
        mediaUrl: selectedAd.mediaUrl || parentCampaign?.mediaUrl,
        thumbnailUrl: selectedAd.thumbnailUrl || selectedAd.mediaUrl || parentCampaign?.mediaUrl,
        ctaText: selectedAd.ctaText || "Learn More",
        destinationUrl: selectedAd.destinationUrl || parentCampaign?.destinationUrl || "#",
        durationSeconds: selectedAd.durationSeconds || 15,
        isAd: true,
      },
    });
  } catch (error) {
    console.error("GET CONTENT AD ERROR:", error);
    return res.status(200).json({ success: true, hasAd: false, ad: null });
  }
};

/**
 * Reel Feed Ad Placement Server
 * Returns an active Ad creative for insertion into the viewer's Reels feed
 */
exports.getReelFeedAd = async (req, res) => {
  req.query.placement = "SPONSORED_REELS";
  return exports.getContentAd(req, res);
};

/**
 * Record Ad Analytics Event (Impression, Click, Watch Time, Conversion)
 */
exports.recordAdEvent = async (req, res) => {
  try {
    let { adId, campaignId, eventType, watchDuration = 0 } = req.body;

    if (!adId || !eventType) {
      return res.status(200).json({ success: true, message: "Missing params handled" });
    }

    // Clean synthesized ID prefix if present (e.g. "ad_3_6a6d...")
    if (typeof adId === "string" && adId.includes("_")) {
      const parts = adId.split("_");
      adId = parts[parts.length - 1];
    }

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(200).json({ success: true, message: "Invalid Ad ID handled" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(200).json({ success: true, message: "Ad not found" });
    }

    const targetCampaignId = (campaignId && mongoose.Types.ObjectId.isValid(campaignId))
      ? campaignId
      : ad.campaignId;

    const campaign = await AdCampaign.findById(targetCampaignId);
    if (!campaign) {
      return res.status(200).json({ success: true, message: "Campaign not found" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const currentHour = new Date().getHours();

    let analytics = await AdAnalytics.findOne({
      campaignId: campaign._id,
      adId: ad._id,
      date: todayStr,
      hour: currentHour,
    });

    if (!analytics) {
      analytics = new AdAnalytics({
        campaignId: campaign._id,
        adId: ad._id,
        advertiserId: campaign.advertiserId,
        date: todayStr,
        hour: currentHour,
      });
    }

    const costPerImpression = 0.15; // CPM ~ ₹150 / 1000 = 0.15 per impression

    if (eventType === "IMPRESSION") {
      campaign.totalImpressions = (campaign.totalImpressions || 0) + 1;
      analytics.impressions = (analytics.impressions || 0) + 1;
      campaign.spent = (campaign.spent || 0) + costPerImpression;
      analytics.spend = (analytics.spend || 0) + costPerImpression;
    } else if (eventType === "QUALIFIED_IMPRESSION") {
      campaign.totalQualifiedImpressions = (campaign.totalQualifiedImpressions || 0) + 1;
      analytics.qualifiedImpressions = (analytics.qualifiedImpressions || 0) + 1;
    } else if (eventType === "VIEW") {
      campaign.totalViews = (campaign.totalViews || 0) + 1;
      analytics.views = (analytics.views || 0) + 1;
      analytics.watchTimeSeconds = (analytics.watchTimeSeconds || 0) + watchDuration;
      campaign.totalWatchTimeSeconds = (campaign.totalWatchTimeSeconds || 0) + watchDuration;
    } else if (eventType === "QUALIFIED_VIEW") {
      campaign.totalQualifiedViews = (campaign.totalQualifiedViews || 0) + 1;
      analytics.qualifiedViews = (analytics.qualifiedViews || 0) + 1;
    } else if (eventType === "CLICK") {
      campaign.totalClicks = (campaign.totalClicks || 0) + 1;
      analytics.clicks = (analytics.clicks || 0) + 1;
    } else if (eventType === "CONVERSION") {
      campaign.totalConversions = (campaign.totalConversions || 0) + 1;
      analytics.conversions = (analytics.conversions || 0) + 1;
    }

    // Auto-stop campaign if budget exhausted
    if (campaign.spent >= campaign.budget) {
      campaign.status = "COMPLETED";
      ad.status = "COMPLETED";
    }

    await Promise.all([ad.save(), campaign.save(), analytics.save()]);

    return res.status(200).json({
      success: true,
      message: "Ad event recorded successfully",
    });
  } catch (error) {
    console.error("RECORD AD EVENT ERROR:", error);
    return res.status(200).json({ success: true, message: "Handled error gracefully" });
  }
};

/**
 * Admin Ad Overview & Revenue Dashboard
 */
exports.getAdminAdDashboard = async (req, res) => {
  try {
    const runningCampaigns = await AdCampaign.countDocuments({ status: "ACTIVE" });
    const pendingCampaigns = await AdCampaign.countDocuments({ status: "PENDING" });
    const completedCampaigns = await AdCampaign.countDocuments({ status: "COMPLETED" });

    const totalSpentAgg = await AdCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$spent" },
          totalBudget: { $sum: "$budget" },
          totalImpressions: { $sum: "$totalImpressions" },
          totalClicks: { $sum: "$totalClicks" },
          totalViews: { $sum: "$totalViews" },
        },
      },
    ]);

    const stats = totalSpentAgg[0] || {
      totalRevenue: 0,
      totalBudget: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalViews: 0,
    };

    const avgCtr = stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : "0.00";

    return res.status(200).json({
      success: true,
      totalAdvertisers: runningCampaigns + pendingCampaigns + completedCampaigns,
      runningCampaigns,
      pendingCampaigns,
      completedCampaigns,
      todayRevenue: Math.round(stats.totalRevenue * 0.15),
      monthlyRevenue: Math.round(stats.totalRevenue),
      totalAdViews: stats.totalViews || stats.totalImpressions,
      averageCtr: avgCtr,
      totalAdSpend: Math.round(stats.totalRevenue),
      estimatedProfit: Math.round(stats.totalRevenue * 0.4),
      remainingBudget: Math.max(0, Math.round(stats.totalBudget - stats.totalRevenue)),
    });
  } catch (error) {
    console.error("GET ADMIN AD DASHBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Delete Ad Campaign and its associated Ad creatives
 * DELETE /api/admin/ads/campaigns/:id
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Valid campaign ID required" });
    }

    const campaign = await AdCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Delete associated Ad creatives
    await Ad.deleteMany({ campaignId: id });

    // Delete campaign
    await AdCampaign.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Campaign and associated ads deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CAMPAIGN ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
