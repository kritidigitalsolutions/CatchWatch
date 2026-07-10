const TvShowsEpisode = require(
  "../../models/tvShowsEpisode.model"
);

const TvShow = require(
  "../../models/tvShow.model"
);

const { getMediaUrl, deleteMedia } = require("../../utils/mediaUrl");


// ========================================
// UPDATE TOTAL EPISODES
// ========================================
const updateTvShowStats =
  async (tvShowId) => {

    const totalEpisodes =
      await TvShowsEpisode.countDocuments({
        tvShowId,
      });

    await TvShow.findByIdAndUpdate(
      tvShowId,
      {
        totalEpisodes,
      }
    );
  };


// ========================================
// ADD TV SHOW EPISODE
// ========================================
const addTvShowsEpisode =
  async (req, res) => {
    try {

      const {
        tvShowId,
      } = req.params;

      const existingEpisode =
        await TvShowsEpisode.findOne({
          tvShowId,

          episodeNumber:
            req.body.episodeNumber,
        });

      if (existingEpisode) {
        return res.status(400).json({
          success: false,
          message:
            "Episode already exists",
        });
      }

      const video =
        req.files?.video?.[0];

      const thumbnail =
        req.files?.thumbnail?.[0];

      const resolvedVideoUrl = getMediaUrl(video, req.body.videoUrl || "");
      const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
      const streamInfo = parseBunnyStreamUrl(resolvedVideoUrl) || {};

      const episode =
        await TvShowsEpisode.create({

          tvShowId,

          episodeNumber:
            Number(
              req.body.episodeNumber
            ),

          title:
            req.body.title || "",

          description:
            req.body.description || "",

          duration:
            req.body.duration || "",

          isLocked:
            req.body.isLocked ===
            "true",

          isVertical:
            req.body.isVertical !==
            "false",

          videoUrl: resolvedVideoUrl,

          thumbnail: getMediaUrl(
            thumbnail,
            req.body.thumbnail || req.body.thumbnailUrl || ""
          ),

          videoSource: streamInfo.videoSource || "bunny_storage",
          storageType: streamInfo.storageType || "bunny_storage",
          videoId: streamInfo.videoId || "",
          streamUrl: streamInfo.streamUrl || "",
          playlistUrl: streamInfo.playlistUrl || "",
          playbackUrl: streamInfo.playbackUrl || "",
          thumbnailUrl: streamInfo.thumbnailUrl || "",
          encodingStatus: streamInfo.encodingStatus || ""
        });

      await updateTvShowStats(
        tvShowId
      );

      return res.status(201).json({
        success: true,
        message:
          "Episode added successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to add episode",

        error: error.message,
      });
    }
  };


// ========================================
// GET TV SHOW EPISODES
// ========================================
const getTvShowsEpisodes =
  async (req, res) => {
    try {

      const {
        tvShowId,
      } = req.params;

      const episodes =
        await TvShowsEpisode.find({
          tvShowId,
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch episodes",
      });
    }
  };


// ========================================
// UPDATE TV SHOW EPISODE
// ========================================
const updateTvShowsEpisode =
  async (req, res) => {
    try {

      const episode =
        await TvShowsEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      // DUPLICATE CHECK
      if (
        req.body.episodeNumber
      ) {

        const existingEpisode =
          await TvShowsEpisode.findOne({
            tvShowId:
              episode.tvShowId,

            episodeNumber:
              req.body.episodeNumber,

            _id: {
              $ne: episode._id,
            },
          });

        if (existingEpisode) {
          return res.status(400).json({
            success: false,
            message:
              "Episode number already exists",
          });
        }

        episode.episodeNumber =
          Number(
            req.body.episodeNumber
          );
      }

      if (req.body.title)
        episode.title =
          req.body.title;

      if (req.body.description)
        episode.description =
          req.body.description;

      if (req.body.duration)
        episode.duration =
          req.body.duration;

      if (
        req.body.isLocked !==
        undefined
      ) {

        episode.isLocked =
          req.body.isLocked ===
          "true";
      }

      if (
        req.body.isVertical !==
        undefined
      ) {

        episode.isVertical =
          req.body.isVertical !==
          "false";
      }


      // VIDEO
      if (req.files?.video?.[0]) {
        deleteMedia(episode.videoUrl);
        episode.videoUrl = getMediaUrl(req.files.video[0]);
      } else if (req.body.videoUrl !== undefined) {
        episode.videoUrl = req.body.videoUrl;
      }

      if (episode.videoUrl !== undefined) {
        const { parseBunnyStreamUrl } = require("../../utils/mediaUrl");
        const streamInfo = parseBunnyStreamUrl(episode.videoUrl);
        if (streamInfo) {
          episode.videoSource = streamInfo.videoSource;
          episode.storageType = streamInfo.storageType;
          episode.videoId = streamInfo.videoId;
          episode.playlistUrl = streamInfo.playlistUrl;
          episode.playbackUrl = streamInfo.playbackUrl;
          episode.streamUrl = streamInfo.streamUrl;
          episode.thumbnailUrl = streamInfo.thumbnailUrl;
          episode.encodingStatus = streamInfo.encodingStatus;
        } else {
          episode.videoSource = "bunny_storage";
          episode.storageType = "bunny_storage";
          episode.videoId = "";
          episode.playlistUrl = "";
          episode.playbackUrl = "";
          episode.streamUrl = "";
          episode.thumbnailUrl = "";
          episode.encodingStatus = "";
        }
      }


      // THUMBNAIL
      if (
        req.files?.thumbnail?.[0]
      ) {

        deleteMedia(
          episode.thumbnail
        );

        episode.thumbnail =
          getMediaUrl(req.files.thumbnail[0]);
      }

      await episode.save();

      return res.json({
        success: true,
        message:
          "Episode updated successfully",

        episode,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update episode",
      });
    }
  };


// ========================================
// DELETE TV SHOW EPISODE
// ========================================
const deleteTvShowsEpisode =
  async (req, res) => {
    try {

      const episode =
        await TvShowsEpisode.findById(
          req.params.id
        );

      if (!episode) {
        return res.status(404).json({
          success: false,
          message:
            "Episode not found",
        });
      }

      deleteMedia(
        episode.videoUrl
      );

      deleteMedia(
        episode.thumbnail
      );

      await TvShowsEpisode.findByIdAndDelete(
        req.params.id
      );

      await updateTvShowStats(
        episode.tvShowId
      );

      return res.json({
        success: true,
        message:
          "Episode deleted successfully",
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete episode",
      });
    }
  };


// ========================================
// SEARCH TV SHOW EPISODES
// ========================================
const searchTvShowsEpisodes =
  async (req, res) => {
    try {

      const {
        tvShowId,
      } = req.params;

      const { q } = req.query;

      const episodes =
        await TvShowsEpisode.find({

          tvShowId,

          title: {
            $regex: q || "",
            $options: "i",
          },
        }).sort({
          episodeNumber: 1,
        });

      return res.json({
        success: true,
        results: episodes,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Search failed",
      });
    }
  };


module.exports = {
  addTvShowsEpisode,
  getTvShowsEpisodes,
  updateTvShowsEpisode,
  deleteTvShowsEpisode,
  searchTvShowsEpisodes,
};
