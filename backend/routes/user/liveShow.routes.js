const express = require("express");
const router = express.Router();
const {
  getActiveLiveShows,
  getFeaturedLiveShow,
  getLiveShowDetails,
  pingViewer,
} = require("../../controllers/liveShow.controller");

// Live Show Listings
router.get("/", getActiveLiveShows);
router.get("/featured", getFeaturedLiveShow);

// Single Live Show Details & Viewer Heartbeat
router.get("/:id", getLiveShowDetails);
router.post("/:id/view", pingViewer);

module.exports = router;
