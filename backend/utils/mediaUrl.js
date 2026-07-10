const { deleteFromBunny } = require("../cdn/bunnyCDN");
const fs = require("fs");
const path = require("path");

/**
 * Returns the CDN URL for a multer-processed file, or the fallback value.
 * Never constructs local /uploads/... paths — CDN URL only.
 *
 * @param {Object|null} file - Multer file object (may have cdnUrl, path)
 * @param {string} fallback - Fallback value (e.g. req.body.poster which may already be a CDN URL)
 * @returns {string} The CDN URL or fallback
 */
const getMediaUrl = (file, fallback = "") => {
  if (!file) return fallback;
  // cdnUrl is set by our custom multer storage engine (upload.middleware.js)
  // file.path is also set to the CDN URL by upload.middleware.js
  return file.cdnUrl || file.path || fallback;
};

/**
 * Parses a Bunny Stream HLS URL to extract the videoId and metadata fields.
 *
 * @param {string} url - HLS playlist URL
 * @returns {Object|null} Extended Bunny Stream fields
 */
const parseBunnyStreamUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (url.includes("playlist.m3u8")) {
    const parts = url.split("/");
    const playlistIndex = parts.indexOf("playlist.m3u8");
    if (playlistIndex > 0) {
      const videoId = parts[playlistIndex - 1];
      const host = parts[2]; // e.g. "vz-717cecdc-391.b-cdn.net"
      return {
        videoSource: "bunny_stream",
        storageType: "bunny_stream",
        videoId,
        playlistUrl: url,
        playbackUrl: url,
        streamUrl: url,
        thumbnailUrl: `https://${host}/${videoId}/thumbnail.jpg`,
        encodingStatus: "processing",
      };
    }
  }
  return null;
};

/**
 * Deletes a media file. If the path is a full URL (BunnyCDN), deletes from CDN.
 * If it is a Bunny Stream video URL, deletes the video from Bunny Stream.
 * If it's a legacy local path, attempts local deletion (backward compat during migration).
 *
 * @param {string} filePath - URL or local path to delete
 */
const deleteMedia = async (filePath) => {
  if (!filePath) return;

  // Bunny Stream video — delete from Bunny Stream library
  if (typeof filePath === "string" && filePath.includes("playlist.m3u8")) {
    try {
      const parts = filePath.split("/");
      const playlistIndex = parts.indexOf("playlist.m3u8");
      if (playlistIndex > 0) {
        const videoId = parts[playlistIndex - 1];
        const { deleteVideo } = require("../cdn/bunnyCDN");
        await deleteVideo(videoId);
        console.log(`Successfully deleted Bunny Stream video: ${videoId}`);
      }
    } catch (err) {
      console.error("Bunny Stream delete error:", err.message);
    }
    return;
  }

  // BunnyCDN URL — delete from CDN
  if (typeof filePath === "string" && filePath.startsWith("http")) {
    try {
      await deleteFromBunny(filePath);
    } catch (err) {
      console.error("BunnyCDN delete error:", err.message);
    }
    return;
  }

  // Legacy local path — attempt local deletion for backward compatibility
  try {
    const fullPath = path.join(__dirname, "../", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.warn(`[MIGRATION] Deleted legacy local file: ${filePath}`);
    }
  } catch (err) {
    console.error("Local file deletion error:", err.message);
  }
};

/**
 * Deletes multiple media files in parallel.
 *
 * @param  {...string} files - URLs or paths to delete
 */
const deleteMediaFiles = async (...files) => {
  await Promise.all(
    files
      .filter(Boolean)
      .map((file) => deleteMedia(file))
  );
};

module.exports = {
  getMediaUrl,
  parseBunnyStreamUrl,
  deleteMedia,
  deleteMediaFiles,
};
