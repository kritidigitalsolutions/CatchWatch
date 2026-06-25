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
  addTvShow,
  getAllTvShows,
  getTvShowById,
  updateTvShow,
  deleteTvShow,
  searchTvShow,
} = require(
  "../../controllers/admin/tvShow.controller"
);


// ========================================
// MULTER FIELDS
// ========================================
const showUpload =
  upload.fields([
    {
      name: "poster",
      maxCount: 1,
    },
    {
      name: "banner",
      maxCount: 1,
    },
    {
      name: "trailer",
      maxCount: 1,
    },

    {
      name: "castImage_0",
      maxCount: 1,
    },
    {
      name: "castImage_1",
      maxCount: 1,
    },
    {
      name: "castImage_2",
      maxCount: 1,
    },
    {
      name: "castImage_3",
      maxCount: 1,
    },
    {
      name: "castImage_4",
      maxCount: 1,
    },
  ]);


// ========================================
// ROUTES
// ========================================

// ADD
router.post(
  "/add",
  isAdmin,
  showUpload,
  addTvShow
);


// GET ALL
router.get(
  "/",isAdmin,
  getAllTvShows
);


// SEARCH
router.get(
  "/search",isAdmin,
  searchTvShow
);


// GET SINGLE
router.get(
  "/:id",isAdmin,
  getTvShowById
);


// UPDATE
router.patch(
  "/:id",
  isAdmin,
  showUpload,
  updateTvShow
);


// DELETE
router.delete(
  "/:id",
  isAdmin,
  deleteTvShow
);

module.exports = router;
