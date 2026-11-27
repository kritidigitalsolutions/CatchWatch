const mongoose = require("mongoose");

const liveShowSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    streamUrl: {
      type: String,
      required: [true, "Stream URL is required"],
      trim: true,
    },
    backupStreamUrl: {
      type: String,
      trim: true,
      default: "",
    },
    streamType: {
      type: String,
      enum: ["hls", "youtube", "mp4", "embed", "auto"],
      default: "auto",
    },
    resolvedStreamType: {
      type: String,
      enum: ["hls", "youtube", "mp4", "embed"],
      default: "hls",
    },
    youtubeVideoId: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    banner: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "Live Show",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["LIVE", "UPCOMING", "ENDED"],
      default: "LIVE",
      index: true,
    },
    isLive: {
      type: Boolean,
      default: true,
      index: true,
    },
    scheduledStartTime: {
      type: Date,
      default: Date.now,
    },
    scheduledEndTime: {
      type: Date,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    viewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to determine stream type & extract YouTube ID
liveShowSchema.methods.resolveStreamDetails = function () {
  const url = (this.streamUrl || "").trim();
  let detectedType = this.streamType;

  // Extract YouTube ID if any
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    this.youtubeVideoId = ytMatch[1];
    if (detectedType === "auto" || !detectedType) {
      detectedType = "youtube";
    }
  }

  if (detectedType === "auto" || !detectedType) {
    if (url.includes(".m3u8")) {
      detectedType = "hls";
    } else if (url.includes(".mp4") || url.includes(".webm") || url.includes(".mkv")) {
      detectedType = "mp4";
    } else if (url.includes("/embed/") || url.includes("iframe")) {
      detectedType = "embed";
    } else {
      detectedType = "hls";
    }
  }

  this.resolvedStreamType = detectedType;
  this.isLive = this.status === "LIVE";
};

liveShowSchema.pre("save", function () {
  this.resolveStreamDetails();
});

module.exports = mongoose.model("LiveShow", liveShowSchema);
