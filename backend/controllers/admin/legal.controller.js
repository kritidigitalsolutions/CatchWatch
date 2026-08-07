const legalModel = require("../../models/legal.model");

// ========================================
// GET ALL LEGAL DOCUMENTS
// ========================================
exports.getLegalDocuments = async (req, res) => {
  try {
    const documents = await legalModel
      .find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error("GET LEGAL DOCS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// GET LEGAL DOCUMENT BY TYPE
// ========================================
exports.getLegalByType = async (req, res) => {
  try {
    const document = await legalModel.findOne({
      type: req.params.type.toLowerCase()
    }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    console.error("GET LEGAL BY TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ========================================
// CREATE OR UPDATE LEGAL DOCUMENT
// ========================================
exports.addOrUpdateLegalDocument = async (req, res) => {
  try {
    const {
      type,
      title,
      content,
      sections,
      isPublished,
      order,
      icon
    } = req.body;

    const documentSlug = (type || "").toLowerCase().trim();

    if (!documentSlug || !title) {
      return res.status(400).json({
        success: false,
        message: "Document type/slug and title are required"
      });
    }

    let document = await legalModel.findOne({
      type: documentSlug
    });

    // UPDATE
    if (document) {
      document.title = title;
      if (content !== undefined) document.content = content;
      if (sections !== undefined) document.sections = sections;
      if (isPublished !== undefined) document.isPublished = isPublished;
      if (order !== undefined) document.order = order;
      if (icon !== undefined) document.icon = icon;
      document.lastUpdatedBy = req.user?.id || "Admin";

      await document.save();

      return res.status(200).json({
        success: true,
        message: "Document updated successfully",
        document
      });
    }

    // CREATE NEW DOCUMENT
    document = await legalModel.create({
      type: documentSlug,
      title,
      content: content || "",
      sections: sections || [],
      isPublished: isPublished !== undefined ? isPublished : true,
      order: order || 0,
      icon: icon || "",
      lastUpdatedBy: req.user?.id || "Admin"
    });

    return res.status(201).json({
      success: true,
      message: "Document created successfully",
      document
    });

  } catch (error) {
    console.error("ADD/UPDATE LEGAL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

// ========================================
// TOGGLE PUBLISH STATUS
// ========================================
exports.togglePublish = async (req, res) => {
  try {
    const page = await legalModel.findOne({
      type: req.params.type.toLowerCase()
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found"
      });
    }

    page.isPublished = !page.isPublished;
    await page.save();

    res.status(200).json({
      success: true,
      message: `Legal page ${page.isPublished ? "published" : "unpublished"}`,
      page
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========================================
// DELETE LEGAL DOCUMENT
// ========================================
exports.deleteLegalDocument = async (req, res) => {
  try {
    const document = await legalModel.findOneAndDelete({
      type: req.params.type.toLowerCase()
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("DELETE LEGAL DOC ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};