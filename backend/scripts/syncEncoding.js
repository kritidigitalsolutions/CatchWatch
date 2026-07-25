require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { getVideoStatus } = require('../cdn/bunnyCDN');

const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const TvShowsEpisode = require('../models/tvShowsEpisode.model');
const ShortFilm = require('../models/shortFilm.model');
const Reel = require('../models/reel.model');

async function syncAllMedia() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for status sync...");

    const models = [
      { model: Movie, name: "Movie" },
      { model: Episode, name: "Episode" },
      { model: TvShowsEpisode, name: "TvShowsEpisode" },
      { model: ShortFilm, name: "ShortFilm" },
      { model: Reel, name: "Reel" },
    ];

    let pullZone = String(process.env.BUNNY_STREAM_PULL_ZONE || "").trim().replace(/\/+$/, "");
    if (pullZone && !pullZone.includes(".")) {
      pullZone = `${pullZone}.b-cdn.net`;
    }

    for (const { model, name } of models) {
      const items = await model.find({ videoId: { $exists: true, $ne: "" } });
      console.log(`Checking ${items.length} ${name} items...`);

      for (const item of items) {
        try {
          const bunnyData = await getVideoStatus(item.videoId);
          const isEncoded =
            bunnyData.status === 3 ||
            bunnyData.status === 6 ||
            bunnyData.encodeProgress === 100 ||
            (bunnyData.availableResolutions && String(bunnyData.availableResolutions).trim().length > 0);

          if (isEncoded) {
            item.encodingStatus = "ready";

            if (bunnyData.length && (!item.duration || String(item.duration).trim() === "")) {
              const minutes = Math.round(bunnyData.length / 60);
              item.duration = minutes > 0 ? String(minutes) : "1";
            }

            const thumbnailUrl = `https://${pullZone}/${item.videoId}/${bunnyData.thumbnailFileName || 'thumbnail.jpg'}`;
            item.thumbnailUrl = thumbnailUrl;
            if (!item.thumbnail || item.thumbnail === "") {
              item.thumbnail = thumbnailUrl;
            }

            await item.save();
            console.log(`  ✅ [${name}] "${item.title || item._id}" marked as READY. Duration: ${item.duration} mins`);
          } else if (bunnyData.status === 4) {
            item.encodingStatus = "failed";
            await item.save();
            console.log(`  ❌ [${name}] "${item.title || item._id}" marked as FAILED`);
          }
        } catch (err) {
          console.error(`  ⚠️ [${name}] Error fetching status for videoId ${item.videoId}:`, err.message);
        }
      }
    }

    console.log("Media sync completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Sync script error:", err);
    process.exit(1);
  }
}

syncAllMedia();
