const express = require("express");
const axios = require("axios");
const router = express.Router();

// Proxy Bunny Stream HLS (.m3u8), MP4, and TS segments with authorized Referer
router.use("/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    // Strip leading slashes and query strings to get exact subpath
    const subpath = req.url.split("?")[0].replace(/^\/+/, "") || "playlist.m3u8";

    let pullZone = String(process.env.BUNNY_STREAM_PULL_ZONE || "vz-87171daa-e3e").trim();
    if (pullZone && !pullZone.includes(".")) {
      pullZone = `${pullZone}.b-cdn.net`;
    }

    const targetUrl = `https://${pullZone}/${videoId}/${subpath}`;

    const headers = {
      Referer: "https://admin.catchandwatch.com",
      Origin: "https://admin.catchandwatch.com",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const response = await axios({
      method: "get",
      url: targetUrl,
      headers,
      responseType: "stream",
      validateStatus: () => true,
    });

    res.status(response.status);

    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
    }
    if (response.headers["accept-ranges"]) {
      res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    response.data.pipe(res);
  } catch (error) {
    console.error("Stream Proxy Error:", error.message);
    res.status(500).json({ error: "Failed to proxy stream" });
  }
});

module.exports = router;
