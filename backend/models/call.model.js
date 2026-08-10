const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
      default: "audio",
    },
    channelName: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["calling", "ringing", "accepted", "rejected", "busy", "missed", "cancelled", "ended"],
      default: "ringing",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0, // Duration in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active calls faster
callSchema.index({ caller: 1, receiver: 1, status: 1 });

const Call = mongoose.model("Call", callSchema);

module.exports = Call;
