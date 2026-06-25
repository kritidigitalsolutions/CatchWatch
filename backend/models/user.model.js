const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: "User",
    },



    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      validate: {
        validator: function (value) {
          return /^@[a-zA-Z0-9_]+$/.test(value);
        },
        message:
          "Username must start with @ and contain only letters, numbers and underscores",
      },
    },

    profileImage: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    genres: {
      type: [String],
      required: true,
      default: ["Drama"],
      validate: {
        validator: (value) => value.length > 0,
        message: "At least one genre is required",
      },
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ["PHONE", "GOOGLE"],
      default: "PHONE",
    },

    profileComplete: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["USER"],
      default: "USER",
    },

    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },

    fcmToken: {
      type: String,
      default: "",
    },

    fcmTokenUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);