const express = require("express");

const router = express.Router();

const {
  isAdmin
} = require("../../middlewares/admin.middleware");

const {
  getLegalDocuments,
  getLegalByType,
  addOrUpdateLegalDocument,
  togglePublish,
  deleteLegalDocument
} = require("../../controllers/admin/legal.controller");

// ========================================
// ADMIN LEGAL ROUTES
// ========================================

// Get all legal docs
router.get(
  "/",
  isAdmin,
  getLegalDocuments
);

// Create legal doc
router.post(
  "/",
  isAdmin,
  addOrUpdateLegalDocument
);

// Get legal doc by type
router.get(
  "/:type",
  isAdmin,
  getLegalByType
);

// Create/update legal doc
router.put(
  "/:type",
  isAdmin,
  addOrUpdateLegalDocument
);

// Toggle publish status
router.patch(
  "/:type/toggle",
  isAdmin,
  togglePublish
);

// Delete legal doc
router.delete(
  "/:type",
  isAdmin,
  deleteLegalDocument
);

module.exports = router;