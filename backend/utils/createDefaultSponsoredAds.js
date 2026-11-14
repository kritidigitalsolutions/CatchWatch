const Ad = require("../models/ad.model");
const AdCampaign = require("../models/adCampaign.model");

/**
 * Ensures default legitimate Instagram-style sponsored video advertisements
 * exist in the database for the Reels feed.
 */
const createDefaultSponsoredAds = async () => {
  try {
    // Check if an active compliant sponsored video ad already exists
    const existingAd = await Ad.findOne({
      adType: { $in: ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO"] },
      status: "ACTIVE",
      mediaUrl: { $regex: /\.(mp4|m3u8|mov|webm)/i },
    });

    if (existingAd) {
      return existingAd;
    }

    console.log("Seeding default Instagram-style Sponsored Video Ads for Reels feed...");

    // Create a high-priority verified ad campaign
    let campaign = await AdCampaign.findOne({ campaignName: "CatchWatch Originals & Studio Showcase" });
    if (!campaign) {
      campaign = await AdCampaign.create({
        campaignName: "CatchWatch Originals & Studio Showcase",
        businessName: "Catch & Watch Studios",
        companyName: "Catch & Watch Entertainment",
        email: "advertising@catchandwatch.com",
        phone: "+919999999999",
        adType: "SPONSORED_REELS",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        destinationUrl: "https://catchandwatch.com/shows",
        budget: 50000,
        dailyLimit: 2000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        priority: 5,
        status: "ACTIVE",
        paymentStatus: "PAID",
      });
    }

    // Seed 2 high quality genuine sponsored video ads
    const defaultAds = [
      {
        title: "Catch & Watch Original Shows",
        campaignId: campaign._id,
        adType: "SPONSORED_REELS",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        thumbnailUrl: "https://catchandwatchzone.b-cdn.net/movies/posters/1785566971913-48339614.jpg",
        ctaText: "Watch Now",
        destinationUrl: "https://catchandwatch.com/shows",
        durationSeconds: 15,
        category: "Entertainment",
        priority: 5,
        status: "ACTIVE",
      },
      {
        title: "Creator Studio Gear & Cameras",
        campaignId: campaign._id,
        adType: "SPONSORED_REELS",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnailUrl: "https://catchandwatchzone.b-cdn.net/movies/posters/1785566971913-48339614.jpg",
        ctaText: "Explore More",
        destinationUrl: "https://catchandwatch.com/creator/dashboard",
        durationSeconds: 15,
        category: "Technology",
        priority: 4,
        status: "ACTIVE",
      },
    ];

    for (const adData of defaultAds) {
      const found = await Ad.findOne({ title: adData.title, campaignId: campaign._id });
      if (!found) {
        await Ad.create(adData);
      }
    }

    console.log("✅ Seeded default legitimate sponsored video ads for Reels feed");
  } catch (error) {
    console.error("Error creating default sponsored ads:", error);
  }
};

module.exports = createDefaultSponsoredAds;

