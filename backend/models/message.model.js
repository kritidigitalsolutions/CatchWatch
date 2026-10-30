const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "gif", "call", "reel"],
      default: "text",
    },
    text: {
      type: String,
      default: "",
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    iv: {
      type: String,
      default: "",
    },
    encryption: {
      version: {
        type: Number,
        default: 1,
      },
      senderDeviceId: {
        type: String,
        default: "",
      },
      senderKeyId: {
        type: String,
        default: "",
      },
      senderPublicKey: {
        type: String,
        default: "",
      },
      recipientDeviceId: {
        type: String,
        default: "",
      },
      recipientKeyId: {
        type: String,
        default: "",
      },
      recipientPublicKey: {
        type: String,
        default: "",
      },
      envelopes: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          deviceId: { type: String, default: "" },
          keyId: { type: String, default: "" },
          senderDeviceId: { type: String, default: "" },
          senderKeyId: { type: String, default: "" },
          senderPublicKey: { type: String, default: "" },
          ciphertext: { type: String, default: "" },
          iv: { type: String, default: "" },
        },
      ],
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    reactions: [reactionSchema],
    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "READ"],
      default: "SENT",
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isUnsent: {
      type: Boolean,
      default: false,
    },
    unsentAt: {
      type: Date,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports =
  mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
