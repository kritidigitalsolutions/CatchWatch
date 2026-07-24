const Category = require("../../models/category.model");

// Seed initial categories if none exist
const seedInitialCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const initial = [
        { name: "Romance", slug: "romance", priority: 5, status: "Active" },
        { name: "Comedy", slug: "comedy", priority: 4, status: "Active" },
        { name: "Recommended", slug: "recommended", priority: 3, status: "Active" },
        { name: "Trending", slug: "trending", priority: 2, status: "Active" },
        { name: "Top10", slug: "top10", priority: 1, status: "Active" },
      ];
      await Category.insertMany(initial);
      console.log("Seeded initial default categories");
    }
  } catch (err) {
    console.error("Error seeding initial categories:", err.message);
  }
};

// ========================================
// ADD CATEGORY
// ========================================
const addCategory = async (req, res) => {
  try {
    const { name, slug, description, priority, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existingCategory = await Category.findOne({
      $or: [{ name: name.trim() }, { slug: generatedSlug }],
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "A category with this name or slug already exists",
      });
    }

    let finalPriority = priority !== undefined ? Number(priority) : 0;
    if (!finalPriority) {
      const maxCat = await Category.findOne().sort("-priority");
      finalPriority = maxCat && maxCat.priority ? maxCat.priority + 1 : 1;
    }

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description || "",
      priority: finalPriority,
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("ADD CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL CATEGORIES (ADMIN)
// ========================================
const getAllCategories = async (req, res) => {
  try {
    await seedInitialCategories();
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { slug: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const categories = await Category.find(filter).sort({ priority: -1, createdAt: -1 });

    const total = await Category.countDocuments();
    const activeCount = await Category.countDocuments({ status: "Active" });
    const inactiveCount = await Category.countDocuments({ status: "Inactive" });

    return res.json({
      success: true,
      total,
      activeCount,
      inactiveCount,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// ========================================
// GET SINGLE CATEGORY
// ========================================
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// ========================================
// UPDATE CATEGORY
// ========================================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, priority, status } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name && name.trim()) {
      category.name = name.trim();
    }

    if (slug && slug.trim()) {
      const formattedSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-");
      
      const existing = await Category.findOne({ slug: formattedSlug, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "A category with this slug already exists",
        });
      }
      category.slug = formattedSlug;
    }

    if (description !== undefined) category.description = description;
    if (priority !== undefined) category.priority = Number(priority) || 0;
    if (status !== undefined) category.status = status;

    await category.save();

    return res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// ========================================
// DELETE CATEGORY
// ========================================
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await Category.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

// ========================================
// GET PUBLIC CATEGORIES (WEBSITE)
// ========================================
const getPublicCategories = async (req, res) => {
  try {
    await seedInitialCategories();
    const categories = await Category.find({ status: "Active" }).sort({ priority: -1, createdAt: -1 });

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active categories",
    });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getPublicCategories,
};
