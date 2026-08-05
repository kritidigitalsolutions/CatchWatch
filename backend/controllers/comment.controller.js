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

    const isSelfComment = String(req.user.id) === String(reel.user);
    const { recordEngagementEvent } = require("../utils/creator.helper");
    await recordEngagementEvent({
      creatorId: reel.user,
      reelId: reel._id,
      userId: req.user.id,
      action: "COMMENT",
      pointsDelta: isSelfComment ? 0 : 3,
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
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

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

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comment ID",
      });
    }

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

// ========================================
// TOGGLE PIN COMMENT (Creator Only)
// POST /api/comment/pin/:commentId
// ========================================
exports.togglePinComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const reel = await Reel.findById(comment.reel);

    if (!reel || reel.status === "DELETED") {
      return res.status(404).json({
        success: false,
        message: "Associated Reel not found",
      });
    }

    // Permission check: Only Reel Creator can pin/unpin comments
    const isReelCreator = String(reel.user) === String(req.user.id);

    if (!isReelCreator) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only the Reel creator can pin comments on this reel",
      });
    }

    // Verified Blue Tick check: Only verified creators can pin comments
    const User = require("../models/user.model");
    const { decorateUserWithBlueTick } = require("../utils/creator.helper");
    const requestingUser = await User.findById(req.user.id).lean();
    const decoratedUser = requestingUser ? decorateUserWithBlueTick(requestingUser) : null;
    const isVerifiedCreator = Boolean(decoratedUser && decoratedUser.blueTick);

    if (!isVerifiedCreator) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only verified Blue Tick creators can pin comments on reels",
      });
    }

    // Determine target pin state
    const targetState = typeof req.body.isPinned === "boolean" ? req.body.isPinned : !comment.isPinned;

    if (targetState) {
      // Unpin any previously pinned comment on this reel
      await Comment.updateMany(
        { reel: comment.reel, isPinned: true },
        { $set: { isPinned: false, pinnedAt: null } }
      );

      comment.isPinned = true;
      comment.pinnedAt = new Date();
    } else {
      comment.isPinned = false;
      comment.pinnedAt = null;
    }

    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "_id name username profileImage verification"
    ).lean();

    if (populatedComment.user) {
      populatedComment.user = decorateUserWithBlueTick(populatedComment.user);
    }

    return res.status(200).json({
      success: true,
      message: comment.isPinned ? "Comment pinned to top" : "Comment unpinned",
      isPinned: comment.isPinned,
      comment: populatedComment,
    });
  } catch (error) {
    console.error("TOGGLE PIN COMMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};