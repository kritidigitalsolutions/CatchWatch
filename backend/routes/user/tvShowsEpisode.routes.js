const express = require("express");

const router = express.Router();

const {
  getTvShowsEpisodes,
  searchTvShowsEpisodes,
  getEpisodeById
} = require(
  "../../controllers/tvShowsEpisode.controller"
);

// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:tvShowId", getTvShowsEpisodes);
router.get("/single/:id", getEpisodeById);

// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search", searchTvShowsEpisodes);


module.exports = router;
