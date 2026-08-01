const FraudLog = require("../models/fraudLog.model");
const SystemSettings = require("../models/systemSettings.model");
const User = require("../models/user.model");
const QualifiedView = require("../models/qualifiedView.model");

/**
 * Validates a view attempt against fraud detection rules.
 */
exports.validateViewAttempt = async ({
  viewerId,
  creatorId,
  reelId,
  watchDuration,
  ip,
  deviceId,
  userAgent = "",
}) => {
  try {
    const settings = await SystemSettings.getSettings();
    const rules = settings.fraudRules || {};
    const minWatchTime = settings.adSettings?.minWatchTimeSeconds || 3;

    // 1. Minimum watch time check
    if (!watchDuration || watchDuration < minWatchTime) {
      await FraudLog.create({
        viewerId,
        creatorId,
        reelId,
        ip,
        deviceId,
        userAgent,
        fraudType: "AUTO_REFRESH",
        details: `Watch duration (${watchDuration}s) lower than required minimum threshold (${minWatchTime}s)`,
        actionTaken: "VIEW_DISQUALIFIED",
      });
      return { isQualified: false, reason: `Watch duration under ${minWatchTime}s` };
    }

    // 2. Viewer cannot be the Creator
    if (viewerId && creatorId && String(viewerId) === String(creatorId)) {
      return { isQualified: false, reason: "Self-view by creator" };
    }

    // 3. Bot User Agent detection
    const isBot = /bot|crawl|spider|headless|puppeteer|selenium|phantom|curl|wget/i.test(userAgent);
    if (isBot) {
      await FraudLog.create({
        viewerId,
        creatorId,
        reelId,
        ip,
        deviceId,
        userAgent,
        fraudType: "BOT_VIEW",
        details: `Automated crawler or headless browser detected: ${userAgent}`,
        actionTaken: "VIEW_DISQUALIFIED",
      });
      return { isQualified: false, reason: "Bot view detected" };
    }

    // 4. Check Rapid Refresh (cooldown period)
    const cooldownMs = (rules.cooldownSeconds || 60) * 1000;
    const cooldownTime = new Date(Date.now() - cooldownMs);

    if (viewerId && reelId) {
      const recentView = await QualifiedView.findOne({
        viewerId,
        reelId,
        createdAt: { $gte: cooldownTime },
      });
      if (recentView) {
        await FraudLog.create({
          viewerId,
          creatorId,
          reelId,
          ip,
          deviceId,
          userAgent,
          fraudType: "RAPID_REFRESH",
          details: `Multiple view attempts on same reel within ${rules.cooldownSeconds || 60} seconds cooldown`,
          actionTaken: "VIEW_DISQUALIFIED",
        });
        return { isQualified: false, reason: "Rapid refresh detected" };
      }
    }

    // 5. Rate limit per IP (Duplicate IP & Click Farm check)
    if (ip) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const viewsFromIP = await QualifiedView.countDocuments({
        ip,
        createdAt: { $gte: oneMinuteAgo },
      });
      if (viewsFromIP >= (rules.maxViewsPerIPPerMinute || 10)) {
        await FraudLog.create({
          viewerId,
          creatorId,
          reelId,
          ip,
          deviceId,
          userAgent,
          fraudType: viewsFromIP > 25 ? "CLICK_FARM" : "DUPLICATE_IP",
          details: `Excessive views (${viewsFromIP}/min) from IP address ${ip}`,
          actionTaken: "VIEW_DISQUALIFIED",
        });
        return { isQualified: false, reason: "IP rate limit exceeded" };
      }
    }

    // 6. Rate limit per Device ID (Duplicate Device check)
    if (deviceId) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const viewsFromDevice = await QualifiedView.countDocuments({
        deviceId,
        createdAt: { $gte: oneMinuteAgo },
      });
      if (viewsFromDevice >= (rules.maxViewsPerDevicePerMinute || 10)) {
        await FraudLog.create({
          viewerId,
          creatorId,
          reelId,
          ip,
          deviceId,
          userAgent,
          fraudType: "DUPLICATE_DEVICE",
          details: `Excessive views (${viewsFromDevice}/min) from device ID ${deviceId}`,
          actionTaken: "VIEW_DISQUALIFIED",
        });
        return { isQualified: false, reason: "Device rate limit exceeded" };
      }
    }

    // Passed all checks!
    return { isQualified: true };
  } catch (error) {
    console.error("Validate View Attempt Error:", error);
    return { isQualified: true }; // Fallback to allow qualified view on server error
  }
};

/**
 * Admin: Get Fraud Logs list with pagination & filters
 */
exports.getAdminFraudLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { fraudType, search } = req.query;

    let query = {};
    if (fraudType && fraudType !== "ALL") {
      query.fraudType = fraudType;
    }
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ ip: regex }, { deviceId: regex }, { details: regex }];
    }

    const total = await FraudLog.countDocuments(query);
    const logs = await FraudLog.find(query)
      .populate("viewerId", "name username phone")
      .populate("creatorId", "name username")
      .populate("reelId", "title thumbnail")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (error) {
    console.error("GET ADMIN FRAUD LOGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Admin: Get Fraud Monitoring Statistics Dashboard
 */
exports.getAdminFraudStats = async (req, res) => {
  try {
    const totalLogs = await FraudLog.countDocuments();
    const botViews = await FraudLog.countDocuments({ fraudType: "BOT_VIEW" });
    const duplicateDevices = await FraudLog.countDocuments({ fraudType: "DUPLICATE_DEVICE" });
    const duplicateIPs = await FraudLog.countDocuments({ fraudType: "DUPLICATE_IP" });
    const rapidRefreshes = await FraudLog.countDocuments({ fraudType: "RAPID_REFRESH" });
    const vpnUsages = await FraudLog.countDocuments({ fraudType: "VPN_USAGE" });
    const emulators = await FraudLog.countDocuments({ fraudType: "EMULATOR" });
    const clickFarms = await FraudLog.countDocuments({ fraudType: "CLICK_FARM" });
    const autoRefreshes = await FraudLog.countDocuments({ fraudType: "AUTO_REFRESH" });
    const suspiciousAccounts = await FraudLog.countDocuments({ fraudType: "SUSPICIOUS_ACCOUNT" });

    // Recent 24-hour count
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFraudCount = await FraudLog.countDocuments({ createdAt: { $gte: last24h } });

    return res.status(200).json({
      success: true,
      totalFraudAttempts: totalLogs,
      recent24h: recentFraudCount,
      breakdown: {
        botViews,
        duplicateDevices,
        duplicateIPs,
        rapidRefreshes,
        vpnUsages,
        emulators,
        clickFarms,
        autoRefreshes,
        suspiciousAccounts,
      },
    });
  } catch (error) {
    console.error("GET ADMIN FRAUD STATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
