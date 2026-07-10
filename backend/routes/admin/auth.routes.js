const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const { isAdmin } = require("../../middlewares/admin.middleware");
const {
  getClientUploadConfig,
  uploadStreamToBunny,
} = require("../../cdn/bunnyCDN");

const {
  loginAdmin,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword,
  getAdminProfile,
} = require("../../controllers/admin_auth/admin.auth.controller");

const {
  sendPasswordOtp,
  changePassword,
  sendEmailOtp,
  changeEmail,
} = require("../../controllers/admin_auth/admin.settings.controller");

const allowedUploadFolders = {
  movies: new Set(["posters", "banners", "trailers", "videos", "cast"]),
  series: new Set(["posters", "banners", "trailers", "cast"]),
  episodes: new Set(["posters", "videos"]),
  shortdramas: new Set(["posters", "banners", "trailers", "cast"]),
  dramaepisodes: new Set(["posters", "videos"]),
  profile: new Set(["others", "avatars"]),
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/quicktime",
]);

const safeExtension = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  return ext && /^[a-z0-9.]+$/.test(ext) ? ext : "";
};

const validateUploadTarget = (type, subfolder) => {
  const normalizedType = String(type || "").trim().toLowerCase();
  const normalizedSubfolder = String(subfolder || "").trim().toLowerCase();

  if (!allowedUploadFolders[normalizedType]?.has(normalizedSubfolder)) {
    return null;
  }

  return {
    type: normalizedType,
    subfolder: normalizedSubfolder,
  };
};

const bunnyStorage = {
  _handleFile: async (req, file, cb) => {
    try {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new Error("Invalid file type"));
      }

      const target = validateUploadTarget(req.body.type, req.body.subfolder);
      if (!target) {
        return cb(new Error("Invalid Bunny upload target"));
      }

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension(file)}`;
      
      const isVideo = req.body.subfolder === "videos" || req.body.subfolder === "trailers" || (file.mimetype && file.mimetype.startsWith("video/"));
      let result;

      if (isVideo) {
        try {
          console.log("auth.routes.js: Target Bunny Stream");
          const { uploadVideo } = require("../../cdn/bunnyCDN");
          const title = `${req.body.title || 'Video'}-${Date.now()}`;
          result = await uploadVideo({ stream: file.stream, title });
        } catch (err) {
          console.error("CRITICAL: auth.routes.js Bunny Stream upload failed. Falling back to Bunny Storage.", err.message);
          result = await uploadStreamToBunny({
            stream: file.stream,
            remotePath: `${target.type}/${target.subfolder}/${filename}`,
            contentType: file.mimetype,
          });
        }
      } else {
        result = await uploadStreamToBunny({
          stream: file.stream,
          remotePath: `${target.type}/${target.subfolder}/${filename}`,
          contentType: file.mimetype,
        });
      }

      cb(null, {
        filename,
        path: result.playlistUrl || result.url,
        cdnUrl: result.playlistUrl || result.url,
        remotePath: result.videoId || result.path,
      });
    } catch (err) {
      cb(err);
    }
  },

  _removeFile: (req, file, cb) => {
    cb(null);
  },
};

const bunnyUpload = multer({
  storage: bunnyStorage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE),
  },
});

const handleBunnyUpload = (req, res, next) => {
  bunnyUpload.single("file")(req, res, (err) => {
    if (!err) {
      return next();
    }

    const isClientError =
      err instanceof multer.MulterError ||
      err.message === "Invalid file type" ||
      err.message === "Invalid Bunny upload target";

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      message: err.message,
    });
  });
};


// Admin Login
router.post(
  "/login",
  loginAdmin
);

// Get own profile
router.get(
  "/profile",
  isAdmin,
  getAdminProfile
);

router.get(
  "/bunny-config",
  isAdmin,
  async (req, res) => {
    try {
      const config = await getClientUploadConfig();

      res.json({
        success: true,
        ...config,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.post(
  "/bunny-upload",
  isAdmin,
  handleBunnyUpload,
  async (req, res) => {
    try {
      if (!req.file?.cdnUrl) {
        return res.status(400).json({
          success: false,
          message: "Upload file is required",
        });
      }

      return res.status(201).json({
        success: true,
        url: req.file.cdnUrl,
        path: req.file.remotePath,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

router.get(
  "/bunny-stream/status/:videoId",
  isAdmin,
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const { getVideoStatus } = require("../../cdn/bunnyCDN");
      
      const bunnyData = await getVideoStatus(videoId);
      
      // Map Bunny Stream status code
      // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished, 4 = Failed, 5 = Preserving, 6 = Playable
      let encodingStatus = "processing";
      if (bunnyData.status === 3 || bunnyData.status === 6) {
        encodingStatus = "ready";
      } else if (bunnyData.status === 4) {
        encodingStatus = "failed";
      }
      
      // Update DB Document
      const Movie = require("../../models/movie.model");
      const Episode = require("../../models/episode.model");
      const TvShowsEpisode = require("../../models/tvShowsEpisode.model");
      const ShortFilm = require("../../models/shortFilm.model");
      const Reel = require("../../models/reel.model");

      let doc = await Movie.findOne({ videoId });
      let modelType = "Movie";

      if (!doc) {
        doc = await Episode.findOne({ videoId });
        modelType = "Episode";
      }
      if (!doc) {
        doc = await TvShowsEpisode.findOne({ videoId });
        modelType = "TvShowsEpisode";
      }
      if (!doc) {
        doc = await ShortFilm.findOne({ videoId });
        modelType = "ShortFilm";
      }
      if (!doc) {
        doc = await Reel.findOne({ videoId });
        modelType = "Reel";
      }

      let pullZone = String(process.env.BUNNY_STREAM_PULL_ZONE || "").trim().replace(/\/+$/, "");
      if (pullZone && !pullZone.includes(".")) {
        pullZone = `${pullZone}.b-cdn.net`;
      }
      const thumbnailUrl = `https://${pullZone}/${videoId}/${bunnyData.thumbnailFileName || 'thumbnail.jpg'}`;

      if (doc) {
        doc.encodingStatus = encodingStatus;
        if (encodingStatus === "ready") {
          // Store duration in minutes
          if (bunnyData.length) {
            const minutes = Math.round(bunnyData.length / 60);
            doc.duration = minutes > 0 ? String(minutes) : "1";
          }
          doc.thumbnailUrl = thumbnailUrl;
          // For Episode / TvShowsEpisode which use thumbnail field, fill it if empty
          if (doc.thumbnail === "" || !doc.thumbnail) {
            doc.thumbnail = thumbnailUrl;
          }
        }
        await doc.save();
      }

      return res.json({
        success: true,
        status: encodingStatus,
        progress: bunnyData.encodeProgress || 0,
        duration: bunnyData.length || 0,
        availableResolutions: (bunnyData.availableResolutions || "").split(",").filter(Boolean),
        thumbnailUrl
      });
    } catch (err) {
      console.error("Bunny Stream status API error:", err.message);
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

//OTP
router.post(
  "/send-otp",
  sendForgotPasswordOtp
);

router.post(
  "/verify-otp",
  verifyForgotPasswordOtp
);

router.post(
  "/reset-password",
  resetForgotPassword
);

// --- CHANGE PASSWORD FLOW (Authenticated) ---
router.post(
  "/change-password/send-otp",
  isAdmin,
  sendPasswordOtp
);

router.post(
  "/change-password",
  isAdmin,
  changePassword
);

// --- CHANGE EMAIL FLOW (Authenticated) ---
router.post(
  "/change-email/send-otp",
  isAdmin,
  sendEmailOtp
);

router.post(
  "/change-email",
  isAdmin,
  changeEmail
);



module.exports = router;
