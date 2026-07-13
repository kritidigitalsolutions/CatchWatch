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

// ========================================
// GET SINGLE EPISODE BY ID
// ========================================
const getEpisodeById = async (req, res) => {
  try {
    const { id } = req.params;

    // ID se database me episode find karein
    const episode = await TvShowsEpisode.findById(id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found",
      });
    }

    return res.json({
      success: true,
      episode,
    });

  } catch (error) {
    console.error("Error fetching single episode:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching episode",
    });
  }
};

module.exports = {
  getTvShowsEpisodes,
  searchTvShowsEpisodes,
  getEpisodeById
};
