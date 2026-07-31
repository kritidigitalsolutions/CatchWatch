const mongoose = require("mongoose");
const Follow = require("../models/follow.model");
const User = require("../models/user.model");

// ========================================
// FOLLOW A USER
// ========================================
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { id: targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID",
      });
    }

    if (followerId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    await Follow.findOneAndUpdate(
      { follower: followerId, following: targetUserId },
      { follower: followerId, following: targetUserId },
      { upsert: true, new: true }
    );

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: targetUserId });

    return res.status(200).json({
      success: true,
      message: `You are now following ${targetUser.name || "user"}`,
      isFollowing: true,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Follow User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// UNFOLLOW A USER
// ========================================
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { id: targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID",
      });
    }

    await Follow.deleteOne({ follower: followerId, following: targetUserId });

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: targetUserId });

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
      isFollowing: false,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Unfollow User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// TOGGLE FOLLOW / UNFOLLOW
// ========================================
exports.toggleFollow = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { id: targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID",
      });
    }

    if (followerId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const existingFollow = await Follow.findOne({ follower: followerId, following: targetUserId });

    let isFollowing = false;
    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      isFollowing = false;
    } else {
      await Follow.create({ follower: followerId, following: targetUserId });
      isFollowing = true;
    }

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: targetUserId });

    return res.status(200).json({
      success: true,
      message: isFollowing ? "Followed successfully" : "Unfollowed successfully",
      isFollowing,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Toggle Follow Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET FOLLOWERS OF A USER
// ========================================
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const totalCount = await Follow.countDocuments({ following: userId });
    const follows = await Follow.find({ following: userId })
      .populate("follower", "_id name username profileImage bio role status verification")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const followers = follows.map(f => f.follower).filter(Boolean);

    return res.status(200).json({
      success: true,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      followers,
    });
  } catch (error) {
    console.error("Get Followers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// GET FOLLOWING USERS OF A USER
// ========================================
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const totalCount = await Follow.countDocuments({ follower: userId });
    const follows = await Follow.find({ follower: userId })
      .populate("following", "_id name username profileImage bio role status verification")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const following = follows.map(f => f.following).filter(Boolean);

    return res.status(200).json({
      success: true,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      following,
    });
  } catch (error) {
    console.error("Get Following Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================================
// CHECK FOLLOW STATUS
// ========================================
exports.checkFollowStatus = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const followerId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID",
      });
    }

    let isFollowing = false;
    if (followerId && mongoose.Types.ObjectId.isValid(followerId)) {
      const existing = await Follow.exists({ follower: followerId, following: targetUserId });
      isFollowing = !!existing;
    }

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: targetUserId });

    return res.status(200).json({
      success: true,
      isFollowing,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Check Follow Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
