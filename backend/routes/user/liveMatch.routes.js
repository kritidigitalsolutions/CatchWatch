const express = require("express");
const router = express.Router();
const {
  getActiveMatches,
  getFeaturedMatch,
  getLiveNowMatches,
  getUpcomingMatches,
  getCompletedMatches,
  getMatchDetails,
  getMatchLiveActivity,
  getMatchScorecard,
  getMatchCommentary,
  getMatchSquads,
  pingViewer,
} = require("../../controllers/liveMatch.controller");

// Match Listings
router.get("/", getActiveMatches);
router.get("/featured", getFeaturedMatch);
router.get("/live-now", getLiveNowMatches);
router.get("/upcoming", getUpcomingMatches);
router.get("/completed", getCompletedMatches);

// Single Match Details, Scorecard, Commentary, Squads & Polling
router.get("/:id", getMatchDetails);
router.get("/:id/live-activity", getMatchLiveActivity);
router.get("/:id/scorecard", getMatchScorecard);
router.get("/:id/commentary", getMatchCommentary);
router.get("/:id/squads", getMatchSquads);
router.post("/:id/view", pingViewer);

module.exports = router;
