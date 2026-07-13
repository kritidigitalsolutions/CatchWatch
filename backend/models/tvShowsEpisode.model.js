const mongoose = require("mongoose");

const tvShowsEpisodeSchema =
  new mongoose.Schema(
    {
      tvShowId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "TvShow",

        required: true,
      },

      episodeNumber: {
        type: Number,
        required: true,
      },

      title: String,

      description: String,

      videoUrl: String,

      thumbnail: String,

      duration: String,

      videoSource: {
        type: String,
        default: "bunny_storage",
      },

      storageType: {
        type: String,
        default: "bunny_storage",
      },

      videoId: {
        type: String,
        default: "",
      },

      streamUrl: {
        type: String,
        default: "",
      },

      playlistUrl: {
        type: String,
        default: "",
      },

      playbackUrl: {
        type: String,
        default: "",
      },

      thumbnailUrl: {
        type: String,
        default: "",
      },

      encodingStatus: {
        type: String,
        default: "",
      },

      isLocked: {
        type: Boolean,
        default: false,
      },

      isVertical: {
        type: Boolean,
        default: true,
      },

      views: {
        type: Number,
        default: 0,
      },

      likes: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "TvShowsEpisode",
  tvShowsEpisodeSchema
);
