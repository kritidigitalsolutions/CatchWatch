const mongoose = require("mongoose");

const castSchema = new mongoose.Schema(
  {
    name: String,
    image: String,
  },
  {
    _id: false,
  }
);

const shortFilmSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    genre: [
      {
        type: String,
        trim: true,
      },
    ],

    category: [
      {
        type: String,
        trim: true,
      },
    ],

    releaseYear: Number,

    duration: String,

    language: String,

    poster: String,

    banner: String,

    trailerUrl: String,

    videoUrl: {
      type: String,
      required: true,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    priority: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },

    cast: [castSchema],
  },
  {
    timestamps: true,
  }
);

shortFilmSchema.pre("save", function () {
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

shortFilmSchema.index({
  priority: -1,
  createdAt: -1,
});

shortFilmSchema.index(
  {
    title: "text",
    description: "text",
  },
  {
    language_override: "dummy",
  }
);

module.exports =
  mongoose.models.ShortFilm ||
  mongoose.model(
    "ShortFilm",
    shortFilmSchema
  );