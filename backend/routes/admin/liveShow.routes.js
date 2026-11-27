const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middlewares/admin.middleware");
const upload = require("../../middlewares/upload.middleware");
const {
  getAllLiveShows,
  getLiveShowById,
  createLiveShow,
  updateLiveShow,
  updateLiveShowStatus,
  deleteLiveShow,
} = require("../../controllers/admin/liveShow.controller");

const liveShowUpload = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "thumbnailFile", maxCount: 1 },
  { name: "poster", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "bannerFile", maxCount: 1 },
]);

const safeLiveShowUpload = (req, res, next) => {
  liveShowUpload(req, res, (err) => {
    if (err) {
      console.warn("LiveShow upload warning (continuing with body):", err.message);
    }
    next();
  });
};

router.get("/", isAdmin, getAllLiveShows);
router.get("/:id", isAdmin, getLiveShowById);
router.post("/", isAdmin, safeLiveShowUpload, createLiveShow);
router.put("/:id", isAdmin, safeLiveShowUpload, updateLiveShow);
router.patch("/:id/status", isAdmin, updateLiveShowStatus);
router.delete("/:id", isAdmin, deleteLiveShow);

module.exports = router;
