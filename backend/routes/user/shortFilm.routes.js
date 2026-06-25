const express = require("express");
const router = express.Router();
const { getAllShortFilms, getShortFilmBySlug, getShortFilmById } = require("../../controllers/shortFilm.controller");
 
router.get("/", getAllShortFilms);
router.get("/slug/:slug", getShortFilmBySlug);
router.get("/id/:id", getShortFilmById);
 
module.exports = router;
