import AgoraChat from "agora-chat";

let conn = null;

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
 * Open Agora Chat connection for authenticated user
 */
export const loginAgoraChat = async (userId, token, appKey) => {
  if (!userId || !token || !appKey) return null;

  const client = getAgoraConnection(appKey);
  if (!client) return null;

  try {
    await client.open({
      user: userId.toString(),
      agoraToken: token,
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
  if (!conn) {
    throw new Error("Agora Chat connection is not open");
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
    console.error("Agora Send Message Error:", err);
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
