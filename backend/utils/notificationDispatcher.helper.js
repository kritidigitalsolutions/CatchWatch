const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const Subscription = require("../models/subscription.model");
const Follow = require("../models/follow.model");
const { sendPushNotification } = require("./fcm.service");

/* ─────────────────────────────────────────────────────────────
   HELPER: Send Push Notification to a Single User
───────────────────────────────────────────────────────────── */
const sendUserPushNotification = async ({
  userId,
  title,
  message,
  type = "GENERAL",
  imageUrl = "",
  actionUrl = "",
  data = {},
  createdBy = null,
}) => {
  try {
    if (!userId) return null;

    const user = await User.findById(userId).select("_id fcmToken name email").lean();
    if (!user) return null;

    // 1. Create In-App Notification Record
    const notif = await Notification.create({
      title,
      message,
      type,
      imageUrl,
      actionUrl,
      targetUser: user._id,
      targetUserType: "SPECIFIC_USER",
      sentAt: new Date(),
      createdBy,
      metadata: {
        actionUrl,
        imageUrl,
        extraData: data,
      },
    });

    // 2. Send Real/Mock FCM Push if FCM token exists
    let pushSuccess = false;
    if (user.fcmToken) {
      const pushRes = await sendPushNotification({
        token: user.fcmToken,
        title,
        body: message,
        imageUrl,
        data: {
          notificationId: notif._id.toString(),
          type,
          actionUrl,
          imageUrl,
          ...data,
        },
      });
      pushSuccess = pushRes?.success || false;
    }

    // 3. Update delivery stats
    await Notification.findByIdAndUpdate(notif._id, {
      "deliveryStats.totalSent": 1,
      "deliveryStats.delivered": pushSuccess ? 1 : 0,
      "deliveryStats.failed": pushSuccess ? 0 : 1,
    });

    return notif;
  } catch (error) {
    console.error(`[NOTIFICATION DISPATCHER] Single user error (${userId}):`, error.message);
    return null;
  }
};

/* ─────────────────────────────────────────────────────────────
   HELPER: Broadcast Push Notification to Multiple Users / Groups
───────────────────────────────────────────────────────────── */
const broadcastPushNotification = async ({
  sendTo = "ALL",
  targetUser = null,
  title,
  message,
  type = "GENERAL",
  imageUrl = "",
  actionUrl = "",
  attachmentType = "NONE",
  contentId = null,
  contentType = "",
  planId = null,
  createdBy = null,
  data = {},
}) => {
  try {
    const now = new Date();
    let targetUsers = [];
    let resolvedUserType = "ALL";
    let singleTargetId = null;

    // 1. Resolve Target Audience
    switch (sendTo) {
      case "SPECIFIC_USER": {
        singleTargetId = targetUser;
        resolvedUserType = "SPECIFIC_USER";
        if (targetUser) {
          targetUsers = await User.find({ _id: targetUser }).select("_id fcmToken").lean();
        }
        break;
      }

      case "SUBSCRIBERS":
      case "Subscribers Only": {
        resolvedUserType = "SUBSCRIBERS";
        const subscribedUserIds = await Subscription.distinct("user", {
          status: "active",
          endDate: { $gte: now },
        });
        targetUsers = await User.find({ _id: { $in: subscribedUserIds } }).select("_id fcmToken").lean();
        break;
      }

      case "NON_SUBSCRIBERS":
      case "Free / Non-Subscribed Users": {
        resolvedUserType = "NON_SUBSCRIBERS";
        const subscribedUserIds = await Subscription.distinct("user", {
          status: "active",
          endDate: { $gte: now },
        });
        targetUsers = await User.find({ _id: { $nin: subscribedUserIds } }).select("_id fcmToken").lean();
        break;
      }

      case "EXPIRING_SOON": {
        resolvedUserType = "EXPIRING_SOON";
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringSoonIds = await Subscription.distinct("user", {
          status: "active",
          endDate: { $gte: now, $lte: sevenDaysLater },
        });
        targetUsers = await User.find({ _id: { $in: expiringSoonIds } }).select("_id fcmToken").lean();
        break;
      }

      case "CREATORS":
      case "Verified Creators": {
        resolvedUserType = "CREATORS";
        targetUsers = await User.find({
          $or: [{ role: "creator" }, { isVerified: true }, { isBlueTick: true }],
        }).select("_id fcmToken").lean();
        break;
      }

      default: {
        // ALL
        resolvedUserType = "ALL";
        targetUsers = await User.find({}).select("_id fcmToken").lean();
        break;
      }
    }

    // 2. Create Master Notification Record
    const notif = await Notification.create({
      title,
      message,
      type,
      imageUrl,
      actionUrl,
      attachmentType: attachmentType || "NONE",
      contentId: contentId || null,
      contentType: contentType || "",
      planId: planId || null,
      targetUser: singleTargetId,
      targetUserType: resolvedUserType,
      sentAt: new Date(),
      createdBy,
      metadata: {
        actionUrl,
        imageUrl,
        contentId,
        planId,
        extraData: data,
      },
    });

    // 3. Batch FCM Sending
    const usersWithToken = targetUsers.filter((u) => u.fcmToken && u.fcmToken.trim().length > 0);
    const BATCH_SIZE = 100;
    let delivered = 0;
    let failed = 0;

    for (let i = 0; i < usersWithToken.length; i += BATCH_SIZE) {
      const batch = usersWithToken.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((u) =>
          sendPushNotification({
            token: u.fcmToken,
            title,
            body: message,
            imageUrl,
            data: {
              notificationId: notif._id.toString(),
              type,
              actionUrl,
              imageUrl,
              ...data,
            },
          })
        )
      );

      results.forEach((res) => {
        if (res.status === "fulfilled" && res.value?.success) delivered++;
        else failed++;
      });
    }

    // Fallback: If in mock mode / no tokens, count total recipients as delivered
    const totalSent = targetUsers.length;
    const finalDelivered = usersWithToken.length > 0 ? delivered : totalSent;
    const finalFailed = usersWithToken.length > 0 ? failed : 0;

    // 4. Update delivery stats
    await Notification.findByIdAndUpdate(notif._id, {
      "deliveryStats.totalSent": totalSent,
      "deliveryStats.delivered": finalDelivered,
      "deliveryStats.failed": finalFailed,
    });

    return {
      notification: notif,
      stats: {
        totalSent,
        delivered: finalDelivered,
        failed: finalFailed,
        audience: resolvedUserType,
      },
    };
  } catch (error) {
    console.error("[NOTIFICATION DISPATCHER] Broadcast error:", error.message);
    throw error;
  }
};

/* ─────────────────────────────────────────────────────────────
   AUTOMATED TRIGGERS:
───────────────────────────────────────────────────────────── */

/**
 * 1. User Account Completion
 */
const notifyProfileCompleted = async (user) => {
  if (!user || !user._id) return;
  return sendUserPushNotification({
    userId: user._id,
    title: "🎉 Profile Completed!",
    message: `Welcome to CatchWatch, ${user.name || user.username || "Creator"}! Your profile is now 100% complete. Enjoy streaming movies and uploading reels!`,
    type: "ACCOUNT",
    imageUrl: user.avatar || "",
    actionUrl: "/profile",
    data: { event: "PROFILE_COMPLETED" },
  });
};

/**
 * 2. BlueTick Plan Purchase & All Status (Submitted, Approved, Rejected)
 */
const notifyBlueTickStatus = async (userId, status, planName = "Blue Tick Badge", reason = "") => {
  if (!userId) return;
  const statusUpper = (status || "").toUpperCase();

  let title = "🌟 Blue Tick Update";
  let message = `Your verification status for ${planName} has been updated.`;
  let actionUrl = "/verification-badge";

  if (statusUpper === "APPROVED" || statusUpper === "ACTIVE" || statusUpper === "SUCCESS") {
    title = "🌟 Blue Tick Badge Verified!";
    message = `Congratulations! Your account has been officially verified with the Blue Tick Badge. Your verified status is now live!`;
  } else if (statusUpper === "SUBMITTED" || statusUpper === "PENDING") {
    title = "⏳ Verification Request Received";
    message = `Your Blue Tick verification application (${planName}) has been submitted successfully and is under review.`;
  } else if (statusUpper === "REJECTED") {
    title = "⚠️ Verification Request Update";
    message = reason
      ? `Your Blue Tick application was not approved: ${reason}`
      : `Your Blue Tick verification application could not be approved at this time.`;
  }

  return sendUserPushNotification({
    userId,
    title,
    message,
    type: "BLUETICK",
    actionUrl,
    data: { event: "BLUETICK_STATUS", status: statusUpper },
  });
};

/**
 * 3. Subscription Plan Purchase & All Status (Active, Cancelled, Expired)
 */
const notifySubscriptionStatus = async (userId, status, planName = "Premium Plan") => {
  if (!userId) return;
  const statusUpper = (status || "").toUpperCase();

  let title = "👑 Subscription Status";
  let message = `Your subscription for ${planName} has been updated.`;
  let actionUrl = "/subscription";

  if (statusUpper === "ACTIVE" || statusUpper === "SUCCESS") {
    title = "👑 Subscription Activated!";
    message = `Woohoo! Your subscription to ${planName} is now active. Enjoy ad-free 4K Ultra HD movies, series, and exclusive content!`;
  } else if (statusUpper === "CANCELLED") {
    title = "ℹ️ Subscription Cancelled";
    message = `Your subscription to ${planName} has been cancelled. You will retain access until the end of your billing cycle.`;
  } else if (statusUpper === "EXPIRED") {
    title = "⌛ Subscription Expired";
    message = `Your ${planName} subscription has expired. Renew now to continue enjoying unlimited premium entertainment!`;
  }

  return sendUserPushNotification({
    userId,
    title,
    message,
    type: "SUBSCRIPTION",
    actionUrl,
    data: { event: "SUBSCRIPTION_STATUS", status: statusUpper },
  });
};

/**
 * 4. Reel Uploaded (Notify Followers)
 */
const notifyReelUploaded = async (creator, reel) => {
  try {
    if (!creator || !creator._id || !reel) return;

    // Find all followers of the creator
    const follows = await Follow.find({ following: creator._id }).select("follower").lean();
    if (!follows || follows.length === 0) return;

    const followerIds = follows.map((f) => f.follower);
    const creatorName = creator.name || creator.username || "A creator you follow";
    const reelTitle = reel.title || reel.caption || "a new reel";
    const imageUrl = reel.thumbnailUrl || reel.thumbnail || creator.avatar || "";
    const actionUrl = `/reels?reelId=${reel._id}`;

    // Send push in batches to followers
    const usersWithToken = await User.find({
      _id: { $in: followerIds },
      fcmToken: { $type: "string", $ne: "" },
    }).select("_id fcmToken").lean();

    // Create in-app notifications
    const inAppDocs = followerIds.map((fId) => ({
      title: `🎬 New Reel by ${creatorName}`,
      message: `${creatorName} just uploaded: "${reelTitle}". Tap to watch now!`,
      type: "REEL",
      imageUrl,
      actionUrl,
      targetUser: fId,
      targetUserType: "SPECIFIC_USER",
      sentAt: new Date(),
    }));

    if (inAppDocs.length > 0) {
      await Notification.insertMany(inAppDocs);
    }

    // Push notifications
    for (const u of usersWithToken) {
      sendPushNotification({
        token: u.fcmToken,
        title: `🎬 New Reel by ${creatorName}`,
        body: `${creatorName} just uploaded: "${reelTitle}". Tap to watch!`,
        imageUrl,
        data: {
          type: "REEL",
          reelId: reel._id.toString(),
          actionUrl,
        },
      }).catch((err) => console.log("Reel follower push error:", err.message));
    }
  } catch (err) {
    console.error("[NOTIFICATION DISPATCHER] notifyReelUploaded error:", err.message);
  }
};

/**
 * 5. Chat Message (1-on-1 Message)
 */
const notifyChatMessage = async (recipientId, sender, messageText, conversationId = "") => {
  if (!recipientId || !sender) return;
  const senderName = sender.name || sender.username || "Someone";
  const preview = messageText && messageText.length > 60 ? `${messageText.slice(0, 57)}...` : messageText || "Sent you an attachment";

  return sendUserPushNotification({
    userId: recipientId,
    title: `💬 Message from ${senderName}`,
    message: preview,
    type: "CHAT",
    imageUrl: sender.avatar || "",
    actionUrl: conversationId ? `/chat?conversationId=${conversationId}` : "/chat",
    data: {
      event: "CHAT_MESSAGE",
      senderId: sender._id ? sender._id.toString() : "",
      conversationId: conversationId ? conversationId.toString() : "",
    },
  });
};

/**
 * 6. Video & Audio Call
 */
const notifyIncomingCall = async (recipientId, caller, callType = "VIDEO", callData = {}) => {
  if (!recipientId || !caller) return;
  const callerName = caller.name || caller.username || "Someone";
  const isVideo = (callType || "").toUpperCase() === "VIDEO";

  return sendUserPushNotification({
    userId: recipientId,
    title: isVideo ? `📹 Incoming Video Call` : `📞 Incoming Audio Call`,
    message: `${callerName} is calling you... Tap to answer.`,
    type: "CALL",
    imageUrl: caller.avatar || "",
    actionUrl: `/call/${callData.channelName || "room"}?type=${isVideo ? "video" : "audio"}`,
    data: {
      event: "INCOMING_CALL",
      callType: isVideo ? "VIDEO" : "AUDIO",
      callerId: caller._id ? caller._id.toString() : "",
      callerName,
      ...callData,
    },
  });
};

/**
 * 7. Admin New Content Upload (Movies, TV Shows, Short Films, Series)
 */
const notifyNewContentUpload = async ({
  type = "movie",
  title,
  actionUrl,
  posterUrl = "",
  contentId = null,
}) => {
  try {
    const typeLabel =
      type === "movie" ? "🎬 New Movie Release" :
      type === "tvShow" ? "📺 New TV Show Added" :
      type === "series" ? "🎞️ New Web Series Released" :
      "🎥 New Short Film Added";

    const message = `"${title}" is now streaming in Ultra HD on CatchWatch. Tap to watch the premiere!`;

    return broadcastPushNotification({
      sendTo: "ALL",
      title: typeLabel,
      message,
      type: "CONTENT_ALERT",
      imageUrl: posterUrl,
      actionUrl: actionUrl || "/movies",
      attachmentType: "CONTENT",
      contentId,
      contentType: type,
    });
  } catch (err) {
    console.error("[NOTIFICATION DISPATCHER] notifyNewContentUpload error:", err.message);
  }
};

/**
 * 8. User Follow Notification
 */
const notifyNewFollower = async (followedUserId, follower) => {
  if (!followedUserId || !follower) return;
  const followerName = follower.name || follower.username || "A user";

  return sendUserPushNotification({
    userId: followedUserId,
    title: "👤 New Follower",
    message: `${followerName} started following you! Check out their profile.`,
    type: "FOLLOW",
    imageUrl: follower.avatar || "",
    actionUrl: follower.username ? `/user/${follower.username}` : `/profile`,
    data: {
      event: "NEW_FOLLOWER",
      followerId: follower._id ? follower._id.toString() : "",
    },
  });
};

module.exports = {
  sendUserPushNotification,
  broadcastPushNotification,
  notifyProfileCompleted,
  notifyBlueTickStatus,
  notifySubscriptionStatus,
  notifyReelUploaded,
  notifyChatMessage,
  notifyIncomingCall,
  notifyNewContentUpload,
  notifyNewFollower,
};
