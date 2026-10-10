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
const Ad = require("../models/ad.model");
const AdAnalytics = require("../models/adAnalytics.model");
const FraudLog = require("../models/fraudLog.model");
const Voucher = require("../models/voucher.model");
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const Report = require("../models/report.model");

const { deleteMedia, deleteMediaFiles } = require("./mediaUrl");
const { deleteVideo } = require("../cdn/bunnyCDN");

/**
 * Permanently purges a user and cascadingly deletes all associated content,
 * interactions, reels, media files from Bunny CDN / Bunny Stream, KYC docs,
 * chat media, support files, and DB records.
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

    console.log(`[USER PURGE] Starting complete purge for user: ${user._id} (${user.name || "N/A"} / ${user.phone})`);

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
    // 3. USER INTERACTIONS & CONTENT LIKES/DISLIKES
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

    // Remove user references from Movie & Series likes/dislikes arrays
    await Movie.updateMany(
      { $or: [{ likes: user._id }, { dislikes: user._id }] },
      { $pull: { likes: user._id, dislikes: user._id } }
    ).catch(() => {});

    await Series.updateMany(
      { $or: [{ likes: user._id }, { dislikes: user._id }] },
      { $pull: { likes: user._id, dislikes: user._id } }
    ).catch(() => {});

    // -------------------------------------------------------------
    // 4. NOTIFICATIONS (Direct targeted + broadcast read/deleted)
    // -------------------------------------------------------------
    await Notification.deleteMany({
      $or: [
        { targetUser: user._id },
        { recipient: user._id }, // fallback for any legacy data
        { sender: user._id },
      ],
    });

    // Pull user from broadcast notification tracking lists
    await Notification.updateMany(
      {
        $or: [
          { "readBy.user": user._id },
          { "deletedBy.user": user._id },
        ],
      },
      {
        $pull: {
          readBy: { user: user._id },
          deletedBy: { user: user._id },
        },
      }
    ).catch(() => {});

    // -------------------------------------------------------------
    // 5. CHAT, MESSAGES, CALLS & BLOCKS (Including Message Media files)
    // -------------------------------------------------------------
    const messagesWithMedia = await Message.find({
      $or: [{ sender: user._id }, { recipient: user._id }],
      mediaUrl: { $exists: true, $ne: "" },
    }).select("mediaUrl");

    for (const msg of messagesWithMedia) {
      if (msg.mediaUrl) {
        try {
          await deleteMedia(msg.mediaUrl);
        } catch (mErr) {
          console.warn(`[USER PURGE] Error deleting chat media ${msg.mediaUrl}:`, mErr.message);
        }
      }
    }

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
    await Report.deleteMany({
      $or: [{ reporter: user._id }, { reportedUser: user._id }],
    }).catch(() => {});

    // -------------------------------------------------------------
    // 6. QUALIFIED VIEWS (Both Creator & Viewer)
    // -------------------------------------------------------------
    await QualifiedView.deleteMany({
      $or: [
        { creatorId: user._id },
        { viewerId: user._id },
        ...(reelIds.length > 0 ? [{ reelId: { $in: reelIds } }] : []),
      ],
    });

    // -------------------------------------------------------------
    // 7. FRAUD LOGS
    // -------------------------------------------------------------
    await FraudLog.deleteMany({
      $or: [
        { viewerId: user._id },
        { creatorId: user._id },
        ...(reelIds.length > 0 ? [{ reelId: { $in: reelIds } }] : []),
      ],
    }).catch(() => {});

    // -------------------------------------------------------------
    // 8. CREATOR ANALYTICS, POINTS, WALLET & REWARDS
    // -------------------------------------------------------------
    await CreatorAnalytics.deleteMany({ creatorId: user._id });
    await CreatorPointHistory.deleteMany({
      $or: [{ creatorId: user._id }, { userId: user._id }],
    });
    await CreatorWallet.deleteMany({ creatorId: user._id });
    await RedeemRequest.deleteMany({ creatorId: user._id });

    // -------------------------------------------------------------
    // 9. VERIFICATION REQUESTS & KYC MEDIA (Aadhaar, PAN, Selfie)
    // -------------------------------------------------------------
    const verifications = await VerificationRequest.find({ userId: user._id });
    for (const vReq of verifications) {
      if (vReq.idFront) await deleteMedia(vReq.idFront).catch(() => {});
      if (vReq.idBack) await deleteMedia(vReq.idBack).catch(() => {});
      if (vReq.selfie) await deleteMedia(vReq.selfie).catch(() => {});
    }
    // Delete KYC sensitive media for privacy, but preserve audit record marked as cancelled/purged
    await VerificationRequest.updateMany(
      { userId: user._id },
      {
        $set: {
          status: "CANCELLED",
          adminRemark: "Account purged by user",
          idFront: "",
          idBack: "",
          selfie: "",
          userPurgedAt: new Date(),
        },
      }
    );

    // -------------------------------------------------------------
    // 10. USER WATCHLIST, RATINGS, SUBSCRIPTIONS, OTP & VOUCHERS
    // -------------------------------------------------------------
    await Watchlist.deleteMany({ user: user._id });
    await Rating.deleteMany({ user: user._id });

    // Preserve financial audit records: mark subscription as account_deleted instead of hard deleting
    await Subscription.updateMany(
      { user: user._id },
      {
        $set: {
          status: "account_deleted",
          userPurgedAt: new Date(),
        },
      }
    );

    if (user.phone) {
      await UserOtp.deleteMany({ phone: user.phone });
    }
    // Unlink user from any redeemed vouchers
    await Voucher.updateMany(
      { usedBy: user._id },
      { $set: { usedBy: null } }
    ).catch(() => {});

    // -------------------------------------------------------------
    // 11. SUPPORT TICKETS, MESSAGES & ATTACHMENTS
    // -------------------------------------------------------------
    const userTickets = await SupportTicket.find({ user: user._id });
    const userTicketIds = userTickets.map((t) => t._id);

    // Delete ticket attachments
    for (const ticket of userTickets) {
      if (Array.isArray(ticket.attachments)) {
        for (const att of ticket.attachments) {
          await deleteMedia(att).catch(() => {});
        }
      }
    }

    // Find and delete all messages in user tickets OR sent by user, and their attachments
    const supportMsgs = await SupportMessage.find({
      $or: [
        { ticket: { $in: userTicketIds } },
        { senderId: user._id },
      ],
    });
    for (const sMsg of supportMsgs) {
      if (Array.isArray(sMsg.attachments)) {
        for (const att of sMsg.attachments) {
          await deleteMedia(att).catch(() => {});
        }
      }
    }

    await SupportMessage.deleteMany({
      $or: [
        { ticket: { $in: userTicketIds } },
        { senderId: user._id },
      ],
    });
    await SupportTicket.deleteMany({ user: user._id });

    // -------------------------------------------------------------
    // 12. AD CAMPAIGNS, CHILD ADS, MEDIA & ANALYTICS
    // -------------------------------------------------------------
    const userCampaigns = await AdCampaign.find({
      $or: [{ advertiserId: user._id }, { email: user.email }, { phone: user.phone }],
    });
    const campaignIds = userCampaigns.map((c) => c._id);

    for (const campaign of userCampaigns) {
      if (campaign.mediaUrl) {
        await deleteMedia(campaign.mediaUrl).catch(() => {});
      }
    }

    // Find and delete child ads & media files
    const childAds = await Ad.find({
      $or: [
        { campaignId: { $in: campaignIds } },
        { advertiserId: user._id },
      ],
    });
    for (const ad of childAds) {
      if (ad.mediaUrl) await deleteMedia(ad.mediaUrl).catch(() => {});
      if (ad.thumbnailUrl) await deleteMedia(ad.thumbnailUrl).catch(() => {});
    }

    await Ad.deleteMany({
      $or: [
        { campaignId: { $in: campaignIds } },
        { advertiserId: user._id },
      ],
    });

    await AdAnalytics.deleteMany({
      $or: [
        { campaignId: { $in: campaignIds } },
        { advertiserId: user._id },
      ],
    });

    await AdCampaign.deleteMany({
      $or: [{ advertiserId: user._id }, { email: user.email }, { phone: user.phone }],
    });

    // -------------------------------------------------------------
    // 13. PROFILE IMAGE FROM BUNNY CDN
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
    // 14. DISCONNECT ACTIVE WEBSOCKETS (If connected)
    // -------------------------------------------------------------
    try {
      const { disconnectUserSockets } = require("../socket/chatSocket");
      if (typeof disconnectUserSockets === "function") {
        disconnectUserSockets(user._id);
      }
    } catch (wsErr) {
      console.warn(`[USER PURGE] Error disconnecting sockets:`, wsErr.message);
    }

    // -------------------------------------------------------------
    // 15. DELETE USER DOCUMENT
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
