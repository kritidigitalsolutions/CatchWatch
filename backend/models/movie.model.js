const mongoose = require("mongoose");

// Cast Schema
const castSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  image: {
    type: String,
    default: ""
  }
});

// Main Schema
const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    genre: [{
  type: String,
  trim: true
}],

    releaseYear: Number,

    duration: String,

    language: String,

    audioTracks: [
      {
        language: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ],

    subtitles: [
      {
        language: { type: String, trim: true },
        label: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ],

    audioTracks: [
      {
        language: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ],

    subtitles: [
      {
        language: { type: String, trim: true },
        label: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ],

    poster: String,

    banner: String,

    isComingSoon: {
      type: Boolean,
      default: false
    },

    releaseDate: {
      type: Date
    },

    // Higher priority appears first
    priority: {
      type: Number,
      default: 0
    },

    videoUrl: String,

    trailerUrl: String,

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

    isPremium: {
      type: Boolean,
      default: false
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },

    cast: [castSchema],

    category: [
      {
        type: String,
        enum: [
          "trending",
          "top10",
          "recommended"
        ]
      }
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

// Auto-generate slug only once
movieSchema.pre("save", function () {

  if (!this.slug && this.title) {

    this.slug =
      this.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
});

// Indexes
movieSchema.index({
  priority: -1,
  createdAt: -1
});

movieSchema.index(
  {
    title: "text",
    description: "text"
  },
  {
    language_override: "dummy"
  }
);

module.exports = mongoose.model(
  "Movie",
  movieSchema
);