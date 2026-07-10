const ShortFilm = require("../../models/shortFilm.model");
const {
  getMediaUrl,
  deleteMedia,
  deleteMediaFiles,
} = require("../../utils/mediaUrl");

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
// ADD SHORT FILM
// ========================================

const addShortFilm = async (req, res) => {
  try {
    const genre = parseJSON(req.body.genre);
    const category = parseJSON(req.body.category);
    const cast = parseJSON(req.body.cast);

    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const poster = req.files?.poster?.[0];
    const banner = req.files?.banner?.[0];
    const trailer = req.files?.trailer?.[0];
    const video = req.files?.video?.[0];

    if (!video && !req.body.videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video is required",
      });
    }

    const castFiles = Object.keys(req.files || {}).filter((key) =>
      key.startsWith("castImage_")
    );

    castFiles.forEach((key) => {
      const index = key.split("_")[1];
      const file = req.files[key][0];

      if (cast[index]) {
        cast[index].image = getMediaUrl(file);
      }
    });

    // Priority Logic

    const inputPriority =
      req.body.priority !== undefined
        ? Number(req.body.priority)
        : 0;

    let priority = 0;

    if (inputPriority > 0) {
      await ShortFilm.updateMany(
        { priority: { $gte: inputPriority } },
        { $inc: { priority: 1 } }
      );

      priority = inputPriority;
    } else {
      const maxShortFilm =
        await ShortFilm.findOne().sort("-priority");

      priority =
        maxShortFilm?.priority
          ? maxShortFilm.priority + 1
          : 1;
    }

    const resolvedVideoUrl = getMediaUrl(video, req.body.videoUrl);
    const resolvedTrailerUrl = getMediaUrl(trailer, req.body.trailerUrl);
    const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
    const streamInfo = parseBunnyStreamUrl(resolvedVideoUrl) || {};

    const shortFilm = await ShortFilm.create({
      title: req.body.title,
      description: req.body.description || "",
      genre,
      category,
      releaseYear: req.body.releaseYear || null,
      duration: req.body.duration || "",
      language: req.body.language || "",
      poster: getMediaUrl(poster, req.body.poster),
      banner: getMediaUrl(banner, req.body.banner),
      trailerUrl: resolvedTrailerUrl,
      videoUrl: resolvedVideoUrl,
      isPremium: req.body.isPremium === "true",
      rating: req.body.rating || 0,
      cast: sanitizeCast(cast),
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

    return res.status(201).json({
      success: true,
      message:
        "Short film added successfully",
      shortFilm,
    });

  } catch (error) {

    console.error(
      "ADD SHORT FILM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// GET ALL SHORT FILMS
// ========================================

const getAllShortFilms = async (
  req,
  res
) => {
  try {

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const shortFilms =
      await ShortFilm.find()
        .sort({
          priority: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

    const total =
      await ShortFilm.countDocuments();

    return res.json({
      success: true,
      total,
      page,
      pages:
        Math.ceil(total / limit),
      shortFilms,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch short films",
    });
  }
};

// ========================================
// SEARCH SHORT FILMS
// ========================================

const searchShortFilms = async (
  req,
  res
) => {
  try {

    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message:
          "Query is required",
      });
    }

    const shortFilms =
      await ShortFilm.find({
        title: {
          $regex: q,
          $options: "i",
        },
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      success: true,
      results: shortFilms,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Search failed",
    });
  }
};

// ========================================
// GET SHORT FILM BY ID
// ========================================

const getShortFilmById = async (
  req,
  res
) => {
  try {

    const shortFilm =
      await ShortFilm.findById(
        req.params.id
      ).lean();

    if (!shortFilm) {
      return res.status(404).json({
        success: false,
        message:
          "Short film not found",
      });
    }

    return res.json({
      success: true,
      shortFilm,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch short film",
    });
  }
};

// ========================================
// UPDATE SHORT FILM
// ========================================

const updateShortFilm = async (
  req,
  res
) => {
  try {

    const { id } = req.params;

    const shortFilm =
      await ShortFilm.findById(id);

    if (!shortFilm) {
      return res.status(404).json({
        success: false,
        message:
          "Short film not found",
      });
    }

    const genre = parseJSON(
      req.body.genre,
      shortFilm.genre
    );

    const category = parseJSON(
      req.body.category,
      shortFilm.category
    );

    const cast = parseJSON(
      req.body.cast,
      shortFilm.cast
    );

    if (req.body.title)
      shortFilm.title =
        req.body.title;

    if (req.body.description)
      shortFilm.description =
        req.body.description;

    shortFilm.genre = genre;

    shortFilm.category =
      category;

    if (req.body.releaseYear)
      shortFilm.releaseYear =
        req.body.releaseYear;

    if (req.body.duration)
      shortFilm.duration =
        req.body.duration;

    if (req.body.language)
      shortFilm.language =
        req.body.language;

    if (req.body.rating)
      shortFilm.rating =
        req.body.rating;

    shortFilm.isPremium =
      req.body.isPremium ===
      "true";

    // POSTER

    if (req.files?.poster?.[0]) {
      await deleteMedia(
        shortFilm.poster
      );

      shortFilm.poster =
        getMediaUrl(
          req.files.poster[0]
        );
    } else if (
      req.body.poster !==
      undefined
    ) {
      shortFilm.poster =
        req.body.poster;
    }

    // BANNER

    if (req.files?.banner?.[0]) {
      await deleteMedia(
        shortFilm.banner
      );

      shortFilm.banner =
        getMediaUrl(
          req.files.banner[0]
        );
    } else if (
      req.body.banner !==
      undefined
    ) {
      shortFilm.banner =
        req.body.banner;
    }

    // TRAILER

    if (req.files?.trailer?.[0]) {
      await deleteMedia(
        shortFilm.trailerUrl
      );

      shortFilm.trailerUrl =
        getMediaUrl(
          req.files.trailer[0]
        );
    } else if (
      req.body.trailerUrl !==
      undefined
    ) {
      shortFilm.trailerUrl =
        req.body.trailerUrl;
    }

    // VIDEO

    if (req.files?.video?.[0]) {
      await deleteMedia(shortFilm.videoUrl);
      shortFilm.videoUrl = getMediaUrl(req.files.video[0]);
    } else if (req.body.videoUrl !== undefined) {
      shortFilm.videoUrl = req.body.videoUrl;
    }

    const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
    const streamInfo = parseBunnyStreamUrl(shortFilm.videoUrl);
    if (streamInfo) {
      shortFilm.videoSource = streamInfo.videoSource;
      shortFilm.storageType = streamInfo.storageType;
      shortFilm.videoId = streamInfo.videoId;
      shortFilm.playlistUrl = streamInfo.playlistUrl;
      shortFilm.playbackUrl = shortFilm.playlistUrl;
      shortFilm.streamUrl = streamInfo.streamUrl;
      shortFilm.thumbnailUrl = streamInfo.thumbnailUrl;
      shortFilm.encodingStatus = streamInfo.encodingStatus;
    } else if (shortFilm.videoUrl !== undefined) {
      shortFilm.videoSource = "bunny_storage";
      shortFilm.storageType = "bunny_storage";
      shortFilm.videoId = "";
      shortFilm.playlistUrl = "";
      shortFilm.playbackUrl = "";
      shortFilm.streamUrl = "";
      shortFilm.thumbnailUrl = "";
      shortFilm.encodingStatus = "";
    }

    const castFiles =
      Object.keys(req.files || {})
        .filter((key) =>
          key.startsWith(
            "castImage_"
          )
        );

    for (const key of castFiles) {

      const index =
        key.split("_")[1];

      const file =
        req.files[key][0];

      if (cast[index]) {

        if (
          cast[index].image &&
          cast[index].image !==
            getMediaUrl(file)
        ) {
          await deleteMedia(
            cast[index].image
          );
        }

        cast[index].image =
          getMediaUrl(file);
      }
    }

    shortFilm.cast =
      sanitizeCast(cast);

    // Priority Update

    if (
      req.body.priority !==
      undefined
    ) {

      const newPriority =
        Number(
          req.body.priority
        ) || 0;

      const oldPriority =
        shortFilm.priority || 0;

      if (
        newPriority !==
        oldPriority
      ) {

        if (oldPriority > 0) {
          await ShortFilm.updateMany(
            {
              _id: {
                $ne:
                  shortFilm._id,
              },

              priority: {
                $gt:
                  oldPriority,
              },
            },
            {
              $inc: {
                priority: -1,
              },
            }
          );
        }

        if (newPriority > 0) {
          await ShortFilm.updateMany(
            {
              _id: {
                $ne:
                  shortFilm._id,
              },

              priority: {
                $gte:
                  newPriority,
              },
            },
            {
              $inc: {
                priority: 1,
              },
            }
          );

          shortFilm.priority =
            newPriority;
        } else {
          shortFilm.priority =
            0;
        }
      }
    }

    await shortFilm.save();

    return res.json({
      success: true,
      message:
        "Short film updated successfully",
      shortFilm,
    });

  } catch (error) {

    console.error(
      "UPDATE SHORT FILM ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

// ========================================
// DELETE SHORT FILM
// ========================================

const deleteShortFilm = async (
  req,
  res
) => {
  try {

    const shortFilm =
      await ShortFilm.findById(
        req.params.id
      );

    if (!shortFilm) {
      return res.status(404).json({
        success: false,
        message:
          "Short film not found",
      });
    }

    const targetPriority =
      shortFilm.priority || 0;

    await deleteMediaFiles(
      shortFilm.poster,
      shortFilm.banner,
      shortFilm.trailerUrl,
      shortFilm.videoUrl,
      ...(shortFilm.cast || []).map(
        (c) => c.image
      )
    );

    await ShortFilm.findByIdAndDelete(
      req.params.id
    );

    if (targetPriority > 0) {
      await ShortFilm.updateMany(
        {
          priority: {
            $gt:
              targetPriority,
          },
        },
        {
          $inc: {
            priority: -1,
          },
        }
      );
    }

    return res.json({
      success: true,
      message:
        "Short film deleted successfully",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete short film",
    });
  }
};

module.exports = {
  addShortFilm,
  getAllShortFilms,
  searchShortFilms,
  getShortFilmById,
  updateShortFilm,
  deleteShortFilm,
};