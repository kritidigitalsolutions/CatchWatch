const Notification = require("../../models/notification.model");
const Movie = require("../../models/movie.model");
const Series = require("../../models/series.model");
const TvShow = require("../../models/tvShow.model");
const ShortFilm = require("../../models/shortFilm.model");
const Plan = require("../../models/plan.model");
const { getMediaUrl } = require("../../utils/mediaUrl");
const { broadcastPushNotification } = require("../../utils/notificationDispatcher.helper");

/* ─────────────────────────────────────────────────────────────
   POST /admin/notifications/send
───────────────────────────────────────────────────────────── */
exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = "GENERAL",
      imageUrl = "",
      actionUrl = "",
      sendTo = "ALL",
      targetUser = null,
      attachmentType = "NONE",
      contentId = null,
      contentType = "",
      planId = null,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    let finalImageUrl = (imageUrl || "").trim();
    if (req.file) {
      finalImageUrl = getMediaUrl(req.file);
    }

    const result = await broadcastPushNotification({
      sendTo,
      targetUser,
      title,
      message,
      type,
      imageUrl: finalImageUrl,
      actionUrl,
      attachmentType,
      contentId,
      contentType,
      planId,
      createdBy: req.user?.id || req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Notification dispatched successfully",
      data: result.notification,
      pushReport: result.stats,
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications
───────────────────────────────────────────────────────────── */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { isActive: true };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total, aggStats] = await Promise.all([
      Notification.find(query)
        .populate("targetUser", "name email phone username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$deliveryStats.totalSent" },
            delivered: { $sum: "$deliveryStats.delivered" },
            failed: { $sum: "$deliveryStats.failed" },
          },
        },
      ]),
    ]);

    const stats = aggStats?.[0] || {
      totalSent: total || 0,
      delivered: total || 0,
      failed: 0,
    };

    // If delivery stats in old documents were 0, default totalSent/delivered to total count
    if (stats.totalSent === 0 && total > 0) {
      stats.totalSent = total;
      stats.delivered = total;
    }

    return res.status(200).json({
      success: true,
      data,
      stats: {
        totalSent: stats.totalSent || 0,
        delivered: stats.delivered || 0,
        failed: stats.failed || 0,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications/attachment-options
───────────────────────────────────────────────────────────── */
exports.getAttachmentOptions = async (req, res) => {
  try {
    const [movies, series, tvShows, shortFilms, plans] = await Promise.all([
      Movie.find({}).select("title slug poster banner").limit(50).lean(),
      Series.find({}).select("title slug poster banner").limit(50).lean(),
      TvShow.find({}).select("title slug poster banner thumbnail").limit(50).lean(),
      ShortFilm.find({}).select("title slug poster banner thumbnail").limit(50).lean(),
      Plan.find({ isActive: true }).select("name price category duration description").lean(),
    ]);

    const contentList = [
      ...movies.map((m) => ({
        _id: m._id,
        title: m.title,
        type: "movie",
        typeName: "Movie",
        image: m.poster || m.banner || "",
        actionUrl: `/watch/${m.slug || m._id}`,
      })),
      ...series.map((s) => ({
        _id: s._id,
        title: s.title,
        type: "series",
        typeName: "Web Series",
        image: s.poster || s.banner || "",
        actionUrl: `/watch/${s.slug || s._id}`,
      })),
      ...tvShows.map((t) => ({
        _id: t._id,
        title: t.title,
        type: "tvShow",
        typeName: "TV Show",
        image: t.poster || t.banner || t.thumbnail || "",
        actionUrl: `/tv-shows/${t._id}`,
      })),
      ...shortFilms.map((sf) => ({
        _id: sf._id,
        title: sf.title,
        type: "shortFilm",
        typeName: "Short Film",
        image: sf.poster || sf.banner || sf.thumbnail || "",
        actionUrl: `/watch/${sf.slug || sf._id}`,
      })),
    ];

    const plansList = plans.map((p) => ({
      _id: p._id,
      name: p.name,
      price: p.price,
      category: p.category,
      duration: p.duration,
      actionUrl: `/subscription?planId=${p._id}`,
    }));

    return res.json({
      success: true,
      content: contentList,
      plans: plansList,
    });
  } catch (error) {
    console.error("getAttachmentOptions error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /admin/notifications/:id/read
───────────────────────────────────────────────────────────── */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /admin/notifications/unread-count
───────────────────────────────────────────────────────────── */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false, isActive: true });
    return res.json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /admin/notifications/:id
───────────────────────────────────────────────────────────── */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isActive: false });
    return res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
