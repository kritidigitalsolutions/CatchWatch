const Admin = require("../../models/admin.model");
const bcrypt = require("bcryptjs");

// Get all sub-admins & staff stats
exports.getAllSubAdmins = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: "SUBADMIN" };

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { email: regex }];
    }

    const subadmins = await Admin.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 });

    const totalStaffAccounts = await Admin.countDocuments({ role: "SUBADMIN" });
    const activeSubAdmins = await Admin.countDocuments({ role: "SUBADMIN", isActive: true });
    const disabledSubAdmins = await Admin.countDocuments({ role: "SUBADMIN", isActive: false });

    return res.json({
      success: true,
      subadmins,
      stats: {
        totalStaffAccounts,
        activeSubAdmins,
        disabledSubAdmins,
      },
    });
  } catch (error) {
    console.error("Get All SubAdmins Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sub-admins",
    });
  }
};

// Create a new sub-admin
exports.createSubAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const subAdmin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "SUBADMIN",
      permissions: Array.isArray(permissions) ? permissions : [],
      isActive: true,
    });

    await subAdmin.save();

    const result = subAdmin.toObject();
    delete result.password;

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      subAdmin: result,
    });
  } catch (error) {
    console.error("Create SubAdmin Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create sub-admin",
    });
  }
};

// Update sub-admin
exports.updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, permissions, isActive } = req.body;

    const subAdmin = await Admin.findOne({ _id: id, role: "SUBADMIN" });
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found",
      });
    }

    if (email && email.toLowerCase() !== subAdmin.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken by another account",
        });
      }
      subAdmin.email = email.toLowerCase().trim();
    }

    if (name) subAdmin.name = name.trim();
    if (Array.isArray(permissions)) subAdmin.permissions = permissions;
    if (typeof isActive === "boolean") subAdmin.isActive = isActive;

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      subAdmin.password = await bcrypt.hash(password, 10);
    }

    await subAdmin.save();

    const result = subAdmin.toObject();
    delete result.password;

    return res.json({
      success: true,
      message: "Sub-admin updated successfully",
      subAdmin: result,
    });
  } catch (error) {
    console.error("Update SubAdmin Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update sub-admin",
    });
  }
};

// Toggle Sub-admin status
exports.toggleSubAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subAdmin = await Admin.findOne({ _id: id, role: "SUBADMIN" });

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found",
      });
    }

    subAdmin.isActive = !subAdmin.isActive;
    await subAdmin.save();

    return res.json({
      success: true,
      message: `Sub-admin account ${subAdmin.isActive ? "activated" : "disabled"} successfully`,
      isActive: subAdmin.isActive,
    });
  } catch (error) {
    console.error("Toggle SubAdmin Status Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle status",
    });
  }
};

// Delete Sub-admin
exports.deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const subAdmin = await Admin.findOneAndDelete({ _id: id, role: "SUBADMIN" });
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found or cannot be deleted",
      });
    }

    return res.json({
      success: true,
      message: "Sub-admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete SubAdmin Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete sub-admin",
    });
  }
};
