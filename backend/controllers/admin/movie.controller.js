const Movie = require("../../models/movie.model");
const { getMediaUrl, deleteMedia, deleteMediaFiles } = require("../../utils/mediaUrl");
const { notifyNewContent } = require("../../utils/contentNotification");

// ========================================
// HELPERS
// ========================================

const parseJSON = (value, defaultValue = []) => {
  try {
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const sanitizeCast = (cast = []) => {
  if (!Array.isArray(cast)) {
    return [];
  }

  return cast
    .map((member) => ({
      name: String(member?.name || "").trim(),
      image: String(member?.image || "").trim(),
    }))
    .filter((member) => member.name || member.image)
    .map((member) => ({
      ...member,
      name: member.name || "Unknown",
    }));
};


// ========================================
// ADD MOVIE
// ========================================

const addMovie = async (req, res) => {
  try {

    const genre = parseJSON(req.body.genre);

    const category = parseJSON(req.body.category);

    const cast = parseJSON(req.body.cast);

    // ========================================
    // VALIDATION
    // ========================================

    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // ========================================
    // FILES
    // ========================================

    const poster = req.files?.poster?.[0];

    const banner = req.files?.banner?.[0];

    const trailer = req.files?.trailer?.[0];

    const video = req.files?.video?.[0];

    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles = Object.keys(req.files || {})
      .filter((key) => key.startsWith("castImage_"));

    castFiles.forEach((key) => {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image =
          getMediaUrl(file);
      }
    });

    // ========================================
    // PRIORITY ALGORITHM
    // ========================================
    const inputPriority = req.body.priority !== undefined ? Number(req.body.priority) : 0;
    let priority = 0;

    if (inputPriority > 0) {
      // Shift up all existing movies with priority >= inputPriority
      await Movie.updateMany({ priority: { $gte: inputPriority } }, { $inc: { priority: 1 } });
      priority = inputPriority;
    } else {
      // Auto-assign: maxPriority + 1
      const maxMovie = await Movie.findOne().sort("-priority");
      priority = maxMovie && maxMovie.priority ? maxMovie.priority + 1 : 1;
    }

    // ========================================
    // CREATE MOVIE
    // ========================================
console.log("MOVIE CREATE PAYLOAD");
console.log({
  title: req.body.title,
  poster: req.body.poster,
  banner: req.body.banner,
  trailerUrl: req.body.trailerUrl,
  videoUrl: req.body.videoUrl,
  cast,
  genre,
  category,
  language: req.body.language,
});
    const resolvedVideoUrl = getMediaUrl(video, req.body.videoUrl);
    const resolvedTrailerUrl = getMediaUrl(trailer, req.body.trailerUrl);
    const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
    const streamInfo = parseBunnyStreamUrl(resolvedVideoUrl) || {};

    const uploadedPoster = getMediaUrl(poster, req.body.poster || req.body.posterUrl);
    const uploadedBanner = getMediaUrl(banner, req.body.banner || req.body.bannerUrl);
    const generatedThumb = streamInfo.thumbnailUrl || req.body.thumbnailUrl || req.body.thumbnail || "";

    // Multilingual Audio Tracks & Subtitles
    const audioMetadata = parseJSON(req.body.audioMetadata, []);
    const uploadedAudioFiles = req.files?.audioTracks || [];
    const audioTracks = [];
    if (Array.isArray(audioMetadata) && audioMetadata.length > 0) {
      for (const meta of audioMetadata) {
        if (meta.fileUrl) {
          audioTracks.push({
            language: meta.language,
            fileUrl: meta.fileUrl,
            isDefault: meta.isDefault === true || meta.isDefault === "true"
          });
        } else {
          const matchingFile = uploadedAudioFiles.find(f => f.originalname === meta.originalname);
          if (matchingFile) {
            audioTracks.push({
              language: meta.language,
              fileUrl: getMediaUrl(matchingFile),
              isDefault: meta.isDefault === true || meta.isDefault === "true"
            });
          }
        }
      }
    }

    const subtitleMetadata = parseJSON(req.body.subtitleMetadata, []);
    const uploadedSubtitleFiles = req.files?.subtitles || [];
    const subtitles = [];
    if (Array.isArray(subtitleMetadata) && subtitleMetadata.length > 0) {
      for (const meta of subtitleMetadata) {
        if (meta.fileUrl) {
          subtitles.push({
            language: meta.language,
            label: meta.label || meta.language || "Subtitle",
            fileUrl: meta.fileUrl,
            isDefault: meta.isDefault === true || meta.isDefault === "true"
          });
        } else {
          const matchingFile = uploadedSubtitleFiles.find(f => f.originalname === meta.originalname);
          if (matchingFile) {
            subtitles.push({
              language: meta.language,
              label: meta.label || meta.language || "Subtitle",
              fileUrl: getMediaUrl(matchingFile),
              isDefault: meta.isDefault === true || meta.isDefault === "true"
            });
          }
        }
      }
    }

    const movie = await Movie.create({
      title: req.body.title,
      description: req.body.description || "",
      genre,
      releaseYear: req.body.releaseYear || null,
      duration: req.body.duration || "",
      language: req.body.language || "",
      poster: uploadedPoster || generatedThumb,
      banner: uploadedBanner || uploadedPoster || generatedThumb,
      trailerUrl: resolvedTrailerUrl,
      videoUrl: resolvedVideoUrl,
      isComingSoon: req.body.isComingSoon === "true" || req.body.isComingSoon === true,
      isNewContent: req.body.isNewContent === "true" || req.body.isNewContent === true,
      releaseDate: req.body.releaseDate || null,
      isPremium: req.body.isPremium === "true" || req.body.isPremium === true,
      rating: req.body.rating || 0,
      cast: sanitizeCast(cast),
      category,
      audioTracks,
      subtitles,
      priority,
      videoSource: streamInfo.videoSource || "bunny_storage",
      storageType: streamInfo.storageType || "bunny_storage",
      videoId: streamInfo.videoId || "",
      streamUrl: streamInfo.streamUrl || "",
      playlistUrl: streamInfo.playlistUrl || "",
      playbackUrl: streamInfo.playbackUrl || "",
      thumbnailUrl: streamInfo.thumbnailUrl || "",
      encodingStatus: streamInfo.encodingStatus || ""
    });

    try {
      await notifyNewContent({
        title: "🎬 New Movie Added",
        message: `${movie.title} is now available to watch.`,
        type: "NEW_MOVIE",
        actionUrl: `/watch/${movie._id}`,
        createdBy: req.user?.id || req.user?._id,
      });
    } catch (err) {
      console.error("Movie notification failed:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Movie added successfully",
      movie,
    });

  } catch (error) {
  console.error("================================");
  console.error("ADD MOVIE ERROR");
  console.error(error);
  console.error(error.message);

  if (error.errors) {
    Object.keys(error.errors).forEach((key) => {
      console.error(
        "VALIDATION:",
        key,
        error.errors[key]?.message
      );
    });
  }

  console.error("REQUEST BODY:");
  console.log(req.body);

  console.error("================================");

  return res.status(500).json({
    success: false,
    message: error.message,
  });
}
};

// ========================================
// GET ALL MOVIES
// ========================================

const getAllMovies = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const movies = await Movie.find()
      .sort({
        priority: -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Movie.countDocuments();

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
};

// ========================================
// SEARCH MOVIES
// ========================================

const searchMovies = async (req, res) => {
  try {

    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const movies = await Movie.find({
      title: {
        $regex: q,
        $options: "i",
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      results: movies,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: `Search failed: ${error.message}`,
    });
  }
};

// ========================================
// GET MOVIE BY ID
// ========================================

const getMovieById = async (req, res) => {
  try {

    const movie = await Movie.findById(
      req.params.id
    ).lean();

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
// UPDATE MOVIE
// ========================================

const updateMovie = async (req, res) => {
  try {

    const { id } = req.params;

    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const genre = parseJSON(
      req.body.genre,
      movie.genre
    );

    const category = parseJSON(
      req.body.category,
      movie.category
    );

    const cast = parseJSON(
      req.body.cast,
      movie.cast
    );

    // ========================================
    // UPDATE FIELDS
    // ========================================

    if (req.body.title)
      movie.title = req.body.title;

    if (req.body.description)
      movie.description =
        req.body.description;

    movie.genre = genre;

    if (req.body.releaseYear)
      movie.releaseYear =
        req.body.releaseYear;

    if (req.body.duration)
      movie.duration =
        req.body.duration;

    if (req.body.language)
      movie.language =
        req.body.language;

    if (
      req.body.releaseDate !== undefined &&
      req.body.releaseDate !== "null" &&
      req.body.releaseDate !== ""
    ) {
      movie.releaseDate = req.body.releaseDate;
    }

    if (req.body.rating)
      movie.rating =
        req.body.rating;

    movie.isComingSoon =
      req.body.isComingSoon === "true" || req.body.isComingSoon === true;

    movie.isPremium =
      req.body.isPremium === "true" || req.body.isPremium === true;

    if (req.body.isNewContent !== undefined) {
      movie.isNewContent =
        req.body.isNewContent === "true" || req.body.isNewContent === true;
    }

    movie.category = category;

    // ========================================
    // FILES
    // ========================================

    if (req.files?.poster?.[0]) {
      await deleteMedia(movie.poster);
      movie.poster = getMediaUrl(req.files.poster[0]);
    } else if (req.body.posterUrl && String(req.body.posterUrl).trim()) {
      movie.poster = String(req.body.posterUrl).trim();
    } else if (req.body.poster && String(req.body.poster).trim()) {
      movie.poster = String(req.body.poster).trim();
    }

    if (req.files?.banner?.[0]) {
      await deleteMedia(movie.banner);
      movie.banner = getMediaUrl(req.files.banner[0]);
    } else if (req.body.bannerUrl && String(req.body.bannerUrl).trim()) {
      movie.banner = String(req.body.bannerUrl).trim();
    } else if (req.body.banner && String(req.body.banner).trim()) {
      movie.banner = String(req.body.banner).trim();
    }

    if (req.files?.trailer?.[0]) {
      await deleteMedia(movie.trailerUrl);
      movie.trailerUrl = getMediaUrl(req.files.trailer[0]);
    } else if (req.body.trailerUrl && String(req.body.trailerUrl).trim()) {
      movie.trailerUrl = String(req.body.trailerUrl).trim();
    }

    if (req.files?.video?.[0]) {
      await deleteMedia(movie.videoUrl);
      movie.videoUrl = getMediaUrl(req.files.video[0]);
    } else if (req.body.videoUrl && String(req.body.videoUrl).trim()) {
      movie.videoUrl = String(req.body.videoUrl).trim();
    }

    const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
    const streamInfo = parseBunnyStreamUrl(movie.videoUrl);
    if (streamInfo) {
      movie.videoSource = streamInfo.videoSource;
      movie.storageType = streamInfo.storageType;
      movie.videoId = streamInfo.videoId;
      movie.playlistUrl = streamInfo.playlistUrl;
      movie.playbackUrl = streamInfo.playbackUrl;
      movie.streamUrl = streamInfo.streamUrl;
      movie.thumbnailUrl = streamInfo.thumbnailUrl;
      movie.encodingStatus = streamInfo.encodingStatus;
    } else if (movie.videoUrl !== undefined) {
      movie.videoSource = "bunny_storage";
      movie.storageType = "bunny_storage";
      movie.videoId = "";
      movie.playlistUrl = "";
      movie.playbackUrl = "";
      movie.streamUrl = "";
      movie.thumbnailUrl = "";
      movie.encodingStatus = "";
    }

    if (!movie.poster && movie.thumbnailUrl) {
      movie.poster = movie.thumbnailUrl;
    }
    if (!movie.banner) {
      movie.banner = movie.poster || movie.thumbnailUrl || "";
    }


    // ========================================
    // CAST IMAGES
    // ========================================

    const castFiles =
      Object.keys(req.files || {})
        .filter((key) =>
          key.startsWith("castImage_")
        );

    for (const key of castFiles) {

      const index = key.split("_")[1];

      const file = req.files[key][0];

      if (cast[index]) {

        if (
          cast[index].image &&
          cast[index].image !== getMediaUrl(file)
        ) {
          await deleteMedia(
            cast[index].image
          );
        }

        cast[index].image = getMediaUrl(file);
      }
    }



    // Multilingual Audio Tracks & Subtitles Update
    if (req.body.audioMetadata !== undefined) {
      const audioMetadata = parseJSON(req.body.audioMetadata, []);
      const uploadedAudioFiles = req.files?.audioTracks || [];
      const audioTracks = [];
      for (const meta of audioMetadata) {
        if (meta.fileUrl) {
          audioTracks.push({
            language: meta.language,
            fileUrl: meta.fileUrl,
            isDefault: meta.isDefault === true || meta.isDefault === "true"
          });
        } else {
          const matchingFile = uploadedAudioFiles.find(f => f.originalname === meta.originalname);
          if (matchingFile) {
            audioTracks.push({
              language: meta.language,
              fileUrl: getMediaUrl(matchingFile),
              isDefault: meta.isDefault === true || meta.isDefault === "true"
            });
          }
        }
      }
      movie.audioTracks = audioTracks;
    }

    if (req.body.subtitleMetadata !== undefined) {
      const subtitleMetadata = parseJSON(req.body.subtitleMetadata, []);
      const uploadedSubtitleFiles = req.files?.subtitles || [];
      const subtitles = [];
      for (const meta of subtitleMetadata) {
        if (meta.fileUrl) {
          subtitles.push({
            language: meta.language,
            label: meta.label || meta.language || "Subtitle",
            fileUrl: meta.fileUrl,
            isDefault: meta.isDefault === true || meta.isDefault === "true"
          });
        } else {
          const matchingFile = uploadedSubtitleFiles.find(f => f.originalname === meta.originalname);
          if (matchingFile) {
            subtitles.push({
              language: meta.language,
              label: meta.label || meta.language || "Subtitle",
              fileUrl: getMediaUrl(matchingFile),
              isDefault: meta.isDefault === true || meta.isDefault === "true"
            });
          }
        }
      }
      movie.subtitles = subtitles;
    }

    movie.cast = sanitizeCast(cast);

    // ========================================
    // PRIORITY ALGORITHM FOR UPDATE
    // ========================================
    if (req.body.priority !== undefined) {
      const newPriority = Number(req.body.priority) || 0;
      const oldPriority = movie.priority || 0;

      if (newPriority !== oldPriority) {
        // Step 1: Remove movie from its old slot by shifting down priorities above oldPriority
        if (oldPriority > 0) {
          await Movie.updateMany(
            { _id: { $ne: movie._id }, priority: { $gt: oldPriority } },
            { $inc: { priority: -1 } }
          );
        }

        // Step 2: Insert movie into its new slot
        if (newPriority > 0) {
          // Shift up all priorities >= newPriority
          await Movie.updateMany(
            { _id: { $ne: movie._id }, priority: { $gte: newPriority } },
            { $inc: { priority: 1 } }
          );
          movie.priority = newPriority;
        } else {
          movie.priority = 0;
        }
      }
    }

    await movie.save();

    return res.json({
      success: true,
      message: "Movie updated successfully",
      movie,
    });

  } catch (error) {
    console.error("UPDATE MOVIE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update movie", error: error.message });
  }
};

// ========================================
// DELETE MOVIE
// ========================================

const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    // Capture priority before deletion to shift other priorities
    const targetPriority = movie.priority || 0;

    // Delete files from BunnyCDN
    await deleteMediaFiles(
      movie.poster,
      movie.banner,
      movie.trailerUrl,
      movie.videoUrl,
      ...(movie.cast || []).map(c => c.image)
    );

    await Movie.findByIdAndDelete(req.params.id);

    // Shift down priorities of all movies with priority > targetPriority
    if (targetPriority > 0) {
      await Movie.updateMany({ priority: { $gt: targetPriority } }, { $inc: { priority: -1 } });
    }

    return res.json({ success: true, message: "Movie deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete movie" });
  }
};


module.exports = {
  addMovie,
  getAllMovies,
  searchMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
};