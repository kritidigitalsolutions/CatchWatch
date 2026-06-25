const express = require("express");

const router = express.Router();

const {
  getTvShowsEpisodes,
  searchTvShowsEpisodes,
} = require(
  "../../controllers/tvShowsEpisode.controller"
);

// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:tvShowId", getTvShowsEpisodes);


// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search", searchTvShowsEpisodes);


module.exports = router;
