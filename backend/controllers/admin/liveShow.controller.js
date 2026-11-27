const LiveShow = require("../../models/liveShow.model");

// Helper to safely parse dates without throwing Invalid Date CastError
const parseDate = (val) => {
  if (!val || (typeof val !== "string" && !(val instanceof Date))) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Helper to extract clean strings or arrays
const parseTags = (tagsInput) => {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tagsInput === "string") {
    return tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Get all live shows for Admin with filtering, search & pagination
 */
exports.getAllLiveShows = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { search, status, category } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    if (category && category !== "ALL") {
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
        .sort({ isLive: -1, order: 1, scheduledStartTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveShow.countDocuments(filter),
      LiveShow.aggregate([
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
    console.error("Admin getAllLiveShows error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live shows",
    });
  }
};

/**
 * Get a single live show by ID
 */
exports.getLiveShowById = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await LiveShow.findById(id);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: show,
    });
  } catch (error) {
    console.error("Admin getLiveShowById error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live show details",
    });
  }
};

/**
 * Create a new live show
 */
exports.createLiveShow = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      title,
      description,
      streamUrl,
      backupStreamUrl,
      streamType,
      category,
      tags,
      status,
      scheduledStartTime,
      scheduledEndTime,
      isFeatured,
      isPremium,
      order,
      isActive,
      viewersCount,
    } = body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Live show title is required",
      });
    }

    if (!streamUrl || !streamUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: "Live stream URL is required",
      });
    }

    // Handle uploaded files or URLs
    const thumbnailFile =
      req.files?.thumbnail?.[0] || req.files?.thumbnailFile?.[0] || req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0] || req.files?.bannerFile?.[0];

    let thumbnail = body.thumbnail || "";
    if (thumbnailFile) {
      thumbnail = thumbnailFile.cdnUrl || thumbnailFile.path || thumbnail;
    }

    let banner = body.banner || "";
    if (bannerFile) {
      banner = bannerFile.cdnUrl || bannerFile.path || banner;
    }

    const showStatus = status ? status.toUpperCase() : "LIVE";
    const isLive = showStatus === "LIVE";

    const newShow = new LiveShow({
      title: title.trim(),
      description: (description || "").trim(),
      streamUrl: streamUrl.trim(),
      backupStreamUrl: (backupStreamUrl || "").trim(),
      streamType: streamType || "auto",
      thumbnail,
      banner,
      category: (category || "Live Show").trim(),
      tags: parseTags(tags),
      status: ["LIVE", "UPCOMING", "ENDED"].includes(showStatus) ? showStatus : "LIVE",
      isLive,
      scheduledStartTime: parseDate(scheduledStartTime) || new Date(),
      scheduledEndTime: parseDate(scheduledEndTime),
      isFeatured: isFeatured === "true" || isFeatured === true,
      isPremium: isPremium === "true" || isPremium === true,
      order: parseInt(order) || 0,
      isActive: isActive !== "false" && isActive !== false,
      viewersCount: parseInt(viewersCount) || 0,
    });

    newShow.resolveStreamDetails();
    await newShow.save();

    return res.status(201).json({
      success: true,
      message: "Live show created successfully",
      data: newShow,
    });
  } catch (error) {
    console.error("Admin createLiveShow error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create live show",
    });
  }
};

/**
 * Update an existing live show
 */
exports.updateLiveShow = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const show = await LiveShow.findById(id);
    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found",
      });
    }

    if (body.title !== undefined) show.title = body.title.trim();
    if (body.description !== undefined) show.description = body.description.trim();
    if (body.streamUrl !== undefined) show.streamUrl = body.streamUrl.trim();
    if (body.backupStreamUrl !== undefined) show.backupStreamUrl = body.backupStreamUrl.trim();
    if (body.streamType !== undefined) show.streamType = body.streamType;
    if (body.category !== undefined) show.category = body.category.trim();
    if (body.tags !== undefined) show.tags = parseTags(body.tags);

    if (body.status !== undefined) {
      const newStatus = body.status.toUpperCase();
      if (["LIVE", "UPCOMING", "ENDED"].includes(newStatus)) {
        show.status = newStatus;
        show.isLive = newStatus === "LIVE";
      }
    }

    if (body.scheduledStartTime !== undefined) {
      show.scheduledStartTime = parseDate(body.scheduledStartTime) || show.scheduledStartTime;
    }
    if (body.scheduledEndTime !== undefined) {
      show.scheduledEndTime = parseDate(body.scheduledEndTime);
    }

    if (body.isFeatured !== undefined) {
      show.isFeatured = body.isFeatured === "true" || body.isFeatured === true;
    }
    if (body.isPremium !== undefined) {
      show.isPremium = body.isPremium === "true" || body.isPremium === true;
    }
    if (body.isActive !== undefined) {
      show.isActive = body.isActive !== "false" && body.isActive !== false;
    }
    if (body.order !== undefined) {
      show.order = parseInt(body.order) || 0;
    }
    if (body.viewersCount !== undefined) {
      show.viewersCount = Math.max(0, parseInt(body.viewersCount) || 0);
    }

    // Handle files if uploaded
    const thumbnailFile =
      req.files?.thumbnail?.[0] || req.files?.thumbnailFile?.[0] || req.files?.poster?.[0];
    const bannerFile = req.files?.banner?.[0] || req.files?.bannerFile?.[0];

    if (thumbnailFile) {
      show.thumbnail = thumbnailFile.cdnUrl || thumbnailFile.path || show.thumbnail;
    } else if (body.thumbnail !== undefined) {
      show.thumbnail = body.thumbnail;
    }

    if (bannerFile) {
      show.banner = bannerFile.cdnUrl || bannerFile.path || show.banner;
    } else if (body.banner !== undefined) {
      show.banner = body.banner;
    }

    show.resolveStreamDetails();
    await show.save();

    return res.status(200).json({
      success: true,
      message: "Live show updated successfully",
      data: show,
    });
  } catch (error) {
    console.error("Admin updateLiveShow error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update live show",
    });
  }
};

/**
 * Quick status update (LIVE, UPCOMING, ENDED)
 */
exports.updateLiveShowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["LIVE", "UPCOMING", "ENDED"].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Valid status (LIVE, UPCOMING, ENDED) is required",
      });
    }

    const showStatus = status.toUpperCase();
    const show = await LiveShow.findById(id);
    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found",
      });
    }

    show.status = showStatus;
    show.isLive = showStatus === "LIVE";
    await show.save();

    return res.status(200).json({
      success: true,
      message: `Live show status changed to ${showStatus}`,
      data: {
        id: show._id,
        status: show.status,
        isLive: show.isLive,
      },
    });
  } catch (error) {
    console.error("Admin updateLiveShowStatus error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update live show status",
    });
  }
};

/**
 * Delete a live show
 */
exports.deleteLiveShow = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await LiveShow.findByIdAndDelete(id);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Live show not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Live show deleted successfully",
    });
  } catch (error) {
    console.error("Admin deleteLiveShow error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete live show",
    });
  }
};
