const { RtcTokenBuilder, RtcRole, ChatTokenBuilder } = require("agora-token");

/**
 * Generate Agora RTC Token securely on backend
 * @param {Object} params
 * @param {string} params.channelName - Agora channel name
 * @param {number|string} params.uid - User ID (numeric int)
 * @param {string} [params.role="publisher"] - "publisher" or "subscriber"
 * @param {number} [params.expireTime=3600] - Expiration time in seconds
 */
const generateRtcToken = ({
  channelName,
  uid = 0,
  role = "publisher",
  expireTime = 3600,
}) => {
  const appId = process.env.AGORA_APP_ID || "";
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";

  if (!appId) {
    console.error("AGORA_APP_ID is not set in .env");
    return { token: "", appId: "", channelName, uid: 0, expiresAt: 0 };
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + (expireTime || 3600);

  const rtcRole =
    role === "publisher" || role === 1
      ? RtcRole.PUBLISHER
      : RtcRole.SUBSCRIBER;

  let numericUid = 0;
  if (typeof uid === "number" && !isNaN(uid)) {
    numericUid = uid;
  } else if (typeof uid === "string") {
    const cleaned = uid.replace(/\D/g, "");
    const parsed = parseInt(cleaned.slice(-8), 10);
    numericUid = isNaN(parsed) ? 0 : parsed;
  }

  let token = "";
  try {
    if (appId && appCertificate) {
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        numericUid,
        rtcRole,
        privilegeExpireTime,
        privilegeExpireTime
      );
    } else if (appId) {
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        "",
        channelName,
        numericUid,
        rtcRole,
        privilegeExpireTime,
        privilegeExpireTime
      );
    }
  } catch (error) {
    console.error("Agora RTC Token Generation Error:", error.message);
  }

  return {
    token,
    appId,
    channelName,
    uid: numericUid,
    expiresAt: privilegeExpireTime,
  };
};

/**
 * Generate Agora Chat User Token securely on backend
 * @param {string} userId - Mongo User ID
 * @param {number} [expireTime=86400] - Expiration in seconds (default 24h)
 */
const generateChatToken = (userId, expireTime = 86400) => {
  const appId = process.env.AGORA_APP_ID || "";
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";
  const appKey = process.env.AGORA_CHAT_APP_KEY || "";

  if (!appId || !appCertificate) {
    console.error("AGORA_APP_ID or AGORA_APP_CERTIFICATE missing in .env");
    return { token: "", appId, appKey, userId: userId ? userId.toString() : "", expiresAt: 0 };
  }

  const userStr = userId ? userId.toString() : "";
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expireTime;

  let token = "";
  try {
    if (ChatTokenBuilder && typeof ChatTokenBuilder.buildUserToken === "function") {
      token = ChatTokenBuilder.buildUserToken(
        appId,
        appCertificate,
        userStr,
        privilegeExpireTime
      );
    } else if (ChatTokenBuilder && typeof ChatTokenBuilder.buildTokenWithUserAccount === "function") {
      token = ChatTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate,
        userStr,
        privilegeExpireTime
      );
    }
  } catch (error) {
    console.error("Agora Chat Token Generation Error:", error.message);
  }

  return {
    token,
    appId,
    appKey,
    userId: userStr,
    expiresAt: privilegeExpireTime,
  };
};

module.exports = {
  generateRtcToken,
  generateChatToken,
};

