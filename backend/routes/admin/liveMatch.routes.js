const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const upload = require("../../middlewares/upload.middleware");
const {
  getAllMatches,
  getSingleMatch,
  createMatch,
  updateMatch,
  updateMatchStatus,
  updateMatchScore,
  deleteMatch,
  recordBallAction,
  updateMatchSquads,
  updateFullScorecard,
  addCommentary,
} = require("../../controllers/admin/liveMatch.controller");

const matchUpload = upload.fields([
  { name: "banner", maxCount: 1 },
  { name: "bannerFile", maxCount: 1 },
  { name: "team1Logo", maxCount: 1 },
  { name: "team1LogoFile", maxCount: 1 },
  { name: "logo1", maxCount: 1 },
  { name: "team2Logo", maxCount: 1 },
  { name: "team2LogoFile", maxCount: 1 },
  { name: "logo2", maxCount: 1 },
]);

const safeMatchUpload = (req, res, next) => {
  matchUpload(req, res, (err) => {
    if (err) {
      console.warn("Match upload warning (continuing with body):", err.message);
    }
    next();
  });
};

router.get("/", isAdmin, getAllMatches);
router.get("/:id", isAdmin, getSingleMatch);
router.post("/", isAdmin, safeMatchUpload, createMatch);
router.put("/:id", isAdmin, safeMatchUpload, updateMatch);
router.patch("/:id/status", isAdmin, updateMatchStatus);
router.patch("/:id/score", isAdmin, updateMatchScore);
router.delete("/:id", isAdmin, deleteMatch);

// Live Scorer & Activity Routes
router.post("/:id/record-ball", isAdmin, recordBallAction);
router.put("/:id/squads", isAdmin, updateMatchSquads);
router.put("/:id/scorecard", isAdmin, updateFullScorecard);
router.post("/:id/commentary", isAdmin, addCommentary);

module.exports = router;
