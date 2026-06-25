const express = require("express");

const router = express.Router();

const upload = require(
  "../../middlewares/upload.middleware"
);

const {
  isAdmin,
} = require(
  "../../middlewares/admin.middleware"
);

const {
  addTvShowsEpisode,
  getTvShowsEpisodes,
  updateTvShowsEpisode,
  deleteTvShowsEpisode,
  searchTvShowsEpisodes,
} = require(
  "../../controllers/admin/tvShowsEpisode.controller"
);


// ========================================
// MULTER
// ========================================
const episodeUpload =
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]);


// ========================================
// ADD EPISODE
// ========================================
router.post("/:tvShowId/add", isAdmin, episodeUpload, addTvShowsEpisode);


// ========================================
// GET ALL EPISODES
// ========================================
router.get("/:tvShowId", isAdmin, getTvShowsEpisodes);


// ========================================
// SEARCH EPISODES
// ========================================
router.get("/search", isAdmin, searchTvShowsEpisodes);


// ========================================
// UPDATE EPISODE
// ========================================
router.patch("/:id", isAdmin, episodeUpload, updateTvShowsEpisode);


// ========================================
// DELETE EPISODE
// ========================================
router.delete("/:id", isAdmin, deleteTvShowsEpisode);


module.exports = router;
