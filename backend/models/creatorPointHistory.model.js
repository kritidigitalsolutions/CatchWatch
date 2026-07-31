const mongoose = require("mongoose");

const creatorPointHistorySchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      default: null,
    },
    action: {
      type: String,
      enum: [
        "LIKE",
        "UNLIKE",
        "COMMENT",
        "UNCOMMENT",
        "SAVE",
        "UNSAVE",
        "SHARE",
        "FOLLOW",
        "UNFOLLOW",
        "QUALIFIED_VIEW",
        "MANUAL_ADD",
        "MANUAL_REMOVE",
      ],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.CreatorPointHistory ||
  mongoose.model("CreatorPointHistory", creatorPointHistorySchema);
