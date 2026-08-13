const { RtcTokenBuilder, RtcRole, ChatTokenBuilder } = require("agora-token");
const axios = require("axios");

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

/**
 * Register Agora Chat User securely on backend using REST API
 * @param {string} userId - User ID (Mongo ID)
 */
const registerAgoraChatUser = async (userId) => {
  const appId = process.env.AGORA_APP_ID || "";
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";
  const appKey = process.env.AGORA_CHAT_APP_KEY || "";

  if (!appId || !appCertificate || !appKey) {
    console.error("Agora credentials missing for user registration");
    return false;
  }

  const parts = appKey.split("#");
  if (parts.length !== 2) {
    console.error("Invalid AGORA_CHAT_APP_KEY format. Expected 'orgName#appName'");
    return false;
  }
  const [orgName, appName] = parts;

  try {
    // 1. Generate App Token
    const appToken = ChatTokenBuilder.buildAppToken(appId, appCertificate, 3600);

    // 2. Call Agora REST API to create user
    const url = `https://a1.chat.agora.io/${orgName}/${appName}/users`;
    const response = await axios.post(
      url,
      {
        username: userId.toString(),
        password: userId.toString(),
      },
      {
        headers: {
          Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Agora Chat User Registered successfully:", response.data);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const errorMsg = error.response.data?.error || "";
      const errorDesc = error.response.data?.error_description || "";
      if (
        errorMsg.includes("duplicate") ||
        errorMsg.includes("already") ||
        errorDesc.toLowerCase().includes("already")
      ) {
        console.log("Agora Chat User already exists.");
        return true;
      }
    }
    console.error(
      "Agora Chat User Registration failed:",
      error.response ? error.response.data : error.message
    );
    return false;
  }
};

module.exports = {
  generateRtcToken,
  generateChatToken,
  registerAgoraChatUser,
};

