const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    videoSource: {
      type: String,
      default: "bunny_storage"
    },

    storageType: {
      type: String,
      default: "bunny_storage"
    },

    videoId: {
      type: String,
      default: ""
    },

    streamUrl: {
      type: String,
      default: ""
    },

    playlistUrl: {
      type: String,
      default: ""
    },

    playbackUrl: {
      type: String,
      default: ""
    },

    thumbnailUrl: {
      type: String,
      default: ""
    },

    encodingStatus: {
      type: String,
      default: ""
    },

    thumbnail: {
      type: String,
      default: "",
    },

    caption: {
      type: String,
      maxlength: 500,
      trim: true,
      default: "",
    },

    hashtags: [
      {
        type: String,
        trim: true,
      },
    ],

    viewsCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "DELETED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Reel ||
  mongoose.model("Reel", reelSchema);