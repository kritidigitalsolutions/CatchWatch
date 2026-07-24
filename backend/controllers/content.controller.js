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

    const normalizeMedia = (item, type) => {
      const poster = item.poster || item.banner || item.thumbnailUrl || item.thumbnail || "";
      const banner = item.banner || item.poster || item.thumbnailUrl || item.thumbnail || "";
      const thumbnailUrl = item.thumbnailUrl || item.thumbnail || item.poster || item.banner || "";
      return {
        ...item,
        poster,
        banner,
        thumbnailUrl,
        thumbnail: thumbnailUrl,
        type,
        isTrending: item.category?.includes("trending") || false
      };
    };

    const formattedMovies = movies.map((m) => normalizeMedia(m, "movie"));
    const formattedSeries = series.map((s) => normalizeMedia(s, "series"));
    const formattedShortFilms = shortFilms.map((sf) => normalizeMedia(sf, "shortFilm"));
    const formattedTvShows = tvShows.map((tv) => normalizeMedia(tv, "tvShow"));

    const content = [...formattedMovies, ...formattedSeries, ...formattedShortFilms, ...formattedTvShows].sort(
      (a, b) => {
        const pA = a.priority && Number(a.priority) > 0 ? Number(a.priority) : Infinity;
        const pB = b.priority && Number(b.priority) > 0 ? Number(b.priority) : Infinity;
        if (pA !== pB) return pA - pB;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
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
// SEARCH CONTENT (UPDATED FOR LETTER-BY-LETTER)
// ========================================
const searchContent = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: "Search query is required" });

    const movies = await Movie.find(
  {
    $text: {
      $search: query
    }
  },
  {
    score: {
      $meta: "textScore"
    }
  }
)
.select({
  score: {
    $meta: "textScore"
  }
})
.sort({
  score: {
    $meta: "textScore"
  }
})
.lean();


const series = await Series.find(
  {
    $text: {
      $search: query
    }
  },
  {
    score: {
      $meta: "textScore"
    }
  }
)
.select({
  score: {
    $meta: "textScore"
  }
})
.sort({
  score: {
    $meta: "textScore"
  }
})
.lean();

    const results = [
  ...movies.map(m => ({
    ...m,
    type: "movie"
  })),
  ...series.map(s => ({
    ...s,
    type: "series"
  }))
].sort(
  (a, b) =>
    (b.score || 0) -
    (a.score || 0)
);



    return res.json({
      success: true,
      results
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHomeContent,
  searchContent
};