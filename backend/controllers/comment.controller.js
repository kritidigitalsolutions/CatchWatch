const mongoose = require("mongoose");

const Comment = require("../models/comment.model");
const Reel = require("../models/reel.model");

// ========================================
// ADD COMMENT
// ========================================
exports.addComment = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Reel ID",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const reel = await Reel.findById(reelId);

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    const comment = await Comment.create({
      reel: reelId,
      user: req.user.id,
      text: text.trim(),
    });

    await Reel.findByIdAndUpdate(
      reelId,
      {
        $inc: {
          commentsCount: 1,
        },
      }
    );

    const { recordEngagementEvent } = require("../utils/creator.helper");
    await recordEngagementEvent({
      creatorId: reel.user,
      reelId: reel._id,
      userId: req.user.id,
      action: "COMMENT",
      pointsDelta: 3,
    });

    const populatedComment =
      await Comment.findById(comment._id)
        .populate(
          "user",
          "_id name username profileImage verification"
        );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET COMMENTS
// ========================================
exports.getComments = async (req, res) => {
  try {
    const { reelId } = req.params;

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const total =
      await Comment.countDocuments({
        reel: reelId,
      });

    const comments =
      await Comment.find({
        reel: reelId,
      })
        .populate(
          "user",
          "_id name username profileImage verification"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    // Sort so comments from verified users appear higher
    const { decorateUserWithBlueTick } = require("../utils/creator.helper");
    comments.forEach(c => {
      if (c.user) c.user = decorateUserWithBlueTick(c.user);
    });

    comments.sort((a, b) => {
      const aVerified = a.user?.blueTick || a.user?.verification?.isVerified || a.user?.verification?.status === "VERIFIED" ? 1 : 0;
      const bVerified = b.user?.blueTick || b.user?.verification?.isVerified || b.user?.verification?.status === "VERIFIED" ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const paginatedComments = comments.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      comments: paginatedComments,
    });
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// DELETE COMMENT
// ========================================
exports.deleteComment = async (
  req,
  res
) => {
  try {
    const { commentId } = req.params;

    const comment =
      await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (
      comment.user.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your comments",
      });
    }

    await Comment.findByIdAndDelete(
      commentId
    );

    await Reel.findByIdAndUpdate(
      comment.reel,
      {
        $inc: {
          commentsCount: -1,
        },
      }
    );

    const reelDoc = await Reel.findById(comment.reel);
    if (reelDoc && reelDoc.user) {
      const { recordEngagementEvent } = require("../utils/creator.helper");
      await recordEngagementEvent({
        creatorId: reelDoc.user,
        reelId: reelDoc._id,
        userId: req.user.id,
        action: "UNCOMMENT",
        pointsDelta: -3,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};