const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const { sendPushNotification } = require("./fcm.service");

exports.notifyNewContent = async ({
    title,
    message,
    type,
    actionUrl,
    createdBy
}) => {

    // const users = await User.find({
    //     fcmToken: {
    //         $exists: true,
    //         $ne: ""
    //     }
    // }).select("_id fcmToken");
const users = await User.find({
  fcmToken: {
    $exists: true,
    $nin: ["", null],
  },
}).select("_id fcmToken");
    const notification = await Notification.create({
        title,
        message,
        type,
        targetUser: null,
        targetUserType: "ALL",
        metadata: {
            actionUrl
        },
        createdBy,
        sentAt: new Date()
    });

    // await Promise.allSettled(
    //     users.map(user =>
    //         sendPushNotification({
    //             token: user.fcmToken,
    //             title,
    //             body: message,
    //             data: {
    //                 notificationId: notification._id.toString(),
    //                 type,
    //                 actionUrl
    //             }
    //         })
    //     )
    // );
await Promise.allSettled(
  users.map(async (user) => {
    const result = await sendPushNotification({
      token: user.fcmToken,
      title,
      body: message,
      data: {
        notificationId: notification._id.toString(),
        type,
        actionUrl,
      },
    });

    if (
      !result.success &&
      result.code === "messaging/registration-token-not-registered"
    ) {
      await User.findByIdAndUpdate(user._id, {
        $unset: { fcmToken: 1 },
      });

      console.log(`Removed invalid FCM token for user ${user._id}`);
    }
  })
);
    return notification;
};