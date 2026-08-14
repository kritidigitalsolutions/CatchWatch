const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Message = require("../models/message.model");
const Call = require("../models/call.model");

let io = null;
const userSocketsMap = new Map(); // userId -> Set<socketId>

const initSocket = (server, allowedOrigins) => {
  io = socketIO(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
          if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            return callback(null, true);
          }
        }
        const isCatchWatch = /^(https?:\/\/)?([a-z0-9-]+\.)*catchandwatch\.com$/i.test(origin);
        const isLocalhost =
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:");
        if (isCatchWatch || isLocalhost) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 30000,
    connectTimeout: 45000,
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // JWT Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization;

      if (token && token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = (decoded.id || decoded._id || decoded.userId).toString();
      const platform = decoded.platform === "mobile" ? "mobile" : "web";
      socket.userId = userId;
      socket.sessionId = decoded.sessionId || "";
      socket.platform = platform;

      if (decoded.sessionId) {
        const user = await User.findById(userId).select("status sessions activeSession");
        if (!user || user.status === "Blocked") {
          return next(new Error("Authentication error: Account disabled"));
        }

        const currentPlatformSession = user.sessions?.[platform] || (platform === "web" ? user.activeSession : null);

        if (
          currentPlatformSession &&
          currentPlatformSession.sessionId &&
          (currentPlatformSession.sessionId !== decoded.sessionId || currentPlatformSession.status === "REVOKED")
        ) {
          return next(new Error("Authentication error: Session revoked"));
        }
      }

      return next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: User ${userId} (${socket.platform}) (Socket ID: ${socket.id})`);

    // Track user socket
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId).add(socket.id);

    // Join personal room for targeted messaging & calling
    socket.join(`user_${userId}`);

    // Update user status in DB
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit("user_online", { userId });
    } catch (err) {
      console.error("Error updating online status:", err);
    }

    // Mark pending SENT messages as DELIVERED when recipient connects
    try {
      const undeliveredMessages = await Message.find({ recipient: userId, status: "SENT" });
      if (undeliveredMessages.length > 0) {
        const now = new Date();
        await Message.updateMany(
          { recipient: userId, status: "SENT" },
          { $set: { status: "DELIVERED", deliveredAt: now } }
        );

        // Notify senders
        undeliveredMessages.forEach((msg) => {
          io.to(`user_${msg.sender}`).emit("message_delivered", {
            messageId: msg._id,
            conversationId: msg.conversationId,
            deliveredAt: now,
          });
        });
      }
    } catch (err) {
      console.error("Error updating undelivered messages status:", err);
    }

    // Event: Join specific conversation room
    socket.on("join_conversation", (conversationId) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
      }
    });

    // Event: Leave specific conversation room
    socket.on("leave_conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    // Event: Typing start
    socket.on("typing_start", ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user_${recipientId}`).emit("user_typing_start", {
          conversationId,
          userId,
        });
      }
    });

    // Event: Typing stop
    socket.on("typing_stop", ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user_${recipientId}`).emit("user_typing_stop", {
          conversationId,
          userId,
        });
      }
    });

    // Event: Call Media State Change (e.g. mic mute/unmute, video on/off)
    socket.on("call_media_toggle", ({ targetUserId, callId, isMuted, isVideoOff }) => {
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit("call_media_toggled", {
          callId,
          userId,
          isMuted,
          isVideoOff,
        });
      }
    });

    // Event: Disconnect
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Socket disconnected: User ${userId} (Socket ID: ${socket.id}, Reason: ${reason})`);
      const userSet = userSocketsMap.get(userId);
      if (userSet) {
        userSet.delete(socket.id);
        if (userSet.size === 0) {
          userSocketsMap.delete(userId);
          const lastSeen = new Date();
          try {
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen,
            });
            io.emit("user_offline", { userId, lastSeen });
          } catch (err) {
            console.error("Error updating offline status:", err);
          }

          // Clean up any active calls if user disconnected unexpectedly
          try {
            const activeCall = await Call.findOne({
              $or: [{ caller: userId }, { receiver: userId }],
              status: { $in: ["calling", "ringing", "accepted"] },
            });

            if (activeCall) {
              activeCall.status = "ended";
              activeCall.endedAt = new Date();
              await activeCall.save();

              const otherUser =
                activeCall.caller.toString() === userId
                  ? activeCall.receiver
                  : activeCall.caller;

              if (otherUser) {
                io.to(`user_${otherUser}`).emit("call_ended", {
                  callId: activeCall._id,
                  reason: "peer_disconnected",
                });
              }
            }
          } catch (callErr) {
            console.error("Error cleaning up call on disconnect:", callErr);
          }
        }
      }
    });
  });

  return io;
};

const getIO = () => io;

const getUserSockets = (userId) => userSocketsMap.get(userId.toString());

const revokeUserSockets = (userId, platform = "web", exceptSessionId = null) => {
  if (!io || !userId) return;
  const userIdStr = userId.toString();
  const socketIds = userSocketsMap.get(userIdStr);
  if (!socketIds || socketIds.size === 0) return;

  for (const socketId of Array.from(socketIds)) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.platform === platform && (!exceptSessionId || s.sessionId !== exceptSessionId)) {
      console.log(`🔌 Revoking ${platform} socket ${socketId} for user ${userIdStr} (Session: ${s.sessionId})`);
      s.emit("session_revoked", {
        code: "SESSION_REVOKED",
        platform,
        message: "Your account was logged in on another device.",
      });
      s.disconnect(true);
    }
  }
};

module.exports = {
  initSocket,
  getIO,
  getUserSockets,
  revokeUserSockets,
};
