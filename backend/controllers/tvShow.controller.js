const TvShow = require(
  "../models/tvShow.model"
);

const TvShowsEpisode = require(
  "../models/tvShowsEpisode.model"
);

const fs = require("fs");
const path = require("path");


// GET ALL TV SHOWS
const getAllTvShows =
  async (req, res) => {
    try {

      const dramas =
        await TvShow.find()
          .sort({
            priority: -1,
            createdAt: -1,
          });

      return res.json({
        success: true,
        dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch TV shows",
      });
    }
  };


// GET SINGLE TV SHOW
const getTvShowById =
  async (req, res) => {
    try {

      const tvShow =
        await TvShow.findById(
          req.params.id
        );

      if (!tvShow) {
        return res.status(404).json({
          success: false,
          message:
            "TV show not found",
        });
      }

      return res.json({
        success: true,
        tvShow,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch TV show",
      });
    }
  };

// SEARCH
const searchTvShow =
  async (req, res) => {
    try {

      const { q } = req.query;

      const dramas =
        await TvShow.find({
          title: {
            $regex: q,
            $options: "i",
          },
        }).sort({
          priority: -1,
          createdAt: -1,
        });

      return res.json({
        success: true,
        results: dramas,
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  getAllTvShows,
  getTvShowById,
  searchTvShow
};
