const ShortFilm = require("../models/shortFilm.model");
 
// ========================================
// GET ALL SHORT FILMS
// ========================================
 
const getAllShortFilms = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
 
    const shortFilms = await ShortFilm.find({})
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
 
    const total = await ShortFilm.countDocuments({});
 
    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      shortFilms,
    });
 
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch short films",
    });
  }
};
 
// ========================================
// GET SHORT FILM BY SLUG
// ========================================
 
const getShortFilmBySlug = async (req, res) => {
  try {
    const shortFilm = await ShortFilm.findOne({
      slug: req.params.slug,
    }).lean();
 
    if (!shortFilm) {
      return res.status(404).json({
        success: false,
        message: "Short film not found",
      });
    }
 
    return res.json({
      success: true,
      shortFilm,
    });
 
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch short film",
    });
  }
};
 
// ========================================
// GET SHORT FILM BY ID
// ========================================
 
const getShortFilmById = async (req, res) => {
  try {
    const shortFilm = await ShortFilm.findOne({
      _id: req.params.id,
    }).lean();
 
    if (!shortFilm) {
      return res.status(404).json({
        success: false,
        message: "Short film not found",
      });
    }
 
    return res.json({
      success: true,
      shortFilm,
    });
 
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch short film",
    });
  }
};
 
module.exports = {
  getAllShortFilms,
  getShortFilmBySlug,
  getShortFilmById,
};
