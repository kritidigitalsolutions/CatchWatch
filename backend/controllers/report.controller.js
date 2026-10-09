const mongoose = require("mongoose");
const Report = require("../models/report.model");
const Reel = require("../models/reel.model");
const Comment = require("../models/comment.model");
const User = require("../models/user.model");

// ========================================
// 1. UNIFIED CREATE REPORT (UGC: Reel, Comment, User)
// ========================================
exports.createReport = async (req, res) => {
  try {
    const reporterId = req.user?.id || req.user?._id;
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: "targetType ('reel', 'comment', 'user') and targetId are required",
      });
    }

    const normalizedType = String(targetType).toLowerCase().trim();
    if (!["reel", "comment", "user"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid targetType. Must be 'reel', 'comment', or 'user'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid targetId format",
      });
    }

    let reportedUserId = null;

    // Validate target existence and determine reportedUser
    if (normalizedType === "reel") {
      const reel = await Reel.findById(targetId);
      if (!reel) {
        return res.status(404).json({ success: false, message: "Reel not found" });
      }
      reportedUserId = reel.user;
      if (String(reportedUserId) === String(reporterId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot report your own reel",
        });
      }
    } else if (normalizedType === "comment") {
      const comment = await Comment.findById(targetId);
      if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found" });
      }
      reportedUserId = comment.user;
      if (String(reportedUserId) === String(reporterId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot report your own comment",
        });
      }
    } else if (normalizedType === "user") {
      const targetUser = await User.findById(targetId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      reportedUserId = targetUser._id;
      if (String(reportedUserId) === String(reporterId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot report your own profile",
        });
      }
    }

    // Check if duplicate pending report exists
    const existing = await Report.findOne({
      reporter: reporterId,
      targetType: normalizedType,
      targetId,
      status: "PENDING",
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "You have already submitted a report for this content. Our moderation team is reviewing it.",
        report: existing,
      });
    }

    const validReasons = [
      "SPAM",
      "INAPPROPRIATE_CONTENT",
      "HARASSMENT",
      "HATE_SPEECH",
      "NUDITY_OR_SEXUAL",
      "VIOLENCE",
      "COPYRIGHT_VIOLATION",
      "SCAM_OR_FRAUD",
      "OTHER",
    ];

    const finalReason = validReasons.includes(reason) ? reason : "INAPPROPRIATE_CONTENT";

    const report = await Report.create({
      reporter: reporterId,
      targetType: normalizedType,
      targetId,
      reportedUser: reportedUserId,
      reason: finalReason,
      description: description ? String(description).trim() : "",
      status: "PENDING",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully. Thank you for helping keep CatchWatch safe. Our moderation team will review this within 24 hours.",
      report,
    });
  } catch (error) {
    console.error("CREATE REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit report",
      error: error.message,
    });
  }
};

// ========================================
// 2. CONVENIENCE ROUTE: REPORT REEL
// ========================================
exports.reportReel = async (req, res) => {
  req.body.targetType = "reel";
  req.body.targetId = req.params.id;
  return exports.createReport(req, res);
};

// ========================================
// 3. CONVENIENCE ROUTE: REPORT COMMENT
// ========================================
exports.reportComment = async (req, res) => {
  req.body.targetType = "comment";
  req.body.targetId = req.params.id;
  return exports.createReport(req, res);
};

// ========================================
// 4. CONVENIENCE ROUTE: REPORT USER PROFILE
// ========================================
exports.reportUser = async (req, res) => {
  req.body.targetType = "user";
  req.body.targetId = req.params.id;
  return exports.createReport(req, res);
};

// ========================================
// 5. GET MY SUBMITTED REPORTS
// ========================================
exports.getMyReports = async (req, res) => {
  try {
    const reporterId = req.user?.id || req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: reporterId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reportedUser", "name username profileImage"),
      Report.countDocuments({ reporter: reporterId }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      reports,
    });
  } catch (error) {
    console.error("GET MY REPORTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};

// ========================================
// 6. ADMIN: GET ALL REPORTS
// ========================================
exports.getAllReports = async (req, res) => {
  try {
    const { status, targetType, reason, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }
    if (targetType && targetType !== "ALL") {
      query.targetType = targetType;
    }
    if (reason && reason !== "ALL") {
      query.reason = reason;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("reporter", "name username phone profileImage")
        .populate("reportedUser", "name username phone profileImage status"),
      Report.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      reports,
    });
  } catch (error) {
    console.error("ADMIN GET ALL REPORTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};

// ========================================
// 7. ADMIN: GET REPORT BY ID (WITH TARGET CONTENT)
// ========================================
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("reporter", "name username phone profileImage")
      .populate("reportedUser", "name username phone profileImage status")
      .populate("resolvedBy", "name email");

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    let targetContent = null;
    if (report.targetType === "reel") {
      targetContent = await Reel.findById(report.targetId).lean();
    } else if (report.targetType === "comment") {
      targetContent = await Comment.findById(report.targetId).lean();
    } else if (report.targetType === "user") {
      targetContent = await User.findById(report.targetId)
        .select("name username bio profileImage status verification")
        .lean();
    }

    return res.status(200).json({
      success: true,
      report,
      targetContent,
    });
  } catch (error) {
    console.error("ADMIN GET REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch report details",
      error: error.message,
    });
  }
};

// ========================================
// 8. ADMIN: RESOLVE REPORT & TAKE ACTION
// ========================================
exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, adminNotes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (status) report.status = status;
    if (actionTaken) report.actionTaken = actionTaken;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    report.resolvedBy = req.user?.id || req.user?._id;
    report.resolvedAt = new Date();

    // Execute moderation action
    if (actionTaken === "CONTENT_DELETED") {
      if (report.targetType === "reel") {
        await Reel.findByIdAndUpdate(report.targetId, { status: "DELETED" });
      } else if (report.targetType === "comment") {
        const comment = await Comment.findById(report.targetId);
        if (comment) {
          if (comment.reel) {
            await Reel.findByIdAndUpdate(comment.reel, { $inc: { commentsCount: -1 } }).catch(() => {});
          }
          await Comment.findByIdAndDelete(report.targetId);
        }
      }
    } else if (actionTaken === "USER_BANNED" && report.reportedUser) {
      await User.findByIdAndUpdate(report.reportedUser, { status: "Blocked" });
    }

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Report updated and moderation action processed successfully",
      report,
    });
  } catch (error) {
    console.error("ADMIN RESOLVE REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve report",
      error: error.message,
    });
  }
};
