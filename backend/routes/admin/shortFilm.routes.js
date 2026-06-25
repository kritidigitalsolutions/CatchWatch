const express = require("express");

const router = express.Router();

const upload = require("../../middlewares/upload.middleware");

const validateFileSizes =
  require("../../middlewares/validateFileSizes");

const {
  isAdmin,
} = require("../../middlewares/admin.middleware");

const {
  addShortFilm,
  getAllShortFilms,
  getShortFilmById,
  updateShortFilm,
  deleteShortFilm,
  searchShortFilms,
} = require(
  "../../controllers/admin/shortFilm.controller"
);

const shortFilmUpload =
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
      name: "video",
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

router.post(
  "/add",
  isAdmin,
  shortFilmUpload,
  validateFileSizes,
  addShortFilm
);

router.patch(
  "/:id",
  isAdmin,
  shortFilmUpload,
  validateFileSizes,
  updateShortFilm
);

router.get(
  "/",
  isAdmin,
  getAllShortFilms
);

router.get(
  "/search",
  isAdmin,
  searchShortFilms
);

router.get(
  "/:id",
  isAdmin,
  getShortFilmById
);

router.delete(
  "/:id",
  isAdmin,
  deleteShortFilm
);

module.exports = router;