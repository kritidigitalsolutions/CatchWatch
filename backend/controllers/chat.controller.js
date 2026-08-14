const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const UserBlock = require("../models/userBlock.model");
const User = require("../models/user.model");
const { sendPushNotification } = require("../utils/fcm.service");
const { getIO, getUserSockets } = require("../socket/chatSocket");
const { generateChatToken, registerAgoraChatUser } = require("../services/agora.service");
const crypto = require("crypto");

const populateMessage = (query) =>
  query
    .populate("sender", "name username profileImage publicKey activeSession deviceKeys")
    .populate("recipient", "name username profileImage publicKey activeSession deviceKeys");

const getActiveDeviceKeys = (user) => {
  const userId = (user?._id || user?.id)?.toString() || "";
  const activeSession = user?.activeSession;
  const keys = [];

  if (activeSession && activeSession.publicKey && activeSession.status !== "REVOKED") {
    keys.push({
      userId,
      sessionId: activeSession.sessionId || "",
      deviceId: activeSession.deviceId || "active_device",
      keyId: activeSession.keyId || "active_key",
      publicKey: activeSession.publicKey,
      isActive: true,
      createdAt: activeSession.lastActive,
      lastSeenAt: activeSession.lastActive,
    });
    return keys;
  }

  if (user?.publicKey) {
    keys.push({
      userId,
      sessionId: "",
      deviceId: "legacy",
      keyId: "legacy",
      publicKey: user.publicKey,
      isActive: true,
      legacy: true,
    });
  }

  return keys;
};

const safeE2eeDiagnostic = (code, details = {}) => {
  console.warn(`[E2EE:${code}]`, {
    messageId: details.messageId,
    senderId: details.senderId,
    recipientId: details.recipientId,
    currentDeviceId: details.currentDeviceId,
    currentKeyId: details.currentKeyId,
    recipientDeviceCount: details.recipientDeviceCount,
    envelopeCount: details.envelopeCount,
    senderDeviceId: details.senderDeviceId,
    recipientDeviceId: details.recipientDeviceId,
    senderKeyId: details.senderKeyId,
    recipientKeyId: details.recipientKeyId,
  });
};

const normalizeEncryptionMetadata = (encryption = {}) => {
  const envelopes = Array.isArray(encryption.envelopes)
    ? encryption.envelopes.map((envelope) => ({
      userId: envelope.userId ? envelope.userId.toString() : "",
      deviceId: envelope.deviceId || "",
      keyId: envelope.keyId || "",
      senderDeviceId: envelope.senderDeviceId || encryption.senderDeviceId || "",
      senderKeyId: envelope.senderKeyId || encryption.senderKeyId || "",
      senderPublicKey: envelope.senderPublicKey || encryption.senderPublicKey || "",
      ciphertext: envelope.ciphertext || "",
      iv: envelope.iv || "",
    })).filter((envelope) =>
      envelope.userId &&
      envelope.deviceId &&
      envelope.keyId &&
      envelope.senderDeviceId &&
      envelope.senderKeyId &&
      envelope.senderPublicKey &&
      envelope.ciphertext &&
      envelope.iv
    )
    : [];

  return {
    version: Number(encryption.version) || 2,
    senderDeviceId: encryption.senderDeviceId || "",
    senderKeyId: encryption.senderKeyId || "",
    senderPublicKey: encryption.senderPublicKey || "",
    recipientDeviceId: encryption.recipientDeviceId || "",
    recipientKeyId: encryption.recipientKeyId || "",
    envelopes,
  };
};

const validateEncryptedMessagePayload = (encryption, text, iv, targetRecipientId = null) => {
  const normalized = normalizeEncryptionMetadata(encryption);

  const hasSenderPublic = Boolean(normalized.senderPublicKey && normalized.senderPublicKey.trim());
  const hasText = Boolean(text && typeof text === "string" && text.trim());
  const hasIv = Boolean(iv && typeof iv === "string" && iv.trim());

  const valid = hasText && hasIv && hasSenderPublic;

  return {
    valid,
    normalized,
  };
};

// Helper to check if two users have blocked each other
const isBlockedPair = async (userId1, userId2) => {
  const block = await UserBlock.findOne({
    $or: [
      { blocker: userId1, blocked: userId2 },
      { blocker: userId2, blocked: userId1 },
    ],
  });
  return !!block;
};

// 1. Get All Conversations for current user
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Fetch all block records involving the current user
    const userBlocks = await UserBlock.find({
      $or: [{ blocker: currentUserId }, { blocked: currentUserId }],
    });

    const blockedByUser = new Set();
    const blockedMeUser = new Set();

    userBlocks.forEach((b) => {
      if (b.blocker.toString() === currentUserId.toString()) {
        blockedByUser.add(b.blocked.toString());
      } else {
        blockedMeUser.add(b.blocker.toString());
      }
    });

    const conversations = await Conversation.find({
      participants: currentUserId,
      deletedBy: { $ne: currentUserId },
    })
      .populate({
        path: "participants",
        select: "name username profileImage isOnline lastSeen phone bio role verification publicKey deviceKeys",
      })
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "name username profileImage",
        },
      })
      .sort({ lastMessageAt: -1 });

    const formattedConversations = conversations.map((conv) => {
      const convObj = conv.toObject();
      const otherParticipant = convObj.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );

      const partnerId = otherParticipant ? otherParticipant._id.toString() : null;
      const isBlockedByMe = partnerId ? blockedByUser.has(partnerId) : false;
      const isBlockedByPartner = partnerId ? blockedMeUser.has(partnerId) : false;
      const isBlocked = isBlockedByMe || isBlockedByPartner;

      const unread = convObj.unreadCount ? convObj.unreadCount[currentUserId.toString()] || 0 : 0;
      const isPinned = Array.isArray(convObj.pinnedBy) && convObj.pinnedBy.some(id => id.toString() === currentUserId.toString());

      return {
        _id: convObj._id,
        partner: otherParticipant || null,
        lastMessage: convObj.lastMessage,
        lastMessageAt: convObj.lastMessageAt,
        unreadCount: unread,
        isPinned: isPinned,
        isBlockedByMe,
        isBlockedByPartner,
        isBlocked,
        createdAt: convObj.createdAt,
        updatedAt: convObj.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

// 2. Start or Get Existing Conversation
exports.startConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: "recipientId is required" });
    }

    if (currentUserId.toString() === recipientId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot chat with yourself" });
    }

    const recipient = await User.findById(recipientId).select("name username profileImage isOnline lastSeen phone bio publicKey deviceKeys");
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const myBlock = await UserBlock.findOne({ blocker: currentUserId, blocked: recipientId });
    const partnerBlock = await UserBlock.findOne({ blocker: recipientId, blocked: currentUserId });
    const isBlockedByMe = !!myBlock;
    const isBlockedByPartner = !!partnerBlock;
    const isBlocked = isBlockedByMe || isBlockedByPartner;

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId] },
    }).populate({
      path: "participants",
      select: "name username profileImage isOnline lastSeen phone bio role verification publicKey deviceKeys",
    }).populate("lastMessage");

    if (conversation) {
      // If user previously deleted conversation, remove from deletedBy
      if (conversation.deletedBy && conversation.deletedBy.includes(currentUserId)) {
        conversation.deletedBy = conversation.deletedBy.filter(
          (id) => id.toString() !== currentUserId.toString()
        );
        await conversation.save();
      }
    } else {
      conversation = await Conversation.create({
        participants: [currentUserId, recipientId],
        unreadCount: {
          [currentUserId.toString()]: 0,
          [recipientId.toString()]: 0,
        },
      });

      conversation = await Conversation.findById(conversation._id).populate({
        path: "participants",
        select: "name username profileImage isOnline lastSeen phone bio role verification publicKey deviceKeys",
      });
    }

    const convObj = conversation.toObject();
    const partner = convObj.participants.find(
      (p) => p._id.toString() !== currentUserId.toString()
    );

    return res.status(200).json({
      success: true,
      data: {
        _id: convObj._id,
        partner: partner || null,
        lastMessage: convObj.lastMessage,
        lastMessageAt: convObj.lastMessageAt,
        unreadCount: convObj.unreadCount ? convObj.unreadCount[currentUserId.toString()] || 0 : 0,
        isPinned: Array.isArray(convObj.pinnedBy) && convObj.pinnedBy.some(id => id.toString() === currentUserId.toString()),
        isBlockedByMe,
        isBlockedByPartner,
        isBlocked,
        createdAt: convObj.createdAt,
      },
    });
  } catch (error) {
    console.error("Start Conversation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start conversation",
      error: error.message,
    });
  }
};

// 3. Get Paginated Messages for a Conversation
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: currentUserId },
    })
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .populate("pinnedBy", "name username")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name username" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: currentUserId },
    });

    // Mark recipient unread messages as READ if fetched
    await Message.updateMany(
      {
        conversationId,
        recipient: currentUserId,
        status: { $ne: "READ" },
      },
      {
        $set: { status: "READ", readAt: new Date() },
      }
    );

    // Reset unread count for current user
    if (conversation.unreadCount && conversation.unreadCount.get(currentUserId.toString()) > 0) {
      conversation.unreadCount.set(currentUserId.toString(), 0);
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// 4. Send Message (Text, GIF, Reply, Forward)
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const {
      conversationId,
      recipientId,
      text,
      messageType = "text",
      mediaUrl,
      mediaMeta,
      replyTo,
      isForwarded = false,
      isEncrypted = false,
      iv = "",
      encryption = {},
    } = req.body;

    let targetConvId = conversationId;
    let targetRecipientId = recipientId;

    if (targetConvId) {
      const conv = await Conversation.findOne({
        _id: targetConvId,
        participants: senderId,
      });
      if (!conv) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }
      targetRecipientId = conv.participants.find((p) => p.toString() !== senderId.toString());
    } else if (targetRecipientId) {
      let conv = await Conversation.findOne({
        participants: { $all: [senderId, targetRecipientId] },
      });
      if (!conv) {
        conv = await Conversation.create({
          participants: [senderId, targetRecipientId],
        });
      }
      targetConvId = conv._id;
    } else {
      return res.status(400).json({ success: false, message: "conversationId or recipientId is required" });
    }

    // Check if blocked
    const blocked = await isBlockedPair(senderId, targetRecipientId);
    if (blocked) {
      return res.status(403).json({ success: false, message: "Cannot send message to blocked user" });
    }

    // Determine E2EE Encryption payload with strict validation
    let finalIsEncrypted = false;
    let finalIv = "";
    let finalEncryption = undefined;

    if (isEncrypted || (encryption && Object.keys(encryption).length > 0)) {
      const validation = validateEncryptedMessagePayload(encryption, text, iv, targetRecipientId);
      if (!validation.valid) {
        safeE2eeDiagnostic("INVALID_ENCRYPTED_PAYLOAD", {
          senderId,
          recipientId: targetRecipientId,
          senderDeviceId: encryption?.senderDeviceId,
          senderKeyId: encryption?.senderKeyId,
          recipientDeviceId: encryption?.recipientDeviceId,
          recipientKeyId: encryption?.recipientKeyId,
          envelopeCount: Array.isArray(encryption?.envelopes) ? encryption.envelopes.length : 0,
        });
        return res.status(400).json({
          success: false,
          message:
            "Invalid E2EE payload: Encrypted messages must include valid ciphertext, IV, and sender public key.",
        });
      }

      finalIsEncrypted = true;
      finalIv = iv.trim();
      finalEncryption = validation.normalized;

      safeE2eeDiagnostic("MESSAGE_ENCRYPTED_VALIDATED", {
        senderId,
        recipientId: targetRecipientId,
        senderDeviceId: finalEncryption.senderDeviceId,
        senderKeyId: finalEncryption.senderKeyId,
        recipientDeviceId: finalEncryption.recipientDeviceId,
        recipientKeyId: finalEncryption.recipientKeyId,
        envelopeCount: finalEncryption.envelopes.length,
      });
    }

    // Determine initial status based on recipient socket connection
    const io = getIO();
    const recipientSockets = getUserSockets(targetRecipientId.toString());
    const isRecipientConnected = recipientSockets && recipientSockets.size > 0;
    const initialStatus = isRecipientConnected ? "DELIVERED" : "SENT";

    const newMessage = await Message.create({
      conversationId: targetConvId,
      sender: senderId,
      recipient: targetRecipientId,
      messageType,
      text: text || "",
      isEncrypted: finalIsEncrypted,
      iv: finalIv,
      encryption: finalEncryption,
      mediaUrl: mediaUrl || "",
      mediaMeta: mediaMeta || {},
      replyTo: replyTo || null,
      isForwarded: !!isForwarded,
      status: initialStatus,
      deliveredAt: isRecipientConnected ? new Date() : null,
    });

    const populatedMessage = await populateMessage(Message.findById(newMessage._id))
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name username" },
      });

    // Update conversation lastMessage & increment recipient unreadCount
    const conv = await Conversation.findById(targetConvId);
    if (conv) {
      conv.lastMessage = newMessage._id;
      conv.lastMessageAt = new Date();
      // Remove from deletedBy for both participants
      conv.deletedBy = [];
      
      const currentUnread = (conv.unreadCount && conv.unreadCount.get(targetRecipientId.toString())) || 0;
      if (!conv.unreadCount) conv.unreadCount = new Map();
      conv.unreadCount.set(targetRecipientId.toString(), currentUnread + 1);
      await conv.save();
    }

    // Emit Socket event to recipient and sender
    if (io) {
      io.to(`user_${targetRecipientId}`).emit("new_message", populatedMessage);
      io.to(`user_${senderId}`).emit("message_sent", populatedMessage);
    }

    // Send FCM Push Notification if recipient is offline/not connected
    if (!isRecipientConnected) {
      const recipientUser = await User.findById(targetRecipientId).select("fcmToken name");
      const senderUser = await User.findById(senderId).select("name username");
      if (recipientUser && recipientUser.fcmToken) {
        let notificationBody = finalIsEncrypted ? "🔒 End-to-End Encrypted Message" : (text || "Sent a media message");
        if (!finalIsEncrypted) {
          if (messageType === "image") notificationBody = "📷 Sent an image";
          if (messageType === "video") notificationBody = "🎥 Sent a video";
          if (messageType === "audio") notificationBody = "🎵 Sent a voice message";
          if (messageType === "gif") notificationBody = "🖼️ Sent a GIF";
        }

        sendPushNotification({
          token: recipientUser.fcmToken,
          title: senderUser ? senderUser.name || senderUser.username : "New Message",
          body: notificationBody,
          data: {
            type: "CHAT_MESSAGE",
            conversationId: targetConvId.toString(),
            senderId: senderId.toString(),
            messageId: newMessage._id.toString(),
          },
        }).catch((err) => console.error("Push notification error:", err));
      }
    }

    return res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// 4b. Append missing E2EE device envelopes without storing plaintext
exports.appendEncryptionEnvelopes = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;
    const { envelopes = [] } = req.body;

    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      return res.status(400).json({ success: false, message: "envelopes are required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isParticipant =
      message.sender.toString() === currentUserId.toString() ||
      message.recipient.toString() === currentUserId.toString();
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Unauthorized to update message envelopes" });
    }

    if (!message.encryption) {
      message.encryption = { version: 2, envelopes: [] };
    }
    if (!Array.isArray(message.encryption.envelopes)) {
      message.encryption.envelopes = [];
    }

    let appended = 0;
    envelopes.forEach((envelope) => {
      if (!envelope?.userId || !envelope?.deviceId || !envelope?.keyId || !envelope?.ciphertext || !envelope?.iv) {
        return;
      }

      const exists = message.encryption.envelopes.some((existing) =>
        existing.userId?.toString() === envelope.userId.toString() &&
        existing.deviceId === envelope.deviceId &&
        existing.keyId === envelope.keyId
      );
      if (exists) return;

      message.encryption.envelopes.push({
        userId: envelope.userId,
        deviceId: envelope.deviceId,
        keyId: envelope.keyId,
        senderDeviceId: envelope.senderDeviceId || message.encryption.senderDeviceId || "",
        senderKeyId: envelope.senderKeyId || message.encryption.senderKeyId || "",
        senderPublicKey: envelope.senderPublicKey || message.encryption.senderPublicKey || "",
        ciphertext: envelope.ciphertext,
        iv: envelope.iv,
      });
      appended += 1;
    });

    if (appended > 0) {
      message.encryption.version = Math.max(message.encryption.version || 1, 2);
      await message.save();

      safeE2eeDiagnostic("ENVELOPES_APPENDED", {
        messageId: message._id,
        currentDeviceId: envelopes[0]?.deviceId,
        currentKeyId: envelopes[0]?.keyId,
        envelopeCount: message.encryption.envelopes.length,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        messageId: message._id,
        appended,
      },
    });
  } catch (error) {
    console.error("Append Encryption Envelopes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to append encryption envelopes",
      error: error.message,
    });
  }
};

// 5. Edit Text Message
exports.editMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text is required to edit message" });
    }

    const message = await Message.findOne({ _id: messageId, sender: currentUserId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found or unauthorized" });
    }

    if (message.isUnsent) {
      return res.status(400).json({ success: false, message: "Cannot edit unsent message" });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({ success: false, message: "Only text messages can be edited" });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name username" },
      });

    // Notify sockets
    const io = getIO();
    if (io) {
      io.to(`user_${message.recipient}`).emit("message_edited", updatedMessage);
      io.to(`user_${currentUserId}`).emit("message_edited", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Edit Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit message",
      error: error.message,
    });
  }
};

// 6. Unsend Message (for everyone)
exports.unsendMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, sender: currentUserId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found or unauthorized" });
    }

    message.isUnsent = true;
    message.text = "This message was unsent";
    message.mediaUrl = "";
    message.mediaMeta = {};
    message.unsentAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys");

    // Notify sockets
    const io = getIO();
    if (io) {
      io.to(`user_${message.recipient}`).emit("message_unsent", updatedMessage);
      io.to(`user_${currentUserId}`).emit("message_unsent", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Unsend Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unsend message",
      error: error.message,
    });
  }
};

// // 7. Delete Message for Me
exports.deleteMessageForMe = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted for you",
      messageId: message._id,
    });
  } catch (error) {
    console.error("Delete Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

// // 8. Toggle Reaction on Message
exports.toggleReaction = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUserId.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Remove reaction if identical
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingIndex].emoji = emoji;
        message.reactions[existingIndex].createdAt = new Date();
      }
    } else {
      // Add reaction
      message.reactions.push({
        user: currentUserId,
        emoji,
        createdAt: new Date(),
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .populate("reactions.user", "name username");

    // Notify sockets
    const io = getIO();
    if (io) {
      io.to(`user_${message.recipient}`).emit("message_reaction", updatedMessage);
      io.to(`user_${message.sender}`).emit("message_reaction", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Toggle Reaction Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update reaction",
      error: error.message,
    });
  }
};

// // 9. Mark Messages in Conversation as Read
exports.markAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const now = new Date();
    await Message.updateMany(
      {
        conversationId,
        recipient: currentUserId,
        status: { $ne: "READ" },
      },
      {
        $set: { status: "READ", readAt: now },
      }
    );

    if (conversation.unreadCount) {
      conversation.unreadCount.set(currentUserId.toString(), 0);
      await conversation.save();
    }

    // Get sender id
    const senderId = conversation.participants.find(
      (p) => p.toString() !== currentUserId.toString()
    );

    // Notify socket
    const io = getIO();
    if (io && senderId) {
      io.to(`user_${senderId}`).emit("messages_read", {
        conversationId,
        readBy: currentUserId,
        readAt: now,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      readAt: now,
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

// // 10. Pin / Unpin Conversation
exports.pinConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isPinned = conversation.pinnedBy.some((id) => id.toString() === currentUserId.toString());
    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(
        (id) => id.toString() !== currentUserId.toString()
      );
    } else {
      conversation.pinnedBy.push(currentUserId);
    }

    await conversation.save();

    return res.status(200).json({
      success: true,
      isPinned: !isPinned,
      message: !isPinned ? "Conversation pinned" : "Conversation unpinned",
    });
  } catch (error) {
    console.error("Pin Conversation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update pin status",
      error: error.message,
    });
  }
};

// // 11. Clear / Delete Conversation History for Me
exports.clearConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (!conversation.deletedBy.includes(currentUserId)) {
      conversation.deletedBy.push(currentUserId);
    }
    await conversation.save();

    // Mark all existing messages as deleted for this user
    await Message.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: currentUserId } }
    );

    return res.status(200).json({
      success: true,
      message: "Conversation cleared for you",
    });
  } catch (error) {
    console.error("Clear Conversation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear conversation",
      error: error.message,
    });
  }
};

// // 12. Search Messages
exports.searchMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { q, conversationId } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: "Query string q is required" });
    }

    const filter = {
      text: { $regex: q.trim(), $options: "i" },
      deletedFor: { $ne: currentUserId },
      isUnsent: false,
    };

    if (conversationId) {
      filter.conversationId = conversationId;
    } else {
      // Limit search to user's conversations
      const userConvs = await Conversation.find({ participants: currentUserId }).select("_id");
      const convIds = userConvs.map((c) => c._id);
      filter.conversationId = { $in: convIds };
    }

    const messages = await Message.find(filter)
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Search Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search messages",
      error: error.message,
    });
  }
};

// // 13. Block User
exports.blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    if (blockerId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot block yourself" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await UserBlock.findOneAndUpdate(
      { blocker: blockerId, blocked: userId },
      { blocker: blockerId, blocked: userId },
      { upsert: true, new: true }
    );

    // Notify users via socket
    try {
      const io = getIO();
      if (io) {
        const targetSockets = getUserSockets(userId) || [];
        const blockerSockets = getUserSockets(blockerId) || [];
        [...targetSockets, ...blockerSockets].forEach((sId) => {
          io.to(sId).emit("user_blocked", { blockerId, blockedId: userId });
        });
      }
    } catch (e) {
      console.error("Socket emit block error:", e);
    }

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    console.error("Block User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to block user",
      error: error.message,
    });
  }
};

// // 14. Unblock User
exports.unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    await UserBlock.findOneAndDelete({ blocker: blockerId, blocked: userId });

    // Notify users via socket
    try {
      const io = getIO();
      if (io) {
        const targetSockets = getUserSockets(userId) || [];
        const blockerSockets = getUserSockets(blockerId) || [];
        [...targetSockets, ...blockerSockets].forEach((sId) => {
          io.to(sId).emit("user_unblocked", { unblockerId: blockerId, unblockedId: userId });
        });
      }
    } catch (e) {
      console.error("Socket emit unblock error:", e);
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error) {
    console.error("Unblock User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unblock user",
      error: error.message,
    });
  }
};

// // 15. Get Blocked Users List
exports.getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blocks = await UserBlock.find({ blocker: blockerId }).populate(
      "blocked",
      "name username profileImage bio phone"
    );

    return res.status(200).json({
      success: true,
      data: blocks.map((b) => b.blocked),
    });
  } catch (error) {
    console.error("Get Blocked Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blocked users",
      error: error.message,
    });
  }
};

// // 16. Search Users to Start New Chat
exports.searchChatUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ name: regex }, { username: regex }, { phone: regex }],
    })
      .select("name username profileImage bio isOnline lastSeen role verification")
      .limit(20);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Search Chat Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: error.message,
    });
  }
};

// // 17. Get User Online Status and Last Seen
exports.getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("isOnline lastSeen name username profileImage");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        isOnline: !!user.isOnline,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error("Get User Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user status",
      error: error.message,
    });
  }
};

// // 18. Register FCM Token for Push Notifications
exports.updateFcmToken = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "fcmToken is required" });
    }

    await User.findByIdAndUpdate(currentUserId, {
      fcmToken,
      fcmTokenUpdatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
    });
  } catch (error) {
    console.error("Update FCM Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FCM token",
      error: error.message,
    });
  }
};

// // 19. Upload Media File for Chat (Image, Video, Audio)
exports.uploadChatMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const file = req.file;
    const mediaUrl = file.cdnUrl || file.path || `/uploads/${file.filename}`;
    
    let messageType = "image";
    if (file.mimetype) {
      if (file.mimetype.startsWith("video/")) messageType = "video";
      else if (file.mimetype.startsWith("audio/")) messageType = "audio";
      else if (file.mimetype === "image/gif") messageType = "gif";
    }

    return res.status(200).json({
      success: true,
      data: {
        mediaUrl,
        messageType,
        mediaMeta: {
          fileName: file.originalname || file.filename,
          fileSize: file.size || 0,
          mimeType: file.mimetype,
        },
      },
    });
  } catch (error) {
    console.error("Upload Chat Media Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload media file",
      error: error.message,
    });
  }
};

// 18. Register Account E2EE Identity and Zero-Knowledge Encrypted Backup
exports.setE2EEIdentity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey, keyId, encryptedPrivateKeyBackup, deviceId } = req.body;

    if (!publicKey || typeof publicKey !== "string" || !publicKey.trim()) {
      return res.status(400).json({ success: false, message: "Valid publicKey string is required" });
    }

    // Security check: NEVER allow plaintext private keys on backend
    if (req.body.privateKey || req.body.privateKeyString) {
      return res.status(400).json({
        success: false,
        message: "Plaintext private keys are strictly forbidden. Only zero-knowledge client-encrypted backups are accepted.",
      });
    }

    const user = await User.findById(userId).select("publicKey e2eeIdentity activeSession sessions deviceKeys");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const legacyKeyHash = crypto.createHash("sha256").update(publicKey).digest("hex").slice(0, 32);
    const effectiveKeyId = keyId && typeof keyId === "string" ? keyId.trim() : (user.e2eeIdentity?.keyId || `key_${legacyKeyHash}`);
    const effectiveDeviceId = deviceId && typeof deviceId === "string" ? deviceId.trim() : `dev_${legacyKeyHash}`;

    if (!user.e2eeIdentity) {
      user.e2eeIdentity = {};
    }

    user.e2eeIdentity.publicKey = publicKey.trim();
    user.e2eeIdentity.keyId = effectiveKeyId;
    user.publicKey = publicKey.trim();

    if (
      encryptedPrivateKeyBackup &&
      typeof encryptedPrivateKeyBackup === "object" &&
      encryptedPrivateKeyBackup.ciphertext &&
      encryptedPrivateKeyBackup.iv &&
      encryptedPrivateKeyBackup.salt
    ) {
      user.e2eeIdentity.encryptedPrivateKeyBackup = {
        ciphertext: String(encryptedPrivateKeyBackup.ciphertext),
        iv: String(encryptedPrivateKeyBackup.iv),
        salt: String(encryptedPrivateKeyBackup.salt),
        iterations: Number(encryptedPrivateKeyBackup.iterations) || 100000,
        version: Number(encryptedPrivateKeyBackup.version) || 1,
      };
      user.e2eeIdentity.hasBackup = true;
      user.e2eeIdentity.backupUpdatedAt = new Date();
    }

    // Also sync active web session
    const currentSessionId = req.user?.sessionId || user.sessions?.web?.sessionId || user.activeSession?.sessionId || `sess_${crypto.randomBytes(16).toString("hex")}`;
    user.activeSession = {
      sessionId: currentSessionId,
      deviceId: effectiveDeviceId,
      keyId: effectiveKeyId,
      publicKey: publicKey.trim(),
      lastActive: new Date(),
      status: "ACTIVE",
    };

    await user.save();

    safeE2eeDiagnostic("SET_E2EE_IDENTITY", {
      senderId: userId,
      currentKeyId: effectiveKeyId,
    });

    return res.status(200).json({
      success: true,
      message: "Account E2EE identity registered successfully",
      data: {
        keyId: effectiveKeyId,
        publicKey: user.e2eeIdentity.publicKey,
        hasBackup: Boolean(user.e2eeIdentity.hasBackup),
        sessionId: currentSessionId,
      },
    });
  } catch (error) {
    console.error("Set E2EE Identity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register E2EE identity",
      error: error.message,
    });
  }
};

// Backward-compatible alias for setPublicKey
exports.setPublicKey = exports.setE2EEIdentity;

// 18b. Get Zero-Knowledge E2EE Backup for Current User
exports.getE2EEBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("publicKey e2eeIdentity");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        keyId: user.e2eeIdentity?.keyId || "",
        publicKey: user.e2eeIdentity?.publicKey || user.publicKey || "",
        hasBackup: Boolean(user.e2eeIdentity?.hasBackup),
        encryptedPrivateKeyBackup: user.e2eeIdentity?.hasBackup
          ? user.e2eeIdentity.encryptedPrivateKeyBackup
          : null,
        backupUpdatedAt: user.e2eeIdentity?.backupUpdatedAt || null,
      },
    });
  } catch (error) {
    console.error("Get E2EE Backup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch E2EE backup",
      error: error.message,
    });
  }
};

// 19. Get User Public E2EE Key Identity
exports.getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("name username publicKey e2eeIdentity activeSession sessions deviceKeys");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const publicKey = user.e2eeIdentity?.publicKey || user.publicKey || "";
    const keyId = user.e2eeIdentity?.keyId || (publicKey ? "key_account" : "");

    safeE2eeDiagnostic("GET_PUBLIC_KEYS", {
      recipientId: user._id,
      recipientKeyId: keyId,
    });

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        publicKey,
        keyId,
        hasBackup: Boolean(user.e2eeIdentity?.hasBackup),
        status: user.sessions?.web?.status || user.activeSession?.status || "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Get Public Key Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public key",
      error: error.message,
    });
  }
};

// 20. Toggle Pin Message
exports.togglePinMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: currentUserId,
    });
    if (!conversation) {
      return res.status(403).json({ success: false, message: "Unauthorized to pin message in this conversation" });
    }

    if (message.isUnsent) {
      return res.status(400).json({ success: false, message: "Cannot pin an unsent message" });
    }

    const nextPinState = !message.isPinned;
    message.isPinned = nextPinState;
    message.pinnedBy = nextPinState ? currentUserId : null;
    message.pinnedAt = nextPinState ? new Date() : null;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .populate("pinnedBy", "name username")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name username" },
      });

    // Notify sockets
    const io = getIO();
    if (io) {
      io.to(`user_${message.recipient}`).emit("message_pinned", updatedMessage);
      io.to(`user_${message.sender}`).emit("message_pinned", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      message: nextPinState ? "Message pinned successfully" : "Message unpinned successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Toggle Pin Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle message pin status",
      error: error.message,
    });
  }
};

// 21. Get Pinned Messages for Conversation
exports.getPinnedMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const pinnedMessages = await Message.find({
      conversationId,
      isPinned: true,
      deletedFor: { $ne: currentUserId },
    })
      .populate("sender", "name username profileImage publicKey deviceKeys")
      .populate("recipient", "name username profileImage publicKey deviceKeys")
      .populate("pinnedBy", "name username")
      .sort({ pinnedAt: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pinnedMessages,
    });
  } catch (error) {
    console.error("Get Pinned Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pinned messages",
      error: error.message,
    });
  }
};

// 22. Get Agora Chat Token for logged in user
exports.getAgoraToken = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const appId = process.env.AGORA_APP_ID;
    const appKey = process.env.AGORA_CHAT_APP_KEY;

    if (!appId || !appKey) {
      return res.status(500).json({
        success: false,
        message: "Agora credentials missing in server config",
      });
    }

    // Automatically register user in Agora Chat if not already registered
    await registerAgoraChatUser(currentUserId);

    const agoraData = generateChatToken(currentUserId);

    return res.status(200).json({
      success: true,
      data: agoraData,
    });
  } catch (error) {
    console.error("Get Agora Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Agora Chat token",
      error: error.message,
    });
  }
};
