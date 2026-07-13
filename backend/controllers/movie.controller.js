const Movie = require("../models/movie.model");

// ========================================
// GET ALL MOVIES
// ========================================

// const getAllMovies = async (req, res) => {
//   try {

//     const page = Number(req.query.page) || 1;

//     const limit = Number(req.query.limit) || 10;

//     const skip = (page - 1) * limit;

//     const movies = await Movie.find({})
//       .sort({ priority: 1, createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const total = await Movie.countDocuments({});

//     return res.json({
//       success: true,
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       movies,
//     });

//   } catch (error) {

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch movies",
//     });
//   }
// };
const getAllMovies = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { category, genre, language, title } = req.query;

    // Dynamic Filter Object
    const filter = {};

    if (category) {
      filter.category = { $in: [category] };
    }

    if (genre) {
      filter.genre = { $in: [genre] };
    }

    if (language) {
      filter.language = {
        $regex: new RegExp(`^${language}$`, "i"),
      };
    }

    if (title) {
      filter.title = {
        $regex: title,
        $options: "i",
      };
    }

    const movies = await Movie.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      movies,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};
// ========================================
// GET MOVIE BY SLUG
// ========================================

const getMovieBySlug = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      slug: req.params.slug,
    }).lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
};

// ========================================
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findOne({
      _id: req.params.id,
    }).lean();

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
    });
  }
};

module.exports = {
  getAllMovies,
  getMovieBySlug,
  getMovieById,
};
