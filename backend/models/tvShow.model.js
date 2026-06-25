const mongoose = require("mongoose");
const TvShowsEpisode = require("./tvShowsEpisode.model");

const castSchema =
  new mongoose.Schema({
    name: String,
    image: String,
  });

const tvShowSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
      },

      slug: {
        type: String,
        unique: true,
        index: true,
      },

      description: String,

      releaseYear: Number,

      genre: [String],

      language: String,

      poster: String,

      banner: String,

      trailerUrl: String,

      totalEpisodes: {
        type: Number,
        default: 0,
      },

      totalViews: {
        type: Number,
        default: 0,
      },

      isPremium: {
        type: Boolean,
        default: false,
      },

      priority: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "ongoing",
          "completed",
        ],
        default: "ongoing",
      },

      cast: [castSchema],

      category: [String],
    },
    {
      timestamps: true,
    }
  );


// Auto slug
tvShowSchema.pre(
  "save",
  function () {
    if (this.title) {
      this.slug =
        this.title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "") +
        "-" +
        Date.now();
    }
  }
);

tvShowSchema.pre(
  "findOneAndDelete",
  async function () {
    const show = await this.model.findOne(this.getFilter()).select("_id");

    if (show) {
      await TvShowsEpisode.deleteMany({
        tvShowId: show._id,
      });
    }
  }
);

tvShowSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await TvShowsEpisode.deleteMany({
      tvShowId: this._id,
    });
  }
);

tvShowSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "TvShow",
  tvShowSchema
);
