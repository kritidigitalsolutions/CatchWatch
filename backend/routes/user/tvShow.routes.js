const express = require("express");

const router = express.Router();


const {
  getAllTvShows,
  getTvShowById,
  searchTvShow,
} = require(
  "../../controllers/tvShow.controller"
);

// ========================================
// ROUTES
// ========================================


// GET ALL
router.get(
  "/",
  getAllTvShows
);


// SEARCH
router.get(
  "/search",
  searchTvShow
);


// GET SINGLE
router.get(
  "/:id",
  getTvShowById
);


module.exports = router;
