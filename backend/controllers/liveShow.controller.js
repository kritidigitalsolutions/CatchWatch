const LiveShow = require("../models/liveShow.model");

// Projection for listing live shows (clean payload)
const SHOW_LISTING_FIELDS =
  "_id title description streamUrl streamType resolvedStreamType youtubeVideoId thumbnail banner category tags status isLive scheduledStartTime scheduledEndTime isFeatured isPremium viewersCount createdAt";

/**
 * Get active live shows (with status and category filters)
 */
exports.getActiveLiveShows = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, category, search } = req.query;
    const filter = { isActive: true };

    if (status && status.toUpperCase() !== "ALL") {
      filter.status = status.toUpperCase();
    }

    if (category && category.toUpperCase() !== "ALL") {
      filter.category = new RegExp(`^${category.trim()}$`, "i");
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
      ];
    }

    const [shows, total, stats] = await Promise.all([
      LiveShow.find(filter)
        .select(SHOW_LISTING_FIELDS)
        .sort({ isLive: -1, order: 1, scheduledStartTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveShow.countDocuments(filter),
      LiveShow.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statMap = {
      total: 0,
      live: 0,
      upcoming: 0,
      ended: 0,
    };

    stats.forEach((s) => {
      const st = (s._id || "").toUpperCase();
      if (st === "LIVE") statMap.live = s.count;
      else if (st === "UPCOMING") statMap.upcoming = s.count;
      else if (st === "ENDED") statMap.ended = s.count;
    });
    statMap.total = statMap.live + statMap.upcoming + statMap.ended;

    return res.status(200).json({
      success: true,
      data: {
        shows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: statMap,
      },
    });
  } catch (error) {
    console.error("User getActiveLiveShows error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live shows",
    });
  }
};

/**
 * Get top featured live show
 */
exports.getFeaturedLiveShow = async (req, res) => {
  try {
    // 1st Priority: isFeatured = true and LIVE
    let featured = await LiveShow.findOne({
      isActive: true,
      isFeatured: true,
      status: "LIVE",
    })
      .select(SHOW_LISTING_FIELDS)
      .lean();

    // 2nd Priority: Any LIVE show
    if (!featured) {
      featured = await LiveShow.findOne({
        isActive: true,
        status: "LIVE",
      })
        .select(SHOW_LISTING_FIELDS)
        .sort({ order: 1, viewersCount: -1, scheduledStartTime: -1 })
        .lean();
    }

    // 3rd Priority: Any featured upcoming show
    if (!featured) {
      featured = await LiveShow.findOne({
        isActive: true,
        isFeatured: true,
        status: "UPCOMING",
      })
        .select(SHOW_LISTING_FIELDS)
        .sort({ scheduledStartTime: 1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: featured || null,
    });
  } catch (error) {
    console.error("User getFeaturedLiveShow error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch featured live show",
    });
  }
};

/**
 * Get single live show details for player
 */
exports.getLiveShowDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await LiveShow.findOne({ _id: id, isActive: true }).lean();

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found or inactive",
      });
    }

    return res.status(200).json({
      success: true,
      data: show,
    });
  } catch (error) {
    console.error("User getLiveShowDetails error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live show details",
    });
  }
};

/**
 * Heartbeat viewer ping (increments viewer count)
 */
exports.pingViewer = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await LiveShow.findByIdAndUpdate(
      id,
      { $inc: { viewersCount: 1 } },
      { new: true, select: "viewersCount" }
    );

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found",
      });
    }

    return res.status(200).json({
      success: true,
      viewersCount: show.viewersCount,
    });
  } catch (error) {
    console.error("User pingViewer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to ping viewer count",
    });
  }
};
