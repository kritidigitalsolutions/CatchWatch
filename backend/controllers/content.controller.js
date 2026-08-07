// const Movie = require("../models/movie.model");
// const Series = require("../models/series.model");


// // ========================================
// // GET HOME CONTENT (COMBINED)
// // ========================================
// const getHomeContent = async (req, res) => {
//   try {
//     // Fetch active movies and series
//     const movies = await Movie.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();
//     const series = await Series.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();

//     const [
//   moviesCount,
//   seriesCount,
//   seriesData
// ] = await Promise.all([
//   Movie.countDocuments(),
//   Series.countDocuments(),
//   Series.find({}, "totalEpisodes").lean()
// ]);
//     const episodesCount = seriesData.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);

//     // Format and add flags
//     const formattedMovies = movies.map((m) => ({
//       ...m,
//       type: "movie",
//       isTrending: m.category?.includes("trending") || false
//     }));

//     const formattedSeries = series.map((s) => ({
//       ...s,
//       type: "series",
//       isTrending: s.category?.includes("trending") || false
//     }));

//     // Combine and sort by priority, then date
//     const content = [...formattedMovies, ...formattedSeries].sort(
//       (a, b) => {
//       const priorityDiff =(b.priority || 0)-(a.priority || 0);
//         if (priorityDiff !== 0) return priorityDiff;
//         return new Date(b.createdAt) - new Date(a.createdAt);
//       }
//     );

//     return res.json({
//       success: true,
//       moviesCount,
//       seriesCount,
//       episodesCount,
//       content
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };




// // ========================================
// // SEARCH CONTENT
// // ========================================
// const searchContent = async (req, res) => {
//   try {
//     const { query } = req.query;
//     if (!query) return res.status(400).json({ success: false, message: "Search query is required" });

//     const movies = await Movie.find(
//   {
//     $text: {
//       $search: query
//     }
//   },
//   {
//     score: {
//       $meta: "textScore"
//     }
//   }
// )
// .select({
//   score: {
//     $meta: "textScore"
//   }
// })
// .sort({
//   score: {
//     $meta: "textScore"
//   }
// })
// .lean();


// const series = await Series.find(
//   {
//     $text: {
//       $search: query
//     }
//   },
//   {
//     score: {
//       $meta: "textScore"
//     }
//   }
// )
// .select({
//   score: {
//     $meta: "textScore"
//   }
// })
// .sort({
//   score: {
//     $meta: "textScore"
//   }
// })
// .lean();

//     const results = [
//   ...movies.map(m => ({
//     ...m,
//     type: "movie"
//   })),
//   ...series.map(s => ({
//     ...s,
//     type: "series"
//   }))
// ].sort(
//   (a, b) =>
//     (b.score || 0) -
//     (a.score || 0)
// );



//     return res.json({
//       success: true,
//       results
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// module.exports = {
//   getHomeContent,
//   searchContent
// };
const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const ShortFilm = require("../models/shortFilm.model");
const TvShow = require("../models/tvShow.model");
const Reel = require("../models/reel.model");
const User = require("../models/user.model");

// ========================================
// GET HOME CONTENT (COMBINED)
// ========================================
const getHomeContent = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();
    const series = await Series.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();
    const shortFilms = await ShortFilm.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();
    const tvShows = await TvShow.find().sort({ priority: -1, createdAt: -1 }).limit(20).lean();

    const [
      moviesCount,
      seriesCount,
      shortFilmsCount,
      tvShowsCount,
      seriesData
    ] = await Promise.all([
      Movie.countDocuments(),
      Series.countDocuments(),
      ShortFilm.countDocuments(),
      TvShow.countDocuments(),
      Series.find({}, "totalEpisodes").lean()
    ]);
    const episodesCount = seriesData.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);

    // Format and add flags
    const formattedMovies = movies.map((m) => ({
      ...m,
      type: "movie",
      isTrending: m.category?.includes("trending") || false
    }));

    const formattedSeries = series.map((s) => ({
      ...s,
      type: "series",
      isTrending: s.category?.includes("trending") || false
    }));

    // Combine and sort by priority, then date
    const content = [...formattedMovies, ...formattedSeries].sort(
      (a, b) => {
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    );

    return res.json({
      success: true,
      moviesCount,
      seriesCount,
      shortFilmsCount,
      tvShowsCount,
      episodesCount,
      content
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// SEARCH CONTENT (LETTER-BY-LETTER CASE-INSENSITIVE REGEX)
// ========================================
const searchContent = async (req, res) => {
  try {
    const { query, search, q } = req.query;
    const searchTerm = (query || search || q || "").trim();

    if (!searchTerm) {
      return res.json({
        success: true,
        results: []
      });
    }

    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

    // Parallel search across Movies, Series, ShortFilms, TvShows, and Users
    const [movies, series, shortFilms, tvShows, matchingUsers] = await Promise.all([
      Movie.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { cast: searchRegex }
        ]
      }).lean(),

      Series.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { cast: searchRegex }
        ]
      }).lean(),

      ShortFilm.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { tags: searchRegex }
        ]
      }).lean(),

      TvShow.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { tags: searchRegex }
        ]
      }).lean(),

      User.find({
        $or: [
          { name: searchRegex },
          { username: searchRegex }
        ]
      }).select("_id").lean()
    ]);

    const matchingUserIds = matchingUsers.map((u) => u._id);

    const reels = await Reel.find({
      status: "ACTIVE",
      $or: [
        { caption: searchRegex },
        { hashtags: searchRegex },
        { user: { $in: matchingUserIds } }
      ]
    })
      .populate("user", "name username profileImage bio verification isVerified")
      .lean();

    const results = [
      ...movies.map((m) => ({
        ...m,
        type: m.type || "movie"
      })),
      ...series.map((s) => ({
        ...s,
        type: s.type || "series"
      })),
      ...shortFilms.map((sf) => ({
        ...sf,
        type: sf.type || "short"
      })),
      ...tvShows.map((tv) => ({
        ...tv,
        type: tv.type || "tv"
      })),
      ...reels.map((r) => ({
        ...r,
        title: r.caption || "Reel Short",
        type: "reel",
        poster: r.thumbnailUrl || r.thumbnail || "",
        banner: r.thumbnailUrl || r.thumbnail || ""
      }))
    ];

    // ── HIGHER SEARCH RANKING FOR VERIFIED CREATORS ──
    results.sort((a, b) => {
      const aVerified =
        a.user?.isVerified ||
        a.user?.verification?.isVerified ||
        a.user?.verification?.status === "VERIFIED" ||
        a.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      const bVerified =
        b.user?.isVerified ||
        b.user?.verification?.isVerified ||
        b.user?.verification?.status === "VERIFIED" ||
        b.user?.verification?.status === "APPROVED"
          ? 1
          : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      return 0;
    });

    return res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error("SEARCH CONTENT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHomeContent,
  searchContent
};