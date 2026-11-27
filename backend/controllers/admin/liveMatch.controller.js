const mongoose = require("mongoose");
const LiveMatch = require("../../models/liveMatch.model");

/**
 * Helper to normalize team objects from flat or nested request body
 */
const parseTeam = (body, prefix, fileLogo) => {
  let team = {};

  if (body[prefix] && typeof body[prefix] === "object") {
    team = { ...body[prefix] };
  } else if (typeof body[prefix] === "string") {
    try {
      team = JSON.parse(body[prefix]);
    } catch (e) {
      team = { name: body[prefix] };
    }
  }

  // Fallbacks from flat keys like team1Name, team1ShortName, etc.
  if (body[`${prefix}Name`]) team.name = body[`${prefix}Name`];
  if (body[`${prefix}ShortName`]) team.shortName = body[`${prefix}ShortName`];
  if (body[`${prefix}Score`]) team.score = body[`${prefix}Score`];
  if (body[`${prefix}Logo`]) team.logo = body[`${prefix}Logo`];

  if (body[`${prefix}Players`]) {
    try {
      team.players =
        typeof body[`${prefix}Players`] === "string"
          ? JSON.parse(body[`${prefix}Players`])
          : body[`${prefix}Players`];
    } catch (e) {
      team.players = [];
    }
  }

  // If a file was uploaded for this team logo
  if (fileLogo) {
    team.logo = fileLogo.cdnUrl || fileLogo.path || team.logo;
  }

  return {
    name: team.name || (prefix === "team1" ? "Team 1" : "Team 2"),
    shortName: team.shortName || "",
    logo: team.logo || "",
    score: team.score || "",
    players: Array.isArray(team.players) ? team.players : [],
  };
};

/**
 * Helper to calculate overs after adding a legal ball (String-split for exact cricket decimal math)
 * e.g. 7.5 + 1 ball = 8.0, 8.0 + 1 ball = 8.1
 */
const addLegalBallToOvers = (currentOvers) => {
  const oversStr = String(currentOvers || 0);
  const parts = oversStr.split(".");
  const completedOvers = parseInt(parts[0], 10) || 0;
  const remBalls = parseInt(parts[1], 10) || 0;

  const totalBalls = completedOvers * 6 + remBalls;
  const newTotal = totalBalls + 1;
  const newCompleted = Math.floor(newTotal / 6);
  const newRem = newTotal % 6;
  return newRem === 0 ? newCompleted : Number(`${newCompleted}.${newRem}`);
};

/**
 * Helper to calculate total balls from overs float or string (e.g. 18.2 -> 110)
 */
const oversToTotalBalls = (currentOvers) => {
  if (!currentOvers) return 0;
  const oversStr = String(currentOvers);
  const parts = oversStr.split(".");
  const completedOvers = parseInt(parts[0], 10) || 0;
  const remBalls = parseInt(parts[1], 10) || 0;
  return completedOvers * 6 + remBalls;
};

/**
 * Get all live cricket matches for admin (with pagination, search, status filter)
 */
exports.getAllMatches = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { search, status, format } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    if (format && format !== "ALL") {
      filter.matchFormat = format.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      filter.$or = [
        { title: regex },
        { tournament: regex },
        { venue: regex },
        { "team1.name": regex },
        { "team2.name": regex },
        { "team1.shortName": regex },
        { "team2.shortName": regex },
      ];
    }

    const [matches, total, stats] = await Promise.all([
      LiveMatch.find(filter)
        .sort({ isLive: -1, order: 1, startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveMatch.countDocuments(filter),
      LiveMatch.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statMap = {
      total: 0,
      live: 0,
      upcoming: 0,
      completed: 0,
    };

    stats.forEach((s) => {
      if (s._id === "LIVE") statMap.live = s.count;
      if (s._id === "UPCOMING") statMap.upcoming = s.count;
      if (s._id === "COMPLETED") statMap.completed = s.count;
      statMap.total += s.count;
    });

    return res.status(200).json({
      success: true,
      matches,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: statMap,
    });
  } catch (error) {
    console.error("Admin getAllMatches error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live matches",
    });
  }
};

/**
 * Get single match details for admin
 */
exports.getSingleMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    return res.status(200).json({
      success: true,
      match,
    });
  } catch (error) {
    console.error("Admin getSingleMatch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch match details",
    });
  }
};

/**
 * Create a new live cricket match
 */
exports.createMatch = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      title,
      tournament,
      matchFormat,
      streamUrl,
      backupStreamUrl,
      streamType,
      venue,
      startTime,
      endTime,
      status,
      currentStatusText,
      isFeatured,
      isPremium,
      order,
      isActive,
      toss,
      target,
    } = body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Match title is required",
      });
    }

    if (!streamUrl || !streamUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: "Live stream URL is required",
      });
    }

    // Handle files if uploaded
    const bannerFile = req.files?.banner?.[0] || req.files?.bannerFile?.[0];
    const team1LogoFile = req.files?.team1LogoFile?.[0] || req.files?.team1Logo?.[0] || req.files?.logo1?.[0];
    const team2LogoFile = req.files?.team2LogoFile?.[0] || req.files?.team2Logo?.[0] || req.files?.logo2?.[0];

    let banner = body.banner || "";
    if (bannerFile) {
      banner = bannerFile.cdnUrl || bannerFile.path || banner;
    }

    const team1 = parseTeam(body, "team1", team1LogoFile);
    const team2 = parseTeam(body, "team2", team2LogoFile);

    const matchStatus = status ? status.toUpperCase() : "LIVE";
    const isLive = matchStatus === "LIVE";

    const match = await LiveMatch.create({
      title: title.trim(),
      tournament: tournament?.trim() || "Live Cricket",
      matchFormat: ["T20", "ODI", "TEST", "LEAGUE", "OTHER"].includes(matchFormat?.toUpperCase())
        ? matchFormat.toUpperCase()
        : "T20",
      team1,
      team2,
      streamUrl: streamUrl.trim(),
      backupStreamUrl: backupStreamUrl ? backupStreamUrl.trim() : "",
      streamType: ["hls", "mp4", "youtube", "embed", "auto"].includes(streamType?.toLowerCase())
        ? streamType.toLowerCase()
        : "auto",
      banner,
      venue: venue?.trim() || "",
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      status: matchStatus,
      isLive,
      currentStatusText: currentStatusText?.trim() || "",
      isFeatured: isFeatured === true || isFeatured === "true",
      isPremium: isPremium === true || isPremium === "true",
      order: Number(order) || 0,
      isActive: isActive !== false && isActive !== "false",
      toss: toss?.trim() || "",
      target: Number(target) || 0,
      striker: { name: "", runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 },
      nonStriker: { name: "", runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 },
      currentBowler: { name: "", overs: 0, maidens: 0, runsConceded: 0, wickets: 0, economy: 0 },
      recentBalls: [],
      currentOverBalls: [],
      innings1: {
        teamName: team1.name,
        score: team1.score || "0/0 (0.0 ov)",
        totalRuns: 0,
        wickets: 0,
        overs: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        fow: [],
      },
      innings2: {
        teamName: team2.name,
        score: team2.score || "Yet to bat",
        totalRuns: 0,
        wickets: 0,
        overs: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        fow: [],
      },
      commentary: [],
      history: [],
    });

    return res.status(201).json({
      success: true,
      message: "Live match created successfully",
      match,
    });
  } catch (error) {
    console.error("Admin createMatch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create live match",
    });
  }
};

/**
 * Update an existing live match
 */
exports.updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    const body = req.body || {};

    if (body.title !== undefined) match.title = body.title.trim();
    if (body.tournament !== undefined) match.tournament = body.tournament.trim();
    if (body.matchFormat !== undefined) {
      const fmt = body.matchFormat.toUpperCase();
      if (["T20", "ODI", "TEST", "LEAGUE", "OTHER"].includes(fmt)) {
        match.matchFormat = fmt;
      }
    }

    if (body.streamUrl !== undefined) match.streamUrl = body.streamUrl.trim();
    if (body.backupStreamUrl !== undefined) match.backupStreamUrl = body.backupStreamUrl.trim();
    if (body.streamType !== undefined) match.streamType = body.streamType.toLowerCase();
    if (body.venue !== undefined) match.venue = body.venue.trim();
    if (body.startTime !== undefined) match.startTime = new Date(body.startTime);
    if (body.endTime !== undefined) match.endTime = body.endTime ? new Date(body.endTime) : undefined;
    if (body.currentStatusText !== undefined) match.currentStatusText = body.currentStatusText.trim();
    if (body.order !== undefined) match.order = Number(body.order) || 0;
    if (body.isFeatured !== undefined) match.isFeatured = body.isFeatured === true || body.isFeatured === "true";
    if (body.isPremium !== undefined) match.isPremium = body.isPremium === true || body.isPremium === "true";
    if (body.isActive !== undefined) match.isActive = body.isActive !== false && body.isActive !== "false";
    if (body.toss !== undefined) match.toss = body.toss.trim();
    if (body.target !== undefined) match.target = Number(body.target) || 0;

    // Handle files if uploaded
    const bannerFile = req.files?.banner?.[0] || req.files?.bannerFile?.[0];
    const team1LogoFile = req.files?.team1LogoFile?.[0] || req.files?.team1Logo?.[0] || req.files?.logo1?.[0];
    const team2LogoFile = req.files?.team2LogoFile?.[0] || req.files?.team2Logo?.[0] || req.files?.logo2?.[0];

    if (bannerFile) {
      match.banner = bannerFile.cdnUrl || bannerFile.path;
    } else if (body.banner !== undefined) {
      match.banner = body.banner;
    }

    // Team 1 updates
    const t1 = parseTeam(body, "team1", team1LogoFile);
    if (t1.name) match.team1.name = t1.name;
    if (t1.shortName !== undefined) match.team1.shortName = t1.shortName;
    if (t1.score !== undefined) match.team1.score = t1.score;
    if (body.team1Logo !== undefined || body.team1 !== undefined || team1LogoFile) {
      match.team1.logo = t1.logo;
    }
    if (t1.players && t1.players.length > 0) {
      match.team1.players = t1.players;
    }

    // Team 2 updates
    const t2 = parseTeam(body, "team2", team2LogoFile);
    if (t2.name) match.team2.name = t2.name;
    if (t2.shortName !== undefined) match.team2.shortName = t2.shortName;
    if (t2.score !== undefined) match.team2.score = t2.score;
    if (body.team2Logo !== undefined || body.team2 !== undefined || team2LogoFile) {
      match.team2.logo = t2.logo;
    }
    if (t2.players && t2.players.length > 0) {
      match.team2.players = t2.players;
    }

    // Status updates
    if (body.status !== undefined) {
      const st = body.status.toUpperCase();
      if (["LIVE", "UPCOMING", "COMPLETED"].includes(st)) {
        match.status = st;
        match.isLive = st === "LIVE";
      }
    }

    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: "Match updated successfully",
      match,
    });
  } catch (error) {
    console.error("Admin updateMatch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update match",
    });
  }
};

/**
 * Quick toggle or update status (LIVE / UPCOMING / COMPLETED)
 */
exports.updateMatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentStatusText } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const st = (status || "").toUpperCase();
    if (!["LIVE", "UPCOMING", "COMPLETED"].includes(st)) {
      return res.status(400).json({
        success: false,
        message: "Status must be LIVE, UPCOMING, or COMPLETED",
      });
    }

    const updateFields = {
      status: st,
      isLive: st === "LIVE",
    };

    if (currentStatusText !== undefined) {
      updateFields.currentStatusText = currentStatusText.trim();
    }

    const match = await LiveMatch.findByIdAndUpdate(id, updateFields, { new: true });
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Match status updated to ${st}`,
      match,
    });
  } catch (error) {
    console.error("Admin updateMatchStatus error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update match status",
    });
  }
};

/**
 * Quick update match live score strings
 */
exports.updateMatchScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { team1Score, team2Score, currentStatusText } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    if (team1Score !== undefined) match.team1.score = team1Score.trim();
    if (team2Score !== undefined) match.team2.score = team2Score.trim();
    if (currentStatusText !== undefined) match.currentStatusText = currentStatusText.trim();

    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: "Scores updated successfully",
      match,
    });
  } catch (error) {
    console.error("Admin updateMatchScore error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update scores",
    });
  }
};

/**
 * Update Match Squads / Playing XI
 * PUT /api/admin/live-matches/:id/squads
 */
exports.updateMatchSquads = async (req, res) => {
  try {
    const { id } = req.params;
    const { team1Players, team2Players } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    if (Array.isArray(team1Players)) {
      match.team1.players = team1Players.map((p) => ({
        name: typeof p === "string" ? p.trim() : (p.name || "").trim(),
        role: p.role || "BATSMAN",
        isCaptain: Boolean(p.isCaptain),
        isWicketKeeper: Boolean(p.isWicketKeeper),
      }));
    }

    if (Array.isArray(team2Players)) {
      match.team2.players = team2Players.map((p) => ({
        name: typeof p === "string" ? p.trim() : (p.name || "").trim(),
        role: p.role || "BATSMAN",
        isCaptain: Boolean(p.isCaptain),
        isWicketKeeper: Boolean(p.isWicketKeeper),
      }));
    }

    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: "Match squads updated successfully",
      team1Players: match.team1.players,
      team2Players: match.team2.players,
    });
  } catch (error) {
    console.error("Admin updateMatchSquads error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update squads",
    });
  }
};

/**
 * Update Full Scorecard & Crease Setup
 * PUT /api/admin/live-matches/:id/scorecard
 */
exports.updateFullScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      currentInnings,
      battingTeam,
      bowlingTeam,
      target,
      crr,
      rrr,
      toss,
      striker,
      nonStriker,
      currentBowler,
      team1Score,
      team2Score,
      currentStatusText,
      innings1,
      innings2,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    if (currentInnings) match.currentInnings = Number(currentInnings);
    if (battingTeam) match.battingTeam = battingTeam;
    if (bowlingTeam) match.bowlingTeam = bowlingTeam;
    if (target !== undefined) match.target = Number(target) || 0;
    if (crr !== undefined) match.crr = String(crr);
    if (rrr !== undefined) match.rrr = String(rrr);
    if (toss !== undefined) match.toss = toss;
    if (team1Score !== undefined) match.team1.score = team1Score;
    if (team2Score !== undefined) match.team2.score = team2Score;
    if (currentStatusText !== undefined) match.currentStatusText = currentStatusText;

    if (striker) match.striker = { ...match.striker, ...striker };
    if (nonStriker) match.nonStriker = { ...match.nonStriker, ...nonStriker };
    if (currentBowler) match.currentBowler = { ...match.currentBowler, ...currentBowler };

    if (innings1) match.innings1 = { ...match.innings1, ...innings1 };
    if (innings2) match.innings2 = { ...match.innings2, ...innings2 };

    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: "Scorecard updated successfully",
      match,
    });
  } catch (error) {
    console.error("Admin updateFullScorecard error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update scorecard",
    });
  }
};

/**
 * 1-Click Record Ball Action for Live Scorer
 * POST /api/admin/live-matches/:id/record-ball
 *
 * Supported Actions:
 * - action: "RUN", runs: 0, 1, 2, 3, 4, 6
 * - action: "EXTRA", extraType: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE", runs: number
 * - action: "WICKET", wicketType, dismissedPlayer, newPlayer, fielder
 * - action: "SWAP_STRIKE"
 * - action: "NEW_OVER", bowlerName: string
 * - action: "CLEAR_OVER"
 * - action: "SELECT_CREASE_PLAYER", role: "striker" | "nonStriker" | "bowler", playerName: string
 * - action: "UNDO"
 */
exports.recordBallAction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action,
      runs = 0,
      extraType,
      wicketType = "caught",
      dismissedPlayer,
      newPlayer,
      fielder = "",
      bowlerName,
      commentaryText,
      role,
      playerName,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid match ID" });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    const numRuns = Number(runs) || 0;
    const inningsKey = match.currentInnings === 2 ? "innings2" : "innings1";
    const activeInnings = match[inningsKey] || {};
    const activeBattingTeam = match.battingTeam === "team2" ? match.team2 : match.team1;

    // ── ACTION: UNDO LAST BALL ──
    if (action === "UNDO") {
      if (!match.history || match.history.length === 0) {
        return res.status(400).json({ success: false, message: "No previous ball to undo" });
      }
      const prev = match.history.pop();
      if (prev.striker) match.striker = prev.striker;
      if (prev.nonStriker) match.nonStriker = prev.nonStriker;
      if (prev.currentBowler) match.currentBowler = prev.currentBowler;
      match.currentOverBalls = prev.currentOverBalls || [];
      match.recentBalls = prev.recentBalls || [];
      if (prev.team1) match.team1 = prev.team1;
      if (prev.team2) match.team2 = prev.team2;
      if (prev.innings1) match.innings1 = prev.innings1;
      if (prev.innings2) match.innings2 = prev.innings2;
      match.crr = prev.crr || "0.00";
      match.rrr = prev.rrr || "0.00";
      match.currentStatusText = prev.currentStatusText || "";
      if (Array.isArray(prev.commentary)) match.commentary = prev.commentary;

      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: "Last ball undone successfully",
        match,
      });
    }

    // ── ACTION: SELECT CREASE PLAYER (Dropdown Selection) ──
    if (action === "SELECT_CREASE_PLAYER") {
      const pName = (playerName || "").trim();
      if (!pName) {
        return res.status(400).json({ success: false, message: "Player name required" });
      }

      if (role === "striker") {
        match.striker.name = pName;
        const existingBat = activeInnings.batsmen?.find(
          (b) => b.playerName?.toLowerCase() === pName.toLowerCase()
        );
        if (existingBat) {
          match.striker.runs = existingBat.runs;
          match.striker.balls = existingBat.balls;
          match.striker.fours = existingBat.fours;
          match.striker.sixes = existingBat.sixes;
          match.striker.strikeRate = existingBat.strikeRate;
        } else {
          match.striker.runs = 0;
          match.striker.balls = 0;
          match.striker.fours = 0;
          match.striker.sixes = 0;
          match.striker.strikeRate = 0;
        }
      } else if (role === "nonStriker") {
        match.nonStriker.name = pName;
        const existingBat = activeInnings.batsmen?.find(
          (b) => b.playerName?.toLowerCase() === pName.toLowerCase()
        );
        if (existingBat) {
          match.nonStriker.runs = existingBat.runs;
          match.nonStriker.balls = existingBat.balls;
          match.nonStriker.fours = existingBat.fours;
          match.nonStriker.sixes = existingBat.sixes;
          match.nonStriker.strikeRate = existingBat.strikeRate;
        } else {
          match.nonStriker.runs = 0;
          match.nonStriker.balls = 0;
          match.nonStriker.fours = 0;
          match.nonStriker.sixes = 0;
          match.nonStriker.strikeRate = 0;
        }
      } else if (role === "bowler") {
        match.currentBowler.name = pName;
        const existingBw = activeInnings.bowlers?.find(
          (b) => b.bowlerName?.toLowerCase() === pName.toLowerCase()
        );
        if (existingBw) {
          match.currentBowler.overs = existingBw.overs;
          match.currentBowler.maidens = existingBw.maidens;
          match.currentBowler.runsConceded = existingBw.runsConceded;
          match.currentBowler.wickets = existingBw.wickets;
          match.currentBowler.economy = existingBw.economy;
        } else {
          match.currentBowler.overs = 0;
          match.currentBowler.maidens = 0;
          match.currentBowler.runsConceded = 0;
          match.currentBowler.wickets = 0;
          match.currentBowler.economy = 0;
        }
      }

      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `${role} changed to ${pName}`,
        match,
      });
    }

    // ── ACTION: SWAP STRIKE ──
    if (action === "SWAP_STRIKE") {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Strike swapped: ${match.striker?.name || "Striker"} is now on strike`,
        match,
      });
    }

    // ── ACTION: NEW OVER / SELECT BOWLER ──
    if (action === "NEW_OVER") {
      match.currentOverBalls = [];
      if (req.body?.rotateStrike) {
        const temp = match.striker;
        match.striker = match.nonStriker;
        match.nonStriker = temp;
      }
      if (bowlerName && bowlerName.trim()) {
        const bName = bowlerName.trim();
        match.currentBowler.name = bName;
        const existingBw = activeInnings.bowlers?.find(
          (b) => b.bowlerName?.toLowerCase() === bName.toLowerCase()
        );
        if (existingBw) {
          match.currentBowler.overs = existingBw.overs;
          match.currentBowler.maidens = existingBw.maidens;
          match.currentBowler.runsConceded = existingBw.runsConceded;
          match.currentBowler.wickets = existingBw.wickets;
          match.currentBowler.economy = existingBw.economy;
        } else {
          match.currentBowler.overs = 0;
          match.currentBowler.maidens = 0;
          match.currentBowler.runsConceded = 0;
          match.currentBowler.wickets = 0;
          match.currentBowler.economy = 0;
        }
      }
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `New over started with bowler ${match.currentBowler.name || "Bowler"}`,
        match,
      });
    }

    // ── ACTION: CLEAR OVER ──
    if (action === "CLEAR_OVER") {
      match.currentOverBalls = [];
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: "Current over balls reset",
        match,
      });
    }

    // ── SAVE SNAPSHOT BEFORE RECORDING DELIVERY (FOR UNDO) ──
    const snapshot = {
      striker: JSON.parse(JSON.stringify(match.striker || {})),
      nonStriker: JSON.parse(JSON.stringify(match.nonStriker || {})),
      currentBowler: JSON.parse(JSON.stringify(match.currentBowler || {})),
      currentOverBalls: [...(match.currentOverBalls || [])],
      recentBalls: [...(match.recentBalls || [])],
      team1: JSON.parse(JSON.stringify(match.team1 || {})),
      team2: JSON.parse(JSON.stringify(match.team2 || {})),
      innings1: JSON.parse(JSON.stringify(match.innings1 || {})),
      innings2: JSON.parse(JSON.stringify(match.innings2 || {})),
      crr: match.crr,
      rrr: match.rrr,
      currentStatusText: match.currentStatusText,
      commentary: match.commentary ? JSON.parse(JSON.stringify(match.commentary.slice(0, 15))) : [],
    };
    if (!match.history) match.history = [];
    match.history.push(snapshot);
    if (match.history.length > 20) match.history.shift();

    // ── SCOREBOARD CONTROLS (MakeTheBoard Reference Actions) ──

    // 1. ADJUST_RUNS (+1, +2, +3, +4, +6 / -1, -2, -3, -4, -6)
    if (action === "ADJUST_RUNS") {
      const delta = Number(req.body.runs) || 0;
      const targetTeamKey = req.body.team || match.battingTeam;
      const isTeam1 = targetTeamKey === "team1";
      const teamInningsKey =
        (isTeam1 && match.battingTeam === "team1") || (!isTeam1 && match.battingTeam === "team2")
          ? inningsKey
          : match.currentInnings === 2
          ? "innings1"
          : "innings2";

      const targetInn = match[teamInningsKey] || {};
      targetInn.totalRuns = Math.max(0, (targetInn.totalRuns || 0) + delta);

      if (targetTeamKey === match.battingTeam) {
        match.striker.runs = Math.max(0, (match.striker.runs || 0) + delta);
        if (match.striker.balls > 0) {
          match.striker.strikeRate = Number(((match.striker.runs / match.striker.balls) * 100).toFixed(1));
        }
        match.currentBowler.runsConceded = Math.max(0, (match.currentBowler.runsConceded || 0) + delta);
        const bBalls = oversToTotalBalls(match.currentBowler.overs);
        if (bBalls > 0) {
          match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bBalls) * 6).toFixed(2));
        }
      }

      targetInn.score = `${targetInn.totalRuns}/${targetInn.wickets || 0} (${targetInn.overs || 0} ov)`;
      if (isTeam1) {
        match.team1.score = targetInn.score;
      } else {
        match.team2.score = targetInn.score;
      }

      const totalB = oversToTotalBalls(activeInnings.overs);
      if (totalB > 0) {
        match.crr = ((activeInnings.totalRuns / totalB) * 6).toFixed(2);
      }
      if (match.target > 0 && match.currentInnings === 2) {
        const runsNeeded = match.target - activeInnings.totalRuns;
        const maxBalls = match.matchFormat === "T20" ? 120 : match.matchFormat === "ODI" ? 300 : 120;
        const ballsRemaining = Math.max(1, maxBalls - totalB);
        match.rrr = runsNeeded > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : "0.00";
      }

      match[teamInningsKey] = targetInn;
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Runs adjusted (${delta > 0 ? "+" + delta : delta})`,
        match,
      });
    }

    // 2. ADJUST_BALL (Balls This Over: +1 / -1)
    if (action === "ADJUST_BALL") {
      const delta = Number(req.body.delta) || 1;
      if (delta > 0) {
        activeInnings.overs = addLegalBallToOvers(activeInnings.overs);
        match.currentBowler.overs = addLegalBallToOvers(match.currentBowler.overs);
        match.striker.balls = (match.striker.balls || 0) + 1;
        if (!match.currentOverBalls) match.currentOverBalls = [];
        match.currentOverBalls.push("•");
        if (!match.recentBalls) match.recentBalls = [];
        match.recentBalls.push("•");
      } else {
        const curBalls = oversToTotalBalls(activeInnings.overs);
        if (curBalls > 0) {
          const newBalls = curBalls - 1;
          const o = Math.floor(newBalls / 6);
          const b = newBalls % 6;
          activeInnings.overs = Number(`${o}.${b}`);
          const bwBalls = Math.max(0, oversToTotalBalls(match.currentBowler.overs) - 1);
          match.currentBowler.overs = Number(`${Math.floor(bwBalls / 6)}.${bwBalls % 6}`);
          match.striker.balls = Math.max(0, (match.striker.balls || 0) - 1);
          if (match.currentOverBalls && match.currentOverBalls.length > 0) match.currentOverBalls.pop();
          if (match.recentBalls && match.recentBalls.length > 0) match.recentBalls.pop();
        }
      }

      activeInnings.score = `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.overs} ov)`;
      if (match.battingTeam === "team1") match.team1.score = activeInnings.score;
      else match.team2.score = activeInnings.score;

      const bwBallsTotal = oversToTotalBalls(match.currentBowler.overs);
      if (bwBallsTotal > 0) {
        match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bwBallsTotal) * 6).toFixed(2));
      }
      const totalB = oversToTotalBalls(activeInnings.overs);
      if (totalB > 0) match.crr = ((activeInnings.totalRuns / totalB) * 6).toFixed(2);

      match[inningsKey] = activeInnings;
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Balls adjusted (${delta > 0 ? "+1" : "-1"})`,
        match,
      });
    }

    // 3. ADJUST_WICKET (Wickets: +1 / -1)
    if (action === "ADJUST_WICKET") {
      const delta = Number(req.body.delta) || 1;
      activeInnings.wickets = Math.max(0, Math.min(10, (activeInnings.wickets || 0) + delta));
      match.currentBowler.wickets = Math.max(0, (match.currentBowler.wickets || 0) + delta);

      activeInnings.score = `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.overs} ov)`;
      if (match.battingTeam === "team1") match.team1.score = activeInnings.score;
      else match.team2.score = activeInnings.score;

      match[inningsKey] = activeInnings;
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Wickets adjusted (${delta > 0 ? "+1" : "-1"})`,
        match,
      });
    }

    // 4. ADJUST_OVER (Over: +1 / -1)
    if (action === "ADJUST_OVER") {
      const delta = Number(req.body.delta) || 1;
      const curBalls = oversToTotalBalls(activeInnings.overs);
      const newBalls = Math.max(0, curBalls + delta * 6);
      const o = Math.floor(newBalls / 6);
      const b = newBalls % 6;
      activeInnings.overs = Number(`${o}.${b}`);
      match.currentOverBalls = [];

      activeInnings.score = `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.overs} ov)`;
      if (match.battingTeam === "team1") match.team1.score = activeInnings.score;
      else match.team2.score = activeInnings.score;

      match[inningsKey] = activeInnings;
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Over adjusted (${delta > 0 ? "+1 Over" : "-1 Over"})`,
        match,
      });
    }

    // 5. SWITCH_INNINGS (1st Innings / 2nd Innings)
    if (action === "SWITCH_INNINGS") {
      const targetInn = Number(req.body.innings) || (match.currentInnings === 1 ? 2 : 1);
      match.currentInnings = targetInn;
      if (targetInn === 2) {
        match.battingTeam = match.battingTeam === "team1" ? "team2" : "team1";
        match.bowlingTeam = match.battingTeam === "team1" ? "team2" : "team1";
        match.target = (match.innings1?.totalRuns || 0) + 1;
      } else {
        match.battingTeam = "team1";
        match.bowlingTeam = "team2";
      }
      match.currentOverBalls = [];
      match.markModified("team1");
    match.markModified("team2");
    await match.save();
      return res.status(200).json({
        success: true,
        message: `Switched to Innings ${targetInn}`,
        match,
      });
    }

    // Helper: update or add batsman in innings scorecard
    const updateBatsmanCard = (name, addRuns, addBalls, add4, add6, isOut = false, dismissal = "") => {
      if (!name) return;
      if (!activeInnings.batsmen) activeInnings.batsmen = [];
      let bCard = activeInnings.batsmen.find((b) => b.playerName?.toLowerCase() === name.toLowerCase());
      if (!bCard) {
        bCard = {
          playerName: name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          dismissalText: "not out",
          isOut: false,
        };
        activeInnings.batsmen.push(bCard);
      }
      bCard.runs += addRuns;
      bCard.balls += addBalls;
      bCard.fours += add4;
      bCard.sixes += add6;
      if (bCard.balls > 0) {
        bCard.strikeRate = Number(((bCard.runs / bCard.balls) * 100).toFixed(1));
      }
      if (isOut) {
        bCard.isOut = true;
        bCard.dismissalText = dismissal || "out";
      }
    };

    // Helper: update or add bowler in innings scorecard
    const updateBowlerCard = (name, addLegalBall, addMaiden, addRuns, addWickets) => {
      if (!name) return;
      if (!activeInnings.bowlers) activeInnings.bowlers = [];
      let bwCard = activeInnings.bowlers.find((b) => b.bowlerName?.toLowerCase() === name.toLowerCase());
      if (!bwCard) {
        bwCard = {
          bowlerName: name,
          overs: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          economy: 0,
        };
        activeInnings.bowlers.push(bwCard);
      }
      if (addLegalBall) {
        bwCard.overs = addLegalBallToOvers(bwCard.overs);
      }
      bwCard.maidens += addMaiden;
      bwCard.runsConceded += addRuns;
      bwCard.wickets += addWickets;
      const bTotalBalls = oversToTotalBalls(bwCard.overs);
      if (bTotalBalls > 0) {
        bwCard.economy = Number(((bwCard.runsConceded / bTotalBalls) * 6).toFixed(2));
      }
    };

    let ballBadge = "";
    let autoComment = "";
    let isBoundary = false;
    let boundaryType = "none";
    let isWicket = false;
    let isLegalBall = true;

    // ── 1. ACTION: RUN (0, 1, 2, 3, 4, 6) ──
    if (action === "RUN") {
      isLegalBall = true;
      ballBadge = String(numRuns);

      // Batsman on crease
      match.striker.runs = (match.striker.runs || 0) + numRuns;
      match.striker.balls = (match.striker.balls || 0) + 1;
      if (numRuns === 4) {
        match.striker.fours = (match.striker.fours || 0) + 1;
        isBoundary = true;
        boundaryType = "4";
        ballBadge = "4";
      } else if (numRuns === 6) {
        match.striker.sixes = (match.striker.sixes || 0) + 1;
        isBoundary = true;
        boundaryType = "6";
        ballBadge = "6";
      }
      if (match.striker.balls > 0) {
        match.striker.strikeRate = Number(((match.striker.runs / match.striker.balls) * 100).toFixed(1));
      }

      // Bowler on crease (Legal ball -> overs increments)
      match.currentBowler.runsConceded = (match.currentBowler.runsConceded || 0) + numRuns;
      match.currentBowler.overs = addLegalBallToOvers(match.currentBowler.overs);
      const bBalls = oversToTotalBalls(match.currentBowler.overs);
      if (bBalls > 0) {
        match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bBalls) * 6).toFixed(2));
      }

      // Team & Innings total
      activeInnings.totalRuns = (activeInnings.totalRuns || 0) + numRuns;
      activeInnings.overs = addLegalBallToOvers(activeInnings.overs);

      // Update full scorecard
      updateBatsmanCard(
        match.striker.name,
        numRuns,
        1,
        numRuns === 4 ? 1 : 0,
        numRuns === 6 ? 1 : 0
      );
      updateBowlerCard(match.currentBowler.name, true, 0, numRuns, 0);

      autoComment =
        numRuns === 6
          ? `${match.currentBowler.name || "Bowler"} to ${match.striker.name || "Striker"}, SIX! What a massive strike over the boundary!`
          : numRuns === 4
          ? `${match.currentBowler.name || "Bowler"} to ${match.striker.name || "Striker"}, FOUR! Driven crisply through the gap!`
          : numRuns === 0
          ? `${match.currentBowler.name || "Bowler"} to ${match.striker.name || "Striker"}, dot ball. Defended cleanly.`
          : `${match.currentBowler.name || "Bowler"} to ${match.striker.name || "Striker"}, ${numRuns} run${numRuns > 1 ? "s" : ""}.`;
    }

    // ── 2. ACTION: EXTRAS (WIDE, NO_BALL, BYE, LEG_BYE) ──
    else if (action === "EXTRA") {
      const type = (extraType || "WIDE").toUpperCase();
      const extraRuns = numRuns > 0 ? numRuns : 1;

      if (!activeInnings.extras) {
        activeInnings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 };
      }

      // WIDE: NOT a legal ball. Overs do NOT increment. Batsman balls do NOT increment.
      if (type === "WIDE") {
        isLegalBall = false;
        ballBadge = extraRuns > 1 ? `${extraRuns}wd` : "Wd";
        activeInnings.extras.wides = (activeInnings.extras.wides || 0) + extraRuns;
        activeInnings.extras.total = (activeInnings.extras.total || 0) + extraRuns;
        activeInnings.totalRuns = (activeInnings.totalRuns || 0) + extraRuns;

        // Bowler charged with runs, but NO legal ball added
        match.currentBowler.runsConceded = (match.currentBowler.runsConceded || 0) + extraRuns;
        const bBalls = oversToTotalBalls(match.currentBowler.overs);
        if (bBalls > 0) {
          match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bBalls) * 6).toFixed(2));
        }
        updateBowlerCard(match.currentBowler.name, false, 0, extraRuns, 0);
        autoComment = `${match.currentBowler.name || "Bowler"} delivers a WIDE ball (+${extraRuns} run). Not counted in over.`;
      }
      // NO BALL: NOT a legal ball. Overs do NOT increment.
      else if (type === "NO_BALL") {
        isLegalBall = false;
        ballBadge = extraRuns > 1 ? `${extraRuns}nb` : "Nb";
        activeInnings.extras.noBalls = (activeInnings.extras.noBalls || 0) + extraRuns;
        activeInnings.extras.total = (activeInnings.extras.total || 0) + extraRuns;
        activeInnings.totalRuns = (activeInnings.totalRuns || 0) + extraRuns;

        // Bowler charged with runs, but NO legal ball added
        match.currentBowler.runsConceded = (match.currentBowler.runsConceded || 0) + extraRuns;
        const bBalls = oversToTotalBalls(match.currentBowler.overs);
        if (bBalls > 0) {
          match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bBalls) * 6).toFixed(2));
        }
        updateBowlerCard(match.currentBowler.name, false, 0, extraRuns, 0);
        autoComment = `${match.currentBowler.name || "Bowler"} oversteps! NO BALL called! (+${extraRuns} run, Free Hit next). Not counted in over.`;
      }
      // BYE: IS a legal ball. Overs increment. Batsman balls increment. Bowler runs do NOT increment.
      else if (type === "BYE" || type === "LEG_BYE") {
        isLegalBall = true;
        ballBadge = type === "BYE" ? `${extraRuns}b` : `${extraRuns}lb`;
        if (type === "BYE") activeInnings.extras.byes = (activeInnings.extras.byes || 0) + extraRuns;
        else activeInnings.extras.legByes = (activeInnings.extras.legByes || 0) + extraRuns;
        activeInnings.extras.total = (activeInnings.extras.total || 0) + extraRuns;
        activeInnings.totalRuns = (activeInnings.totalRuns || 0) + extraRuns;

        // Striker ball faced increments, runs do not
        match.striker.balls = (match.striker.balls || 0) + 1;
        updateBatsmanCard(match.striker.name, 0, 1, 0, 0);

        // Bowler overs increments, runs conceded do not count against bowler for byes
        match.currentBowler.overs = addLegalBallToOvers(match.currentBowler.overs);
        activeInnings.overs = addLegalBallToOvers(activeInnings.overs);
        updateBowlerCard(match.currentBowler.name, true, 0, 0, 0);
        autoComment = `${extraRuns} ${type === "BYE" ? "Bye" : "Leg Bye"} taken off ${match.currentBowler.name || "Bowler"}'s delivery.`;
      }
    }

    // ── 3. ACTION: WICKET / OUT ──
    else if (action === "WICKET") {
      isLegalBall = true;
      isWicket = true;
      ballBadge = "W";

      const outBat = dismissedPlayer?.trim() || match.striker?.name || "Batsman";
      const isStrikerOut = outBat.toLowerCase() === (match.striker?.name || "").toLowerCase();

      // Batsman who is out faces 1 ball
      if (isStrikerOut) {
        match.striker.balls = (match.striker.balls || 0) + 1;
      }

      // Increment wickets & overs
      activeInnings.wickets = (activeInnings.wickets || 0) + 1;
      activeInnings.overs = addLegalBallToOvers(activeInnings.overs);

      // Bowler stats
      const isBowlerWicket = !["runout", "retired_hurt"].includes(wicketType?.toLowerCase());
      if (isBowlerWicket) {
        match.currentBowler.wickets = (match.currentBowler.wickets || 0) + 1;
      }
      match.currentBowler.overs = addLegalBallToOvers(match.currentBowler.overs);
      const bBalls = oversToTotalBalls(match.currentBowler.overs);
      if (bBalls > 0) {
        match.currentBowler.economy = Number(((match.currentBowler.runsConceded / bBalls) * 6).toFixed(2));
      }

      // Detailed dismissal formatting
      let dismissalDetail = "out";
      const bName = match.currentBowler?.name || "Bowler";
      const fName = fielder ? fielder.trim() : "";

      if (wicketType === "bowled") dismissalDetail = `b ${bName}`;
      else if (wicketType === "caught") dismissalDetail = fName ? `c ${fName} b ${bName}` : `c & b ${bName}`;
      else if (wicketType === "caught_behind") dismissalDetail = fName ? `c †${fName} b ${bName}` : `c †Keeper b ${bName}`;
      else if (wicketType === "caught_bowled") dismissalDetail = `c & b ${bName}`;
      else if (wicketType === "lbw") dismissalDetail = `lbw b ${bName}`;
      else if (wicketType === "runout") dismissalDetail = fName ? `run out (${fName})` : "run out";
      else if (wicketType === "stumped") dismissalDetail = fName ? `st †${fName} b ${bName}` : `st †Keeper b ${bName}`;
      else if (wicketType === "hit_wicket") dismissalDetail = `hit wicket b ${bName}`;
      else if (wicketType === "retired_hurt") dismissalDetail = "retired hurt";

      // Update batsman scorecard as OUT
      updateBatsmanCard(outBat, 0, 1, 0, 0, true, dismissalDetail);
      updateBowlerCard(match.currentBowler.name, true, 0, 0, isBowlerWicket ? 1 : 0);

      // Fall of Wicket record
      if (!activeInnings.fow) activeInnings.fow = [];
      activeInnings.fow.push({
        wicketNumber: activeInnings.wickets,
        score: `${activeInnings.totalRuns}/${activeInnings.wickets}`,
        over: String(activeInnings.overs),
        playerName: outBat,
      });

      autoComment = `WICKET! ${outBat} ${dismissalDetail}. ${activeBattingTeam.name || "Batting team"} ${activeInnings.totalRuns}/${activeInnings.wickets} in ${activeInnings.overs} ov.`;

      // Replace the dismissed player on crease with new incoming player!
      if (isStrikerOut) {
        match.striker = {
          name: newPlayer?.trim() || "",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
        };
      } else {
        match.nonStriker = {
          name: newPlayer?.trim() || "",
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
        };
      }
    }

    // ── Update ball lists ──
    if (ballBadge) {
      if (!match.currentOverBalls) match.currentOverBalls = [];
      match.currentOverBalls.push(ballBadge);

      if (!match.recentBalls) match.recentBalls = [];
      match.recentBalls.push(ballBadge);
      if (match.recentBalls.length > 24) match.recentBalls.shift();
    }

    // ── Recalculate Run Rates ──
    const totalBallsBowled = oversToTotalBalls(activeInnings.overs);
    if (totalBallsBowled > 0) {
      match.crr = ((activeInnings.totalRuns / totalBallsBowled) * 6).toFixed(2);
    }
    if (match.target > 0 && match.currentInnings === 2) {
      const runsNeeded = match.target - activeInnings.totalRuns;
      const maxBalls = match.matchFormat === "T20" ? 120 : match.matchFormat === "ODI" ? 300 : 120;
      const ballsRemaining = Math.max(1, maxBalls - totalBallsBowled);
      if (runsNeeded > 0) {
        match.rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
      } else {
        match.rrr = "0.00";
      }
    }

    // ── Update Active Team Live Score String ──
    activeInnings.score = `${activeInnings.totalRuns}/${activeInnings.wickets} (${activeInnings.overs} ov)`;
    if (match.battingTeam === "team1") {
      match.team1.score = activeInnings.score;
    } else {
      match.team2.score = activeInnings.score;
    }

    // ── Auto Swap Striker on odd runs (1 or 3) ──
    if (
      (action === "RUN" && (numRuns === 1 || numRuns === 3)) ||
      (action === "EXTRA" && (extraType === "BYE" || extraType === "LEG_BYE") && (numRuns === 1 || numRuns === 3))
    ) {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
    }

    // ── Check End of Over (Exactly 6 legal balls) ──
    let overCompleted = false;
    const legalBallsInCurrentOver = match.currentOverBalls.filter(
      (b) => !b.toLowerCase().includes("wd") && !b.toLowerCase().includes("nb")
    ).length;

    if (legalBallsInCurrentOver >= 6) {
      overCompleted = true;
      // Auto strike rotation at over completion
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
      autoComment += ` | End of Over ${activeInnings.overs} (${activeBattingTeam.shortName || activeBattingTeam.name}: ${activeInnings.score}).`;
    }

    // ── Add Commentary Entry ──
    const commentText = commentaryText?.trim() || autoComment;
    if (commentText) {
      if (!match.commentary) match.commentary = [];
      match.commentary.unshift({
        over: String(activeInnings.overs),
        ball: legalBallsInCurrentOver || 1,
        text: commentText,
        runs: numRuns,
        isBoundary,
        boundaryType,
        isWicket,
        timestamp: new Date(),
      });
      if (match.commentary.length > 50) {
        match.commentary.pop();
      }
    }

    match.currentStatusText = autoComment;
    match[inningsKey] = activeInnings;
    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: `Ball recorded: ${ballBadge}`,
      ballBadge,
      overCompleted,
      legalBallsInCurrentOver,
      match,
    });
  } catch (error) {
    console.error("Admin recordBallAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record ball action",
    });
  }
};

/**
 * Add custom commentary update
 * POST /api/admin/live-matches/:id/commentary
 */
exports.addCommentary = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, over = "", runs = 0, isBoundary = false, isWicket = false } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Commentary text is required" });
    }

    const match = await LiveMatch.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    if (!match.commentary) match.commentary = [];
    match.commentary.unshift({
      over: over.trim(),
      ball: 0,
      text: text.trim(),
      runs: Number(runs) || 0,
      isBoundary: Boolean(isBoundary),
      boundaryType: runs === 4 ? "4" : runs === 6 ? "6" : "none",
      isWicket: Boolean(isWicket),
      timestamp: new Date(),
    });

    if (match.commentary.length > 50) match.commentary.pop();
    match.currentStatusText = text.trim();

    match.markModified("team1");
    match.markModified("team2");
    await match.save();

    return res.status(200).json({
      success: true,
      message: "Commentary added successfully",
      commentary: match.commentary,
    });
  } catch (error) {
    console.error("Admin addCommentary error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add commentary",
    });
  }
};

/**
 * Delete a match
 */
exports.deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match ID",
      });
    }

    const match = await LiveMatch.findByIdAndDelete(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    console.error("Admin deleteMatch error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete match",
    });
  }
};
