const User = require("../models/user.model");
const Reel = require("../models/reel.model");
const Comment = require("../models/comment.model");
const Interaction = require("../models/interaction.model");
const QualifiedView = require("../models/qualifiedView.model");
const Follow = require("../models/follow.model");
const Notification = require("../models/notification.model");
const Message = require("../models/message.model");
const Conversation = require("../models/conversation.model");
const Call = require("../models/call.model");
const UserBlock = require("../models/userBlock.model");
const CreatorAnalytics = require("../models/creatorAnalytics.model");
const CreatorPointHistory = require("../models/creatorPointHistory.model");
const CreatorWallet = require("../models/creatorWallet.model");
const RedeemRequest = require("../models/redeemRequest.model");
const VerificationRequest = require("../models/verificationRequest.model");
const Watchlist = require("../models/watchlist.model");
const Rating = require("../models/rating.model");
const SupportTicket = require("../models/supportTicket.model");
const SupportMessage = require("../models/supportMessage.model");
const Subscription = require("../models/subscription.model");
const UserOtp = require("../models/user.otp.model");
const AdCampaign = require("../models/adCampaign.model");

const { deleteMedia, deleteMediaFiles } = require("./mediaUrl");
const { deleteVideo } = require("../cdn/bunnyCDN");

/**
 * Permanently purges a user and cascadingly deletes all associated content,
 * interactions, reels, files from Bunny CDN / Bunny Stream, and DB records.
 *
 * @param {string|mongoose.Types.ObjectId} userId - User ID to purge
 * @returns {Promise<{success: boolean, message: string, deletedReelsCount: number}>}
 */
const purgeUserAccount = async (userId) => {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required" };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    console.log(`[USER PURGE] Starting complete purge for user: ${user._id} (${user.name} / ${user.phone})`);

    // -------------------------------------------------------------
    // 1. REELS & MEDIA FILES CLEANUP (DB + Bunny Stream + Bunny CDN)
    // -------------------------------------------------------------
    const userReels = await Reel.find({ user: user._id });
    const reelIds = userReels.map((r) => r._id);

    console.log(`[USER PURGE] Found ${userReels.length} reels to delete.`);

    for (const reel of userReels) {
      try {
        // Delete video from Bunny Stream if videoId exists
        if (reel.videoId) {
          try {
            await deleteVideo(reel.videoId);
            console.log(`[USER PURGE] Deleted Bunny Stream video: ${reel.videoId}`);
          } catch (vErr) {
            console.warn(`[USER PURGE] Failed to delete Bunny Stream video (${reel.videoId}):`, vErr.message);
          }
        }

        // Delete media files from Bunny CDN / local storage
        await deleteMediaFiles(
          reel.videoUrl,
          reel.thumbnailUrl,
          reel.thumbnail,
          reel.streamUrl,
          reel.playbackUrl,
          reel.playlistUrl
        );
      } catch (mediaErr) {
        console.error(`[USER PURGE] Error deleting media for reel ${reel._id}:`, mediaErr.message);
      }
    }

    if (reelIds.length > 0) {
      // Delete all comments on user's reels
      await Comment.deleteMany({ reel: { $in: reelIds } });

      // Delete all interactions (likes, saves, bookmarks) on user's reels
      await Interaction.deleteMany({ contentId: { $in: reelIds } });

      // Delete all qualified views on user's reels
      await QualifiedView.deleteMany({ reelId: { $in: reelIds } });

      // Delete all point history for user's reels
      await CreatorPointHistory.deleteMany({ reelId: { $in: reelIds } });

      // Hard delete user's reels from DB
      await Reel.deleteMany({ user: user._id });
    }

    // -------------------------------------------------------------
    // 2. COMMENTS MADE BY USER ON OTHER CONTENT
    // -------------------------------------------------------------
    const userComments = await Comment.find({ user: user._id });
    for (const comment of userComments) {
      if (comment.reel) {
        await Reel.findByIdAndUpdate(comment.reel, {
          $inc: { commentsCount: -1 },
        }).catch(() => {});
      }
    }
    await Comment.deleteMany({ user: user._id });

    // -------------------------------------------------------------
    // 3. USER INTERACTIONS (Likes, Bookmarks, Saves, Follows)
    // -------------------------------------------------------------
    await Interaction.deleteMany({
      $or: [
        { user: user._id },
        { contentId: user._id, contentType: "user" },
      ],
    });

    // Follow relationships
    await Follow.deleteMany({
      $or: [{ follower: user._id }, { following: user._id }],
    });

    // -------------------------------------------------------------
    // 4. NOTIFICATIONS
    // -------------------------------------------------------------
    await Notification.deleteMany({
      $or: [{ recipient: user._id }, { sender: user._id }],
    });

    // -------------------------------------------------------------
    // 5. CHAT, MESSAGES, CALLS & BLOCKS
    // -------------------------------------------------------------
    await Message.deleteMany({
      $or: [{ sender: user._id }, { recipient: user._id }],
    });
    await Conversation.deleteMany({ participants: user._id });
    await Call.deleteMany({
      $or: [{ caller: user._id }, { receiver: user._id }],
    });
    await UserBlock.deleteMany({
      $or: [{ blocker: user._id }, { blocked: user._id }],
    });

    // -------------------------------------------------------------
    // 6. CREATOR ANALYTICS, POINTS, WALLET & REWARDS
    // -------------------------------------------------------------
    await CreatorAnalytics.deleteMany({ creatorId: user._id });
    await CreatorPointHistory.deleteMany({
      $or: [{ creatorId: user._id }, { userId: user._id }],
    });
    await CreatorWallet.deleteMany({ creatorId: user._id });
    await RedeemRequest.deleteMany({ creatorId: user._id });
    await VerificationRequest.deleteMany({ userId: user._id });

    // -------------------------------------------------------------
    // 7. USER WATCHLIST, RATINGS, SUPPORT & SUBSCRIPTIONS
    // -------------------------------------------------------------
    await Watchlist.deleteMany({ user: user._id });
    await Rating.deleteMany({ user: user._id });
    await SupportMessage.deleteMany({ senderId: user._id });
    await SupportTicket.deleteMany({ user: user._id });
    await Subscription.deleteMany({ user: user._id });
    if (user.phone) {
      await UserOtp.deleteMany({ phone: user.phone });
    }

    // -------------------------------------------------------------
    // 8. AD CAMPAIGNS (If created by user / advertiser)
    // -------------------------------------------------------------
    const userCampaigns = await AdCampaign.find({
      $or: [{ advertiserId: user._id }, { email: user.email }, { phone: user.phone }],
    });
    for (const campaign of userCampaigns) {
      if (campaign.mediaUrl) {
        await deleteMedia(campaign.mediaUrl);
      }
    }
    await AdCampaign.deleteMany({
      $or: [{ advertiserId: user._id }, { email: user.email }, { phone: user.phone }],
    });

    // -------------------------------------------------------------
    // 9. PROFILE IMAGE FROM BUNNY CDN
    // -------------------------------------------------------------
    if (user.profileImage) {
      try {
        await deleteMedia(user.profileImage);
        console.log(`[USER PURGE] Deleted profile image from Bunny CDN: ${user.profileImage}`);
      } catch (imgErr) {
        console.warn(`[USER PURGE] Failed to delete profile image:`, imgErr.message);
      }
    }

    // -------------------------------------------------------------
    // 10. DELETE USER DOCUMENT
    // -------------------------------------------------------------
    await User.findByIdAndDelete(user._id);

    console.log(`[USER PURGE] Successfully purged user ${user._id} and all related data.`);

    return {
      success: true,
      message: "User account and all associated content permanently deleted",
      deletedReelsCount: userReels.length,
    };
  } catch (error) {
    console.error("[USER PURGE] Error during purgeUserAccount:", error);
    throw error;
  }
};

module.exports = {
  purgeUserAccount,
};
