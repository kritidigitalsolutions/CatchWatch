const mongoose = require("mongoose");
const LiveMatch = require("../models/liveMatch.model");

/**
 * Helper to parse score strings like "235/4 (22.2 ov)" or "50/1 (3.1 ov)" or "Yet to bat"
 */
function parseScoreString(scoreStr = "") {
  if (!scoreStr || typeof scoreStr !== "string") {
    return { score: "", runs: 0, wickets: 0, overs: 0 };
  }
  const runsWktsMatch = scoreStr.match(/^(\d+)(?:\/|-)?(\d+)?/);
  const oversMatch = scoreStr.match(/\(([\d.]+)\s*(?:ov)?\)/i);

  const runs = runsWktsMatch ? parseInt(runsWktsMatch[1], 10) : 0;
  const wickets =
    runsWktsMatch && runsWktsMatch[2] !== undefined ? parseInt(runsWktsMatch[2], 10) : 0;
  const overs = oversMatch ? parseFloat(oversMatch[1]) : 0;

  return {
    score: scoreStr.trim(),
    runs,
    wickets,
    overs,
  };
}

/**
 * Helper to format team object for listing and detail responses
 */
function formatTeam(team = {}) {
  const parsed = parseScoreString(team.score);
  return {
    name: team.name || "",
    shortName: team.shortName || "",
    flagUrl: team.logo || "",
    logo: team.logo || "",
    score: team.score || "",
    runs: parsed.runs,
    wickets: parsed.wickets,
    overs: parsed.overs,
  };
}

/**
 * Format listing match payload (strict listing fields only)
 */
function formatListingMatch(m) {
  const teamA = formatTeam(m.team1);
  const teamB = formatTeam(m.team2);
  const result = m.status === "COMPLETED" ? (m.currentStatusText || "Match Completed") : "";

  return {
    matchId: m._id,
    _id: m._id,
    title: m.title,
    status: m.status,
    isLive: m.status === "LIVE",
    format: m.matchFormat,
    matchFormat: m.matchFormat,
    tournament: m.tournament,
    startTime: m.startTime,
    teamA,
    teamB,
    team1: teamA,
    team2: teamB,
    banner: m.banner || "",
    streamThumbnailUrl: m.banner || "",
    result,
    currentStatusText: m.currentStatusText || "",
    isFeatured: Boolean(m.isFeatured),
    viewersCount: m.viewersCount || 0,
  };
}

/**
 * 1. GET /api/live-matches — Match Listings
 * Strictly returns listing fields only:
 * matchId, status, format, tournament, startTime, teamA, teamB, result (if COMPLETED), isFeatured
 * Removed: streamUrl, squads, scorecard, commentary, liveCrease
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

    const maxResults = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50;

    const [rawMatches, stats] = await Promise.all([
      LiveMatch.find(filter)
        .select(
          "title tournament matchFormat banner team1.name team1.shortName team1.logo team1.score team2.name team2.shortName team2.logo team2.score status isLive currentStatusText startTime isFeatured viewersCount order"
        )
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

    const matches = rawMatches.map(formatListingMatch);

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
 * 2. GET /api/live-matches/featured — Hero Banner
 * Strictly returns single featured match listing data + streamThumbnailUrl
 * Removed: Full scorecard, squads, commentary, liveCrease, streamUrl
 */
exports.getFeaturedMatch = async (req, res) => {
  try {
    const projection =
      "title tournament matchFormat team1.name team1.shortName team1.logo team1.score team2.name team2.shortName team2.logo team2.score status isLive currentStatusText startTime isFeatured viewersCount banner";

    let match = await LiveMatch.findOne({
      isActive: { $ne: false },
      status: "LIVE",
      isFeatured: true,
    })
      .select(projection)
      .sort({ order: 1, viewersCount: -1 })
      .lean();

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "LIVE",
      })
        .select(projection)
        .sort({ order: 1, viewersCount: -1 })
        .lean();
    }

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "UPCOMING",
        isFeatured: true,
      })
        .select(projection)
        .sort({ startTime: 1 })
        .lean();
    }

    if (!match) {
      match = await LiveMatch.findOne({
        isActive: { $ne: false },
        status: "UPCOMING",
      })
        .select(projection)
        .sort({ startTime: 1 })
        .lean();
    }

    if (!match) {
      return res.status(200).json({
        success: true,
        match: null,
      });
    }

    const formatted = {
      ...formatListingMatch(match),
      streamThumbnailUrl: match.banner || "",
      banner: match.banner || "",
    };

    return res.status(200).json({
      success: true,
      match: formatted,
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
 * 3. GET /api/live-matches/live-now — LIVE Shortcut
 * Returns listing fields only for LIVE status matches
 */
exports.getLiveNowMatches = async (req, res) => {
  req.query.status = "LIVE";
  return exports.getActiveMatches(req, res);
};

/**
 * 4. GET /api/live-matches/upcoming — UPCOMING Shortcut
 * Returns listing fields only for UPCOMING status matches
 */
exports.getUpcomingMatches = async (req, res) => {
  req.query.status = "UPCOMING";
  return exports.getActiveMatches(req, res);
};

/**
 * 5. GET /api/live-matches/completed — COMPLETED Shortcut
 * Returns listing fields only for COMPLETED status matches with result
 */
exports.getCompletedMatches = async (req, res) => {
  req.query.status = "COMPLETED";
  return exports.getActiveMatches(req, res);
};

/**
 * 6. GET /api/live-matches/:id — Full Match Details (Match Screen Open hone par ek baar)
 * Returns: matchId, status, format, tournament, venue, startTime, endTime, teamA, teamB,
 * streamUrl, backupStreamUrl, streamThumbnailUrl, result, toss, etc.
 * Removed: liveCrease, squads, scorecard, commentary (these have their own endpoints)
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

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } })
      .select(
        "title tournament matchFormat venue startTime endTime status isLive currentStatusText isFeatured isPremium viewersCount streamUrl backupStreamUrl streamType banner toss currentInnings battingTeam bowlingTeam team1.name team1.shortName team1.logo team1.score team2.name team2.shortName team2.logo team2.score"
      )
      .lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found or is currently inactive",
      });
    }

    const teamA = formatTeam(match.team1);
    const teamB = formatTeam(match.team2);
    const result = match.status === "COMPLETED" ? (match.currentStatusText || "Match Completed") : "";

    const formattedMatch = {
      matchId: match._id,
      _id: match._id,
      title: match.title,
      status: match.status,
      isLive: match.status === "LIVE",
      format: match.matchFormat,
      matchFormat: match.matchFormat,
      tournament: match.tournament,
      venue: match.venue || "",
      startTime: match.startTime,
      endTime: match.endTime,
      teamA,
      teamB,
      team1: teamA,
      team2: teamB,
      streamUrl: match.streamUrl,
      backupStreamUrl: match.backupStreamUrl || "",
      streamType: match.streamType || "auto",
      streamThumbnailUrl: match.banner || "",
      banner: match.banner || "",
      result,
      currentStatusText: match.currentStatusText || "",
      isFeatured: Boolean(match.isFeatured),
      isPremium: Boolean(match.isPremium),
      viewersCount: match.viewersCount || 0,
      toss: match.toss || "",
      currentInnings: match.currentInnings || 1,
      battingTeam: match.battingTeam || "team1",
      bowlingTeam: match.bowlingTeam || "team2",
    };

    return res.status(200).json({
      success: true,
      match: formattedMatch,
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
 * 7. POST /api/live-matches/:id/view — Viewer Heartbeat
 * Returns only: { success: true, viewerCount: Number }
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
      { new: true, select: "viewersCount" }
    ).lean();

    const count = match?.viewersCount || 0;

    return res.status(200).json({
      success: true,
      viewerCount: count,
      viewersCount: count,
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
 * 8. GET /api/live-matches/:id/live-activity — Live Crease Polling (every 3-5s)
 * Strictly returns real-time changing data ONLY:
 * scores { teamA, teamB }, CRR, RRR, target, striker, nonStriker, bowler, recentBalls, overStatusText, lastUpdated
 * Ultra-lightweight payload. No full scorecard, no squads, no stream URLs.
 */
exports.getMatchLiveActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } })
      .select(
        "team1.name team1.shortName team1.score team2.name team2.shortName team2.score status isLive currentStatusText currentInnings battingTeam bowlingTeam target crr rrr toss striker nonStriker currentBowler recentBalls currentOverBalls"
      )
      .lean();

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const teamAScores = formatTeam(match.team1);
    const teamBScores = formatTeam(match.team2);

    return res.status(200).json({
      success: true,
      matchId: match._id,
      status: match.status,
      isLive: match.status === "LIVE",
      scores: {
        teamA: teamAScores,
        teamB: teamBScores,
        team1: teamAScores.score,
        team2: teamBScores.score,
      },
      currentInnings: match.currentInnings || 1,
      battingTeam: match.battingTeam || "team1",
      bowlingTeam: match.bowlingTeam || "team2",
      CRR: match.crr || "0.00",
      crr: match.crr || "0.00",
      RRR: match.rrr || "0.00",
      rrr: match.rrr || "0.00",
      target: match.target || 0,
      striker: {
        name: match.striker?.name || "",
        runs: match.striker?.runs || 0,
        balls: match.striker?.balls || 0,
        fours: match.striker?.fours || 0,
        sixes: match.striker?.sixes || 0,
        SR: match.striker?.strikeRate || 0,
        strikeRate: match.striker?.strikeRate || 0,
      },
      nonStriker: {
        name: match.nonStriker?.name || "",
        runs: match.nonStriker?.runs || 0,
        balls: match.nonStriker?.balls || 0,
        fours: match.nonStriker?.fours || 0,
        sixes: match.nonStriker?.sixes || 0,
        SR: match.nonStriker?.strikeRate || 0,
        strikeRate: match.nonStriker?.strikeRate || 0,
      },
      bowler: {
        name: match.currentBowler?.name || "",
        overs: match.currentBowler?.overs || 0,
        maidens: match.currentBowler?.maidens || 0,
        runs: match.currentBowler?.runsConceded || 0,
        runsConceded: match.currentBowler?.runsConceded || 0,
        wickets: match.currentBowler?.wickets || 0,
        economy: match.currentBowler?.economy || 0,
      },
      currentBowler: {
        name: match.currentBowler?.name || "",
        overs: match.currentBowler?.overs || 0,
        maidens: match.currentBowler?.maidens || 0,
        runsConceded: match.currentBowler?.runsConceded || 0,
        wickets: match.currentBowler?.wickets || 0,
        economy: match.currentBowler?.economy || 0,
      },
      recentBalls: match.recentBalls || [],
      currentOverBalls: match.currentOverBalls || [],
      overStatusText: match.currentStatusText || "",
      currentStatusText: match.currentStatusText || "",
      lastUpdated: new Date().toISOString(),
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
 * 9. GET /api/live-matches/:id/scorecard — Scorecard Tab
 * Returns: innings1 { batting[], bowling[], extras, fallOfWickets[] }, innings2 { ... }
 */
exports.getMatchScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } })
      .select("status currentInnings battingTeam bowlingTeam target crr rrr innings1 innings2")
      .lean();

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const formatInnings = (inn = {}) => {
      const batting = (inn.batsmen || []).map((b) => ({
        playerName: b.playerName,
        name: b.playerName,
        runs: b.runs || 0,
        balls: b.balls || 0,
        fours: b.fours || 0,
        sixes: b.sixes || 0,
        strikeRate: b.strikeRate || 0,
        SR: b.strikeRate || 0,
        dismissalText: b.dismissalText || "not out",
        isOut: Boolean(b.isOut),
      }));

      const bowling = (inn.bowlers || []).map((bw) => ({
        bowlerName: bw.bowlerName,
        name: bw.bowlerName,
        overs: bw.overs || 0,
        maidens: bw.maidens || 0,
        runsConceded: bw.runsConceded || 0,
        runs: bw.runsConceded || 0,
        wickets: bw.wickets || 0,
        economy: bw.economy || 0,
      }));

      const fallOfWickets = (inn.fow || []).map((f) => ({
        wicketNumber: f.wicketNumber || 1,
        score: f.score || "",
        over: f.over || "",
        playerName: f.playerName || "",
      }));

      return {
        teamName: inn.teamName || "",
        score: inn.score || "",
        totalRuns: inn.totalRuns || 0,
        wickets: inn.wickets || 0,
        overs: inn.overs || 0,
        extras: inn.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batting,
        batsmen: batting,
        bowling,
        bowlers: bowling,
        fallOfWickets,
        fow: fallOfWickets,
      };
    };

    return res.status(200).json({
      success: true,
      matchId: match._id,
      status: match.status,
      currentInnings: match.currentInnings || 1,
      battingTeam: match.battingTeam || "team1",
      bowlingTeam: match.bowlingTeam || "team2",
      target: match.target || 0,
      crr: match.crr || "0.00",
      rrr: match.rrr || "0.00",
      innings1: formatInnings(match.innings1),
      innings2: formatInnings(match.innings2),
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
 * 10. GET /api/live-matches/:id/commentary?limit=30 — Commentary Tab
 * Returns: commentary [{ over, ball, text, runs, isBoundary, isSix, isWicket, timestamp }], totalCount, limit
 */
exports.getMatchCommentary = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } })
      .select("commentary currentStatusText")
      .lean();

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const totalCount = (match.commentary || []).length;
    const items = (match.commentary || []).slice(0, limit).map((c) => ({
      over: c.over || "",
      ball: c.ball || 0,
      text: c.text || "",
      runs: c.runs || 0,
      isBoundary: Boolean(c.isBoundary),
      boundaryType: c.boundaryType || (c.runs === 6 ? "6" : c.runs === 4 ? "4" : "none"),
      isSix: c.boundaryType === "6" || c.runs === 6,
      isWicket: Boolean(c.isWicket),
      timestamp: c.timestamp,
    }));

    return res.status(200).json({
      success: true,
      matchId: match._id,
      totalCount,
      limit,
      count: items.length,
      currentStatusText: match.currentStatusText || "",
      commentary: items,
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
 * 11. GET /api/live-matches/:id/squads — Squads Tab
 * Returns: teamA { name, players [{ name, role, isCaptain, isWicketKeeper }] }, teamB { ... }
 */
exports.getMatchSquads = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findOne({ _id: id, isActive: { $ne: false } })
      .select(
        "title team1.name team1.shortName team1.logo team1.players team2.name team2.shortName team2.logo team2.players"
      )
      .lean();

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const formatSquad = (team = {}) => ({
      name: team.name || "",
      shortName: team.shortName || "",
      flagUrl: team.logo || "",
      logo: team.logo || "",
      playerCount: (team.players || []).length,
      players: (team.players || []).map((p) => ({
        name: p.name || "",
        role: p.role || "BATSMAN",
        isCaptain: Boolean(p.isCaptain),
        isWicketKeeper: Boolean(p.isWicketKeeper),
      })),
    });

    const teamA = formatSquad(match.team1);
    const teamB = formatSquad(match.team2);

    return res.status(200).json({
      success: true,
      matchId: match._id,
      title: match.title,
      teamA,
      teamB,
      team1: teamA,
      team2: teamB,
    });
  } catch (error) {
    console.error("User getMatchSquads error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch match squads",
    });
  }
};
