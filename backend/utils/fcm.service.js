const {
  admin,
  firebaseInitialized,
} = require("../config/firebase");

/**
 * Sends a real or mock push notification using Firebase Cloud Messaging.
 * @param {Object} params
 * @param {string} params.token - Target FCM token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body content
 * @param {string} [params.imageUrl] - Rich notification image URL (e.g. poster, avatar)
 * @param {Object} [params.data] - Optional metadata (converted to key-value strings)
 */
const sendPushNotification = async ({ token, title, body, imageUrl, data }) => {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    const image = imageUrl || data?.imageUrl || data?.image || "";

    if (!firebaseInitialized) {
      console.log("-----------------------------------------");
      console.log("🔔 PUSH NOTIFICATION SENT (MOCK/STUB MODE)");
      console.log("To:", token);
      console.log("Title:", title);
      console.log("Body:", body);
      if (image) console.log("Image URL:", image);
      console.log("Data:", data);
      console.log("-----------------------------------------");
      return { success: true, messageId: `mock-id-${Date.now()}` };
    }

    // Convert data fields to strings, as FCM data payload requires string values
    const stringifiedData = {};
    if (data) {
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          stringifiedData[key] = String(data[key]);
        }
      });
    }
    if (image) {
      stringifiedData.imageUrl = String(image);
      stringifiedData.image = String(image);
    }

    const notificationPayload = {
      title,
      body,
    };
    if (image) {
      notificationPayload.imageUrl = image;
    }

    const message = {
      token,
      notification: notificationPayload,
      data: stringifiedData,
    };

    if (image) {
      message.android = {
        notification: {
          imageUrl: image,
          channelId: "catchwatch_default_channel",
          priority: "high",
        },
      };
      message.apns = {
        payload: {
          aps: {
            "mutable-content": 1,
          },
        },
        fcmOptions: {
          image: image,
        },
      };
      message.webpush = {
        notification: {
          image: image,
        },
      };
    }

    const response = await admin.messaging().send(message);
    console.log("Successfully sent FCM notification:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("FCM Send Error:", error);
    return {
      success: false,
      code: error.code,
      message: error.message,
    };
  }
};

module.exports = { sendPushNotification };
