const TvShowsEpisode = require(
  "../models/tvShowsEpisode.model"
);

const TvShow = require(
  "../models/tvShow.model"
);

const fs = require("fs");
const path = require("path");

// ========================================
// GET TV SHOW EPISODES
// ========================================
const getTvShowsEpisodes =
  async (req, res) => {
    try {

      const {
        tvShowId,
      } = req.params;

      const episodes =
        await TvShowsEpisode.find({
          tvShowId,
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch episodes",
      });
    }
  };


// ========================================
// SEARCH TV SHOW EPISODES
// ========================================
const searchTvShowsEpisodes =
  async (req, res) => {
    try {

      const {
        tvShowId,
      } = req.params;

      const { q } = req.query;

      const episodes =
        await TvShowsEpisode.find({

          tvShowId,

          title: {
            $regex: q || "",
            $options: "i",
          },
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        results: episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  getTvShowsEpisodes,
  searchTvShowsEpisodes,
};
