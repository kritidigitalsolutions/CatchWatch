const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"],
      default: "BATSMAN",
    },
    isCaptain: {
      type: Boolean,
      default: false,
    },
    isWicketKeeper: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      trim: true,
      default: "",
    },
    score: {
      type: String,
      trim: true,
      default: "",
    },
    players: {
      type: [playerSchema],
      default: [],
    },
  },
  { _id: false }
);

const batsmanCreaseSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const bowlerCreaseSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    overs: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
  },
  { _id: false }
);

const battingScorecardSchema = new mongoose.Schema(
  {
    playerName: { type: String, required: true, trim: true },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    dismissalText: { type: String, default: "not out", trim: true },
    isOut: { type: Boolean, default: false },
  },
  { _id: true }
);

const bowlingScorecardSchema = new mongoose.Schema(
  {
    bowlerName: { type: String, required: true, trim: true },
    overs: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
  },
  { _id: true }
);

const fallOfWicketSchema = new mongoose.Schema(
  {
    wicketNumber: { type: Number, default: 1 },
    score: { type: String, default: "" },
    over: { type: String, default: "" },
    playerName: { type: String, default: "" },
  },
  { _id: true }
);

const inningsSchema = new mongoose.Schema(
  {
    teamName: { type: String, trim: true, default: "" },
    score: { type: String, trim: true, default: "" },
    totalRuns: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      penalty: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    batsmen: {
      type: [battingScorecardSchema],
      default: [],
    },
    bowlers: {
      type: [bowlingScorecardSchema],
      default: [],
    },
    fow: {
      type: [fallOfWicketSchema],
      default: [],
    },
  },
  { _id: false }
);

const commentaryItemSchema = new mongoose.Schema(
  {
    over: { type: String, default: "" },
    ball: { type: Number, default: 0 },
    text: { type: String, required: true, trim: true },
    runs: { type: Number, default: 0 },
    isBoundary: { type: Boolean, default: false },
    boundaryType: { type: String, enum: ["4", "6", "none"], default: "none" },
    isWicket: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const liveMatchSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    tournament: {
      type: String,
      trim: true,
      default: "Live Cricket",
    },
    matchFormat: {
      type: String,
      trim: true,
      enum: ["T20", "ODI", "TEST", "LEAGUE", "OTHER"],
      default: "T20",
    },
    team1: {
      type: teamSchema,
      required: true,
    },
    team2: {
      type: teamSchema,
      required: true,
    },
    streamUrl: {
      type: String,
      required: true,
      trim: true,
    },
    backupStreamUrl: {
      type: String,
      trim: true,
      default: "",
    },
    streamType: {
      type: String,
      enum: ["hls", "mp4", "youtube", "embed", "auto"],
      default: "auto",
    },
    banner: {
      type: String,
      trim: true,
      default: "",
    },
    venue: {
      type: String,
      trim: true,
      default: "",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["LIVE", "UPCOMING", "COMPLETED"],
      default: "LIVE",
      index: true,
    },
    isLive: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentStatusText: {
      type: String,
      trim: true,
      default: "",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    viewersCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ── LIVE MATCH SCORER & ACTIVITY FIELDS ──
    currentInnings: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    battingTeam: {
      type: String,
      enum: ["team1", "team2"],
      default: "team1",
    },
    bowlingTeam: {
      type: String,
      enum: ["team1", "team2"],
      default: "team2",
    },
    target: {
      type: Number,
      default: 0,
    },
    crr: {
      type: String,
      default: "0.00",
    },
    rrr: {
      type: String,
      default: "0.00",
    },
    toss: {
      type: String,
      default: "",
    },
    striker: {
      type: batsmanCreaseSchema,
      default: () => ({}),
    },
    nonStriker: {
      type: batsmanCreaseSchema,
      default: () => ({}),
    },
    currentBowler: {
      type: bowlerCreaseSchema,
      default: () => ({}),
    },
    recentBalls: {
      type: [String],
      default: [],
    },
    currentOverBalls: {
      type: [String],
      default: [],
    },
    innings1: {
      type: inningsSchema,
      default: () => ({}),
    },
    innings2: {
      type: inningsSchema,
      default: () => ({}),
    },
    commentary: {
      type: [commentaryItemSchema],
      default: [],
    },
    history: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-sync isLive boolean with status
liveMatchSchema.pre("save", function () {
  this.isLive = this.status === "LIVE";
});

module.exports = mongoose.model("LiveMatch", liveMatchSchema);
