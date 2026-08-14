import AgoraChat from "agora-chat";

let conn = null;
let lastUserCredentials = null;

/**
 * Initialize Agora Chat Client Connection
 */
export const getAgoraConnection = (appKey) => {
  if (!conn && appKey) {
    const ConnectionCtor = AgoraChat.connection || AgoraChat.Connection;
    if (!ConnectionCtor) {
      console.error("AgoraChat connection constructor not found on AgoraChat object:", AgoraChat);
      return null;
    }
    conn = new ConnectionCtor({
      appKey: appKey,
      isHttpDNS: true,
    });
  }
  return conn;
};

/**
 * Check if Agora Chat Connection is currently open
 */
export const isAgoraConnected = () => {
  return !!(conn && typeof conn.isOpened === "function" && conn.isOpened());
};

/**
 * Open Agora Chat connection for authenticated user
 */
export const loginAgoraChat = async (userId, token, appKey) => {
  if (!userId || !token || !appKey) return null;

  // Cache user credentials to allow transparent auto-reconnections
  lastUserCredentials = { userId, token, appKey };

  const client = getAgoraConnection(appKey);
  if (!client) return null;

  try {
    await client.open({
      user: userId.toString(),
      accessToken: token,
      agoraToken: token, // fallback for older SDK compatibility
    });
    console.log("Agora Chat Connected for user:", userId);
    return client;
  } catch (err) {
    console.warn("Agora Chat Login Error:", err);
    return null;
  }
};

/**
 * Send encrypted 1-on-1 peer message via Agora Chat SDK
 */
export const sendAgoraPeerMessage = async (recipientId, ciphertext, extData = {}) => {
  if (!isAgoraConnected()) {
    if (lastUserCredentials) {
      console.log("Agora connection closed. Attempting auto-reconnection...");
      const reconnected = await loginAgoraChat(
        lastUserCredentials.userId,
        lastUserCredentials.token,
        lastUserCredentials.appKey
      );
      if (!reconnected || !isAgoraConnected()) {
        throw new Error("Agora Chat connection is closed and auto-reconnection failed.");
      }
    } else {
      throw new Error("Agora Chat connection is not open and no credentials cached");
    }
  }

  const option = {
    chatType: "singleChat",
    type: "txt",
    to: recipientId.toString(),
    msg: ciphertext,
    ext: extData,
  };

  const MessageFactory = AgoraChat.message || AgoraChat.Message;
  const msg = MessageFactory.create(option);
  try {
    const res = await conn.send(msg);
    return res;
  } catch (err) {
    console.error("Agora Send Message Error Details:", {
      code: err?.code || "unknown",
      type: err?.type || "unknown",
      description: err?.description || err?.message || "No error details",
      data: err?.data || null
    });
    throw err;
  }
};

/**
 * Register real-time event handlers (text messages, status, presence)
 */
export const addAgoraEventHandler = (handlerId, handlers) => {
  if (conn && typeof conn.addEventHandler === "function") {
    conn.addEventHandler(handlerId, handlers);
  }
};

/**
 * Remove event handler
 */
export const removeAgoraEventHandler = (handlerId) => {
  if (conn && typeof conn.removeEventHandler === "function") {
    conn.removeEventHandler(handlerId);
  }
};

/**
 * Close Agora Chat Connection
 */
export const logoutAgoraChat = () => {
  if (conn) {
    try {
      conn.close();
    } catch (e) {
      console.warn("Error closing Agora Connection:", e);
    }
  }
};
