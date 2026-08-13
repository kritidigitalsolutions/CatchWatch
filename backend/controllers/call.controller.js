const mongoose = require("mongoose");
const Call = require("../models/call.model");
const User = require("../models/user.model");
const UserBlock = require("../models/userBlock.model");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const { generateRtcToken } = require("../services/agora.service");
const { getIO } = require("../socket/chatSocket");

// Helper to convert Mongo ID string to numeric UID for Agora
const getNumericUid = (idStr) => {
  if (!idStr) return Math.floor(Math.random() * 1000000);
  const digits = String(idStr).replace(/\D/g, "");
  const num = parseInt(digits.slice(-8), 10);
  return isNaN(num) ? Math.floor(Math.random() * 1000000) : num;
};

// Helper to write call logs to chat conversations
const createCallLogMessage = async (call) => {
  try {
    const callerId = call.caller.toString();
    const receiverId = call.receiver.toString();

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [callerId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [callerId, receiverId],
        unreadCount: {
          [callerId]: 0,
          [receiverId]: 0,
        },
      });
    }

    // Determine the call log text
    let text = "";
    const isVideo = call.type === "video";
    const typeLabel = isVideo ? "Video Call" : "Voice Call";

    if (call.status === "ended") {
      const durationSec = call.duration || 0;
      const m = Math.floor(durationSec / 60);
      const s = durationSec % 60;
      const durationStr = `${m}:${s < 10 ? "0" : ""}${s}`;
      text = `📞 ${typeLabel} ended (${durationStr})`;
    } else if (call.status === "rejected") {
      text = `📞 Declined ${typeLabel}`;
    } else if (call.status === "busy") {
      text = `📞 Busy ${typeLabel}`;
    } else if (call.status === "cancelled") {
      text = `📞 Cancelled ${typeLabel}`;
    } else if (call.status === "missed") {
      text = `📞 Missed ${typeLabel}`;
    } else {
      return; // Do not log other statuses like ringing/calling
    }

    // Create call log message in database
    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: call.caller, // Always log caller as the sender/initiator
      recipient: call.receiver,
      messageType: "call",
      text: text,
      status: "SENT",
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name username profileImage publicKey")
      .populate("recipient", "name username profileImage publicKey");

    // Update conversation lastMessage & lastMessageAt
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();

    // Increment unreadCount for the receiver
    if (["ended", "missed", "rejected"].includes(call.status)) {
      const currentUnread = (conversation.unreadCount && conversation.unreadCount.get(receiverId)) || 0;
      if (!conversation.unreadCount) conversation.unreadCount = new Map();
      conversation.unreadCount.set(receiverId, currentUnread + 1);
    }
    await conversation.save();

    // Emit Socket events to recipient and sender
    const io = getIO();
    if (io) {
      io.to(`user_${receiverId}`).emit("new_message", populatedMessage);
      io.to(`user_${callerId}`).emit("new_message", populatedMessage);
      io.to(`user_${receiverId}`).emit("message_sent", populatedMessage);
      io.to(`user_${callerId}`).emit("message_sent", populatedMessage);
    }
  } catch (err) {
    console.error("Error creating call log message:", err);
  }
};

// =========================================================
// 1. START A CALL (POST /api/calls)
// =========================================================
exports.startCall = async (req, res) => {
  try {
    const callerId = req.user.id;
    const { receiverId, type } = req.body;

    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Valid receiverId is required",
      });
    }

    if (!type || !["audio", "video"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Call type must be 'audio' or 'video'",
      });
    }

    if (callerId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot call yourself",
      });
    }

    const receiver = await User.findById(receiverId).select(
      "_id name username profileImage isOnline"
    );
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    const caller = await User.findById(callerId).select(
      "_id name username profileImage"
    );

    // Check if blocked (either direction)
    const isBlocked = await UserBlock.findOne({
      $or: [
        { blocker: callerId, blocked: receiverId },
        { blocker: receiverId, blocked: callerId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot initiate call with this user",
      });
    }

    // Auto-expire stale ringing/calling calls older than 45 seconds
    const staleTime = new Date(Date.now() - 45000);
    await Call.updateMany(
      {
        status: { $in: ["calling", "ringing"] },
        createdAt: { $lt: staleTime },
      },
      {
        $set: { status: "missed", endedAt: new Date() },
      }
    );

    // Auto-expire stale accepted calls older than 4 hours
    const staleAcceptedTime = new Date(Date.now() - 4 * 60 * 60 * 1000);
    await Call.updateMany(
      {
        status: "accepted",
        updatedAt: { $lt: staleAcceptedTime },
      },
      {
        $set: { status: "ended", endedAt: new Date() },
      }
    );

    // Check if receiver is already in an active call
    const activeCall = await Call.findOne({
      $or: [{ caller: receiverId }, { receiver: receiverId }],
      status: { $in: ["calling", "ringing", "accepted"] },
    });

    if (activeCall) {
      // Create a busy call record
      const busyCall = await Call.create({
        caller: callerId,
        receiver: receiverId,
        type,
        channelName: `cw_call_${Date.now()}_${callerId}`,
        status: "busy",
        endedAt: new Date(),
      });

      const io = getIO();
      if (io) {
        io.to(`user_${callerId}`).emit("call_busy", {
          callId: busyCall._id,
          receiverId,
          message: "User is currently busy on another call",
        });
      }

      createCallLogMessage(busyCall);

      return res.status(409).json({
        success: false,
        message: "User is currently busy on another call",
        call: busyCall,
      });
    }

    // Generate channel name and Call document
    const channelName = `cw_call_${Date.now()}_${callerId.toString().slice(-6)}`;
    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      type,
      channelName,
      status: "ringing",
      startedAt: new Date(),
    });

    // Generate Agora RTC Token for caller
    const callerUid = getNumericUid(callerId);
    const agora = generateRtcToken({
      channelName,
      uid: callerUid,
      role: "publisher",
      expireTime: 3600,
    });

    // Emit incoming_call event to receiver via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user_${receiverId}`).emit("incoming_call", {
        callId: call._id,
        caller: {
          _id: caller._id,
          name: caller.name,
          username: caller.username,
          profileImage: caller.profileImage,
        },
        type,
        channelName,
        createdAt: call.createdAt,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Call initiated",
      call,
      agora,
    });
  } catch (error) {
    console.error("Start Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start call",
      error: error.message,
    });
  }
};

// =========================================================
// 2. ACCEPT CALL (POST /api/calls/:callId/accept)
// =========================================================
exports.acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId).populate(
      "caller receiver",
      "_id name username profileImage"
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (call.receiver._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the call receiver can accept this call",
      });
    }

    if (["ended", "rejected", "cancelled", "busy", "missed"].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: `Call cannot be accepted because it is already ${call.status}`,
      });
    }

    call.status = "accepted";
    call.answeredAt = new Date();
    await call.save();

    // Generate Agora RTC Token for receiver
    const receiverUid = getNumericUid(userId);
    const agora = generateRtcToken({
      channelName: call.channelName,
      uid: receiverUid,
      role: "publisher",
      expireTime: 3600,
    });

    const io = getIO();
    if (io) {
      io.to(`user_${call.caller._id}`).emit("call_accepted", {
        callId: call._id,
        receiverId: userId,
        answeredAt: call.answeredAt,
        channelName: call.channelName,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call accepted",
      call,
      agora,
    });
  } catch (error) {
    console.error("Accept Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept call",
    });
  }
};

// =========================================================
// 3. REJECT CALL (POST /api/calls/:callId/reject)
// =========================================================
exports.rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (call.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the receiver can reject this call",
      });
    }

    call.status = "rejected";
    call.endedAt = new Date();
    await call.save();

    createCallLogMessage(call);

    const io = getIO();
    if (io) {
      io.to(`user_${call.caller}`).emit("call_rejected", {
        callId: call._id,
        receiverId: userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call rejected",
      call,
    });
  } catch (error) {
    console.error("Reject Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject call",
    });
  }
};

// =========================================================
// 4. BUSY CALL (POST /api/calls/:callId/busy)
// =========================================================
exports.busyCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    call.status = "busy";
    call.endedAt = new Date();
    await call.save();

    createCallLogMessage(call);

    const io = getIO();
    if (io) {
      io.to(`user_${call.caller}`).emit("call_busy", {
        callId: call._id,
        receiverId: userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call marked as busy",
      call,
    });
  } catch (error) {
    console.error("Busy Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark call as busy",
    });
  }
};

// =========================================================
// 5. CANCEL CALL (POST /api/calls/:callId/cancel)
// =========================================================
exports.cancelCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    if (call.caller.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the caller can cancel this call",
      });
    }

    call.status = "cancelled";
    call.endedAt = new Date();
    await call.save();

    createCallLogMessage(call);

    const io = getIO();
    if (io) {
      io.to(`user_${call.receiver}`).emit("call_cancelled", {
        callId: call._id,
        callerId: userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call cancelled",
      call,
    });
  } catch (error) {
    console.error("Cancel Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel call",
    });
  }
};

// =========================================================
// 6. MISSED CALL (POST /api/calls/:callId/missed)
// =========================================================
exports.missedCall = async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    call.status = "missed";
    call.endedAt = new Date();
    await call.save();

    createCallLogMessage(call);

    const io = getIO();
    if (io) {
      io.to(`user_${call.receiver}`).emit("call_missed", {
        callId: call._id,
        callerId: call.caller,
      });
      io.to(`user_${call.caller}`).emit("call_missed", {
        callId: call._id,
        receiverId: call.receiver,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call marked as missed",
      call,
    });
  } catch (error) {
    console.error("Missed Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark call as missed",
    });
  }
};

// =========================================================
// 7. END CALL (POST /api/calls/:callId/end)
// =========================================================
exports.endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const isCaller = call.caller.toString() === userId.toString();
    const isReceiver = call.receiver.toString() === userId.toString();

    if (!isCaller && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this call",
      });
    }

    const endedAt = new Date();
    let duration = 0;
    if (call.answeredAt) {
      duration = Math.max(0, Math.round((endedAt - new Date(call.answeredAt)) / 1000));
    }

    call.status = "ended";
    call.endedAt = endedAt;
    call.duration = duration;
    await call.save();

    createCallLogMessage(call);

    const targetUserId = isCaller ? call.receiver : call.caller;
    const io = getIO();
    if (io) {
      io.to(`user_${targetUserId}`).emit("call_ended", {
        callId: call._id,
        endedBy: userId,
        duration,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call ended successfully",
      call,
    });
  } catch (error) {
    console.error("End Call Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to end call",
    });
  }
};

// =========================================================
// 8. GET AGORA TOKEN FOR CALL (POST /api/calls/:callId/token)
// =========================================================
exports.getCallToken = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const isParticipant =
      call.caller.toString() === userId.toString() ||
      call.receiver.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized call token request",
      });
    }

    const numericUid = getNumericUid(userId);
    const agora = generateRtcToken({
      channelName: call.channelName,
      uid: numericUid,
      role: "publisher",
      expireTime: 3600,
    });

    return res.status(200).json({
      success: true,
      agora,
    });
  } catch (error) {
    console.error("Get Call Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate call token",
    });
  }
};

// =========================================================
// 9. GET CALL HISTORY (GET /api/calls/history)
// =========================================================
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ caller: userId }, { receiver: userId }],
    };

    const totalCount = await Call.countDocuments(query);
    const calls = await Call.find(query)
      .populate("caller", "_id name username profileImage")
      .populate("receiver", "_id name username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      calls,
    });
  } catch (error) {
    console.error("Get Call History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
    });
  }
};

// =========================================================
// 10. GET CALL BY ID (GET /api/calls/:callId)
// =========================================================
exports.getCallById = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId)
      .populate("caller", "_id name username profileImage")
      .populate("receiver", "_id name username profileImage");

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const isParticipant =
      call.caller._id.toString() === userId.toString() ||
      call.receiver._id.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized call access",
      });
    }

    return res.status(200).json({
      success: true,
      call,
    });
  } catch (error) {
    console.error("Get Call By Id Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call details",
    });
  }
};
