const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Message = require("../models/message.model");

let io = null;
const userSocketsMap = new Map(); // userId -> Set<socketId>

const initSocket = (server, allowedOrigins) => {
  io = socketIO(server, {
    cors: {
      origin: allowedOrigins || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
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
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: User ${userId} (Socket ID: ${socket.id})`);

    // Track user socket
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId).add(socket.id);

    // Join personal room for targeted messaging
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

    // Event: Disconnect
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: User ${userId} (Socket ID: ${socket.id})`);
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
        }
      }
    });
  });

  return io;
};

const getIO = () => io;

const getUserSockets = (userId) => userSocketsMap.get(userId.toString());

module.exports = {
  initSocket,
  getIO,
  getUserSockets,
};
