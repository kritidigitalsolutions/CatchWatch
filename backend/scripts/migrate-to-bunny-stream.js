const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const connectDB = require("../config/db");
const Movie = require("../models/movie.model");
const Episode = require("../models/episode.model");
const TvShowsEpisode = require("../models/tvShowsEpisode.model");
const ShortFilm = require("../models/shortFilm.model");
const Reel = require("../models/reel.model");
const { uploadVideo } = require("../cdn/bunnyCDN");

const migrateDocument = async (doc, modelName) => {
  const videoUrl = doc.videoUrl;
  if (!videoUrl || videoUrl.includes("playlist.m3u8")) {
    return false; // Already migrated or no video URL
  }

  console.log(`\n[MIGRATING] ${modelName}: "${doc.title || doc.caption || doc._id}"`);
  console.log(`Source URL: ${videoUrl}`);

  try {
    // 1. Stream the file from current location
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      timeout: 300000 // 5 minutes timeout for large video downloads
    });

    // 2. Upload directly to Bunny Stream
    const title = `${doc.title || doc.caption || 'Migrated'}-${doc._id}-${Date.now()}`;
    console.log(`Uploading stream to Bunny Stream...`);
    const uploadResult = await uploadVideo({
      stream: response.data,
      title
    });

    console.log(`Upload successful. Video ID: ${uploadResult.videoId}`);

    // 3. Update document with Bunny Stream properties
    doc.videoSource = "bunny_stream";
    doc.storageType = "bunny_stream";
    doc.videoId = uploadResult.videoId;
    doc.playlistUrl = uploadResult.playlistUrl;
    doc.playbackUrl = uploadResult.playbackUrl;
    doc.streamUrl = uploadResult.streamUrl;
    doc.thumbnailUrl = uploadResult.thumbnailUrl;
    doc.encodingStatus = "processing";
    doc.videoUrl = uploadResult.playlistUrl; // Point videoUrl to playlist.m3u8 for backward compat

    await doc.save();
    console.log(`[SUCCESS] Migrated "${doc.title || doc.caption || doc._id}" successfully.`);
    return true;
  } catch (err) {
    console.error(`[FAILED] Migration failed for ${modelName} ID: ${doc._id}. Error: ${err.message}`);
    return false;
  }
};

const runMigration = async () => {
  console.log("Starting CatchWatch Bunny Stream Migration Utility...");
  try {
    await connectDB();
    console.log("Database connected successfully.");

    let migratedCount = 0;

    // 1. Migrate Movies
    console.log("\n--- Checking Movies ---");
    const movies = await Movie.find({});
    for (const movie of movies) {
      const success = await migrateDocument(movie, "Movie");
      if (success) migratedCount++;
    }

    // 2. Migrate Episodes
    console.log("\n--- Checking Series Episodes ---");
    const episodes = await Episode.find({});
    for (const ep of episodes) {
      const success = await migrateDocument(ep, "Episode");
      if (success) migratedCount++;
    }

    // 3. Migrate TV Show Episodes
    console.log("\n--- Checking TV Show Episodes ---");
    const tvShowEps = await TvShowsEpisode.find({});
    for (const ep of tvShowEps) {
      const success = await migrateDocument(ep, "TvShowsEpisode");
      if (success) migratedCount++;
    }

    // 4. Migrate Short Films
    console.log("\n--- Checking Short Films ---");
    const shortFilms = await ShortFilm.find({});
    for (const sf of shortFilms) {
      const success = await migrateDocument(sf, "ShortFilm");
      if (success) migratedCount++;
    }

    // 5. Migrate Reels
    console.log("\n--- Checking Reels ---");
    const reels = await Reel.find({});
    for (const reel of reels) {
      const success = await migrateDocument(reel, "Reel");
      if (success) migratedCount++;
    }

    console.log(`\n========================================`);
    console.log(`Migration complete. Total records migrated: ${migratedCount}`);
    console.log(`========================================`);
    
  } catch (err) {
    console.error("Critical Migration Error:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

runMigration();
