/**
 * Reel & Feed Compliance Helper for iOS App Store Guidelines & Instagram-Style Sponsored Ads
 *
 * Requirements:
 * 1. Keep genuine creator-uploaded MP4/HLS Reels.
 * 2. Exclude YouTube-hosted video URLs (youtube.com, youtu.be, youtube-nocookie.com) from iOS Reels.
 * 3. DO NOT remove all isAd: true records - allow legitimate sponsored video advertisements in Reels feed.
 * 4. Exclude movie-only ads from Reels unless configured for Reels placement.
 * 5. Exclude static image-only and unsupported external redirect creatives from video ad placements.
 * 6. Return rich ad metadata including adId, campaignId, advertiser, mediaUrl, thumbnailUrl, ctaText and destinationUrl.
 * 7. Apply filtering before pagination while maintaining expected page size.
 */

// Disallowed domains and static image file extensions in video URLs
const REELS_COMPLIANCE_REGEX = /(youtube\.com|youtu\.be|youtube-nocookie\.com|magnific\.com|\.(jpe?g|png|webp|gif|bmp|svg|tiff)(\?.*)?$)/i;

/**
 * Detects whether the incoming HTTP request is from an iOS client
 */
const isIOSRequest = (req) => {
  if (!req) return false;
  const platformHeader = (req.headers?.["x-platform"] || req.headers?.["platform"] || "").toLowerCase();
  const platformQuery = (req.query?.platform || "").toLowerCase();
  const userAgent = (req.headers?.["user-agent"] || "").toLowerCase();

  return (
    platformHeader === "ios" ||
    platformQuery === "ios" ||
    userAgent.includes("iphone") ||
    userAgent.includes("ipad") ||
    userAgent.includes("ipod") ||
    userAgent.includes("cfnetwork") ||
    userAgent.includes("darwin") ||
    userAgent.includes("ios")
  );
};

/**
 * Returns the MongoDB query filter object to ensure reels only contain
 * valid, playable video streams and exclude YouTube, magnific, and static images.
 */
const getCompliantReelsFilter = (isIOS = false) => {
  return {
    videoUrl: {
      $exists: true,
      $ne: "",
      $not: REELS_COMPLIANCE_REGEX,
    },
  };
};

/**
 * Validates whether an ad is eligible to be injected into the video reels feed.
 *
 * Rules:
 * - Exclude movie-only, short-film-only, and TV-show-only ads from Reels unless configured for Reels placement.
 * - Exclude static image-only ads from video Reel results (must be a playable video stream).
 * - Exclude YouTube URLs.
 * - Exclude magnific.com assets.
 * - Exclude unsupported external redirect creatives (e.g. tracker schemes, javascript:).
 */
const isCompliantFeedAd = (ad, isIOS = false) => {
  if (!ad || !ad.mediaUrl) return false;
  const media = String(ad.mediaUrl).trim();
  const dest = String(ad.destinationUrl || "").trim();
  const adType = String(ad.adType || "").toUpperCase();

  // 1. Exclude movie-only, short-films-only, tv-shows-only, banner, image, splash ads from Reels placement
  const allowedReelsAdTypes = ["SPONSORED_REELS", "SPONSORED_SHORTS", "ALL_CONTENT", "VIDEO"];
  if (adType && !allowedReelsAdTypes.includes(adType)) {
    return false;
  }

  // 2. Exclude YouTube URLs
  if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(media)) {
    return false;
  }

  // 3. Exclude magnific.com assets
  if (/magnific\.com/i.test(media) || /magnific\.com/i.test(dest)) {
    return false;
  }

  // 4. Exclude static image media (must be playable video stream MP4/HLS)
  if (/\.(jpe?g|png|webp|gif|bmp|svg|tiff)(\?.*)?$/i.test(media)) {
    return false;
  }

  // 5. Exclude unsupported external redirect schemes
  if (dest) {
    if (/^(javascript:|data:|vbscript:)/i.test(dest)) return false;
    if (/adclick|clickserver|doubleclick\.net\/pagead|affiliate_redirect/i.test(dest)) {
      return false;
    }
  }

  return true;
};

/**
 * Formats a selected Ad document into an Instagram-style Sponsored Reels record.
 * Returns full ad metadata: adId, campaignId, advertiser, mediaUrl, thumbnailUrl, ctaText, destinationUrl.
 */
const formatSponsoredFeedAd = (selectedAd, counter = 1) => {
  if (!selectedAd) return null;

  const adId = selectedAd._id ? selectedAd._id.toString() : "";
  const campaignId = selectedAd.campaignId ? selectedAd.campaignId.toString() : "";
  const advertiserId = selectedAd.advertiserId ? selectedAd.advertiserId.toString() : "";

  const brandName =
    selectedAd.advertiser?.name ||
    selectedAd.businessName ||
    selectedAd.companyName ||
    selectedAd.title ||
    "Sponsored Partner";

  const brandCompany =
    selectedAd.companyName ||
    selectedAd.businessName ||
    selectedAd.advertiser?.companyName ||
    "CatchWatch Partner";

  const brandLogo =
    selectedAd.advertiser?.logo ||
    selectedAd.thumbnailUrl ||
    "https://catchandwatchzone.b-cdn.net/movies/posters/1785566971913-48339614.jpg";

  const brandUsername =
    "@" + brandName.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "@sponsored";

  const media = String(selectedAd.mediaUrl || "").trim();
  const thumbnail = String(selectedAd.thumbnailUrl || selectedAd.thumbnail || media).trim();
  const cta = String(selectedAd.ctaText || "Learn More").trim();
  const destination = String(selectedAd.destinationUrl || "#").trim();
  const title = String(selectedAd.title || brandName).trim();
  const caption = String(selectedAd.caption || selectedAd.title || "Sponsored content").trim();

  return {
    _id: "ad_" + counter + "_" + adId,
    id: "ad_" + counter + "_" + adId,
    adId: adId,
    campaignId: campaignId,
    advertiserId: advertiserId || null,
    advertiser: {
      _id: advertiserId || null,
      name: brandName,
      companyName: brandCompany,
      logo: brandLogo,
      isVerified: true,
    },
    title: title,
    caption: caption,
    description: caption,
    adType: selectedAd.adType || "SPONSORED_REELS",
    mediaUrl: media,
    videoUrl: media,
    thumbnailUrl: thumbnail,
    thumbnail: thumbnail,
    ctaText: cta,
    destinationUrl: destination,
    durationSeconds: Number(selectedAd.durationSeconds) || 15,
    isAd: true,
    isSponsored: true,
    viewsCount: Number(selectedAd.viewsCount) || 1250,
    sharesCount: Number(selectedAd.sharesCount) || 45,
    commentsCount: 0,
    likesCount: 0,
    user: {
      _id: advertiserId || adId,
      id: advertiserId || adId,
      name: brandName,
      username: brandUsername,
      profileImage: brandLogo,
      isVerified: true,
      blueTick: true,
      orangeTick: true,
      isSponsored: true,
      role: "SPONSORED",
    },
  };
};

module.exports = {
  REELS_COMPLIANCE_REGEX,
  isIOSRequest,
  getCompliantReelsFilter,
  isCompliantFeedAd,
  formatSponsoredFeedAd,
};
