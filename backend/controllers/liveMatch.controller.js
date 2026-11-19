const mongoose = require("mongoose");
const LiveMatch = require("../models/liveMatch.model");

/**
 * Get active live cricket matches for users (Website & Mobile App)
 * GET /api/live-matches
 * Query params: status (ALL, LIVE, UPCOMING, COMPLETED), tournament, format, limit
 */
exports.getActiveMatches = async (req, res) => {
  try {
    const { status, tournament, format, limit } = req.query;
    const filter = { isActive: { $ne: false } };

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    if (tournament && tournament.trim()) {
      filter.tournament = new RegExp(tournament.trim(), "i");
    }

    if (format && format !== "ALL") {
      filter.matchFormat = format.toUpperCase();
    }

    const maxResults = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 50;

    const [matches, stats] = await Promise.all([
      LiveMatch.find(filter)
        .select("-innings1.batsmen -innings1.bowlers -innings2.batsmen -innings2.bowlers -commentary")
        .sort({ isLive: -1, order: 1, startTime: 1 })
        .limit(maxResults)
        .lean(),
      LiveMatch.aggregate([
        { $match: { isActive: { $ne: false } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statMap = {
      live: 0,
      upcoming: 0,
      completed: 0,
      total: 0,
    };

    stats.forEach((s) => {
      if (s._id === "LIVE") statMap.live = s.count;
      if (s._id === "UPCOMING") statMap.upcoming = s.count;
      if (s._id === "COMPLETED") statMap.completed = s.count;
      statMap.total += s.count;
    });

    return res.status(200).json({
      success: true,
      count: matches.length,
      stats: statMap,
      matches,
    });
  } catch (error) {
    console.error("User getActiveMatches error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live cricket matches",
    });
  }
};

/**
 * Get single featured match for hero banner / featured carousel
 * GET /api/live-matches/featured
 */
exports.getFeaturedMatch = async (req, res) => {
  try {
    let match = await LiveMatch.findOne({
      isActive: { $ne: false },
      status: "LIVE",
      isFeatured: true,
    }).sort({ order: 1, viewersCount: -1 });

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "LIVE",
      }).sort({ order: 1, viewersCount: -1 });
    }

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "UPCOMING",
        isFeatured: true,
      }).sort({ startTime: 1 });
    }

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "UPCOMING",
      }).sort({ startTime: 1 });
    }

    return res.status(200).json({
      success: true,
      match: match || null,
    });
  } catch (error) {
    console.error("User getFeaturedMatch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch featured live match",
    });
  }
};

/**
 * Get full match details by ID (including live crease, ball ticker, squads, scorecard)
 * GET /api/live-matches/:id
 */
exports.getMatchDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } });
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found or is currently inactive",
      });
    }

    return res.status(200).json({
      success: true,
      match,
    });
  } catch (error) {
    console.error("User getMatchDetails error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch match details",
    });
  }
};

/**
 * Get detailed scorecard for a match
 * GET /api/live-matches/:id/scorecard
 */
exports.getMatchScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } }).select(
      "title tournament matchFormat team1 team2 status isLive currentStatusText currentInnings battingTeam bowlingTeam target crr rrr toss striker nonStriker currentBowler recentBalls currentOverBalls innings1 innings2"
    );

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    return res.status(200).json({
      success: true,
      matchId: match._id,
      title: match.title,
      tournament: match.tournament,
      status: match.status,
      team1: match.team1,
      team2: match.team2,
      currentInnings: match.currentInnings,
      battingTeam: match.battingTeam,
      bowlingTeam: match.bowlingTeam,
      target: match.target,
      crr: match.crr,
      rrr: match.rrr,
      toss: match.toss,
      striker: match.striker,
      nonStriker: match.nonStriker,
      currentBowler: match.currentBowler,
      recentBalls: match.recentBalls,
      currentOverBalls: match.currentOverBalls,
      innings1: match.innings1,
      innings2: match.innings2,
    });
  } catch (error) {
    console.error("User getMatchScorecard error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch scorecard",
    });
  }
};

/**
 * Get live commentary feed for a match
 * GET /api/live-matches/:id/commentary
 */
exports.getMatchCommentary = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } }).select("commentary currentStatusText");
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const commentary = (match.commentary || []).slice(0, limit);

    return res.status(200).json({
      success: true,
      currentStatusText: match.currentStatusText,
      count: commentary.length,
      commentary,
    });
  } catch (error) {
    console.error("User getMatchCommentary error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch commentary",
    });
  }
};

/**
 * Ping live match viewer (heartbeat/counter)
 * POST /api/live-matches/:id/view
 */
exports.pingViewer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findByIdAndUpdate(
      id,
      { $inc: { viewersCount: 1 } },
      { new: true, select: "viewersCount isLive status" }
    );

    return res.status(200).json({
      success: true,
      viewersCount: match?.viewersCount || 0,
    });
  } catch (error) {
    console.error("User pingViewer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update viewer count",
    });
  }
};

/**
 * Direct shortcut: Get matches currently LIVE
 * GET /api/live-matches/live-now
 */
exports.getLiveNowMatches = async (req, res) => {
  req.query.status = "LIVE";
  return exports.getActiveMatches(req, res);
};

/**
 * Direct shortcut: Get UPCOMING matches
 * GET /api/live-matches/upcoming
 */
exports.getUpcomingMatches = async (req, res) => {
  req.query.status = "UPCOMING";
  return exports.getActiveMatches(req, res);
};

/**
 * Direct shortcut: Get COMPLETED matches
 * GET /api/live-matches/completed
 */
exports.getCompletedMatches = async (req, res) => {
  req.query.status = "COMPLETED";
  return exports.getActiveMatches(req, res);
};

/**
 * Lightweight live polling endpoint for mobile apps (Flutter / iOS)
 * Poll every 3-5 seconds to keep the score, crease & recent balls live with low data overhead
 * GET /api/live-matches/:id/live-activity
 */
exports.getMatchLiveActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } }).select(
      "title tournament matchFormat status isLive currentStatusText streamUrl streamType banner team1.name team1.shortName team1.logo team1.score team2.name team2.shortName team2.logo team2.score currentInnings battingTeam bowlingTeam target crr rrr toss striker nonStriker currentBowler recentBalls currentOverBalls viewersCount"
    );

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    return res.status(200).json({
      success: true,
      matchId: match._id,
      title: match.title,
      tournament: match.tournament,
      matchFormat: match.matchFormat,
      status: match.status,
      isLive: match.isLive,
      currentStatusText: match.currentStatusText,
      streamUrl: match.streamUrl,
      streamType: match.streamType,
      banner: match.banner,
      team1: match.team1,
      team2: match.team2,
      currentInnings: match.currentInnings,
      battingTeam: match.battingTeam,
      bowlingTeam: match.bowlingTeam,
      target: match.target,
      crr: match.crr,
      rrr: match.rrr,
      toss: match.toss,
      striker: match.striker,
      nonStriker: match.nonStriker,
      currentBowler: match.currentBowler,
      recentBalls: match.recentBalls,
      currentOverBalls: match.currentOverBalls,
      viewersCount: match.viewersCount,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("User getMatchLiveActivity error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live activity",
    });
  }
};

/**
 * Get squads and Playing XI for both teams
 * GET /api/live-matches/:id/squads
 */
exports.getMatchSquads = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } }).select(
      "title team1.name team1.shortName team1.logo team1.players team2.name team2.shortName team2.logo team2.players"
    );

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    return res.status(200).json({
      success: true,
      matchId: match._id,
      title: match.title,
      team1: {
        name: match.team1.name,
        shortName: match.team1.shortName,
        logo: match.team1.logo,
        playerCount: (match.team1.players || []).length,
        players: match.team1.players || [],
      },
      team2: {
        name: match.team2.name,
        shortName: match.team2.shortName,
        logo: match.team2.logo,
        playerCount: (match.team2.players || []).length,
        players: match.team2.players || [],
      },
    });
  } catch (error) {
    console.error("User getMatchSquads error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch match squads",
    });
  }
};
