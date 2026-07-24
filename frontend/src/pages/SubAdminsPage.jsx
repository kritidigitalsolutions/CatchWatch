import React, { useState, useEffect, useMemo } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
} from "lucide-react";
import "./SubAdminsPage.css";

// Define module hierarchy for the permissions table matrix
const MODULE_GROUPS = [
  {
    category: "CONTENT MANAGEMENT",
    modules: [
      { id: "content", name: "Movies", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "series", name: "Web Series & Episodes", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "dramas", name: "Short Dramas", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "categories", name: "Categories", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "add-content", name: "Add Content", hasCreate: true, hasEdit: false, hasDelete: false },
      { id: "ratings", name: "Ratings & Reviews", hasCreate: false, hasEdit: false, hasDelete: true },
    ],
  },
  {
    category: "USERS & SUBSCRIPTIONS",
    modules: [
      { id: "users", name: "Users & Accounts", hasCreate: false, hasEdit: true, hasDelete: true },
      { id: "plans", name: "Subscription Plans", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "promo", name: "Promo Codes & Vouchers", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "pricing", name: "User Subscriptions & Revenue", hasCreate: false, hasEdit: false, hasDelete: false },
    ],
  },
  {
    category: "SUPPORT & COMMUNICATION",
    modules: [
      { id: "notifications", name: "Notifications & Broadcasts", hasCreate: true, hasEdit: false, hasDelete: true },
      { id: "support", name: "Support & Tickets", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "legal", name: "Legal & Policy", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "help", name: "Help Center", hasCreate: true, hasEdit: true, hasDelete: true },
      { id: "settings", name: "Settings", hasCreate: false, hasEdit: true, hasDelete: false },
    ],
  },
];

const MODULE_DISPLAY_NAMES = {
  content: "Movies & Content",
  series: "Web Series",
  dramas: "Short Dramas",
  categories: "Categories",
  "add-content": "Add Content",
  ratings: "Ratings & Reviews",
  users: "Users & Accounts",
  plans: "Subscription Plans",
  promo: "Promo Codes & Vouchers",
  pricing: "User Subscriptions & Revenue",
  notifications: "Notifications",
  support: "Support & Tickets",
  legal: "Legal & Policy",
  help: "Help Center",
  settings: "Settings",
};

export default function SubAdminsPage() {
  const { showToast } = useToast() || { showToast: console.log };
  const [subadmins, setSubadmins] = useState([]);
  const [stats, setStats] = useState({
    totalStaffAccounts: 0,
    activeSubAdmins: 0,
    disabledSubAdmins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async (search = "") => {
    setLoading(true);
    try {
      const res = await API.get("/admin/subadmins", {
        params: { search },
      });
      if (res.data.success) {
        setSubadmins(res.data.subadmins || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Error loading subadmins:", err);
      showToast(err.response?.data?.message || "Failed to load sub-admins", "error");
    }
    setLoading(false);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchSubAdmins(val);
  };

  const openCreateModal = () => {
    setEditingSubAdmin(null);
    setForm({ name: "", email: "", password: "" });
    setSelectedPermissions([]);
    setModuleSearch("");
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (staff) => {
    setEditingSubAdmin(staff);
    setForm({
      name: staff.name || "",
      email: staff.email || "",
      password: "",
    });
    setSelectedPermissions(staff.permissions || []);
    setModuleSearch("");
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubAdmin(null);
  };

  // Permission Table Handlers
  const isPermissionChecked = (perm) => selectedPermissions.includes(perm);

  const togglePermission = (perm) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const isModuleAllChecked = (mod) => {
    const actions = ["view"];
    if (mod.hasCreate) actions.push("create");
    if (mod.hasEdit) actions.push("edit");
    if (mod.hasDelete) actions.push("delete");

    return (
      selectedPermissions.includes(mod.id) &&
      actions.every((act) => selectedPermissions.includes(`${mod.id}:${act}`))
    );
  };

  const toggleModuleAll = (mod) => {
    const actions = ["view"];
    if (mod.hasCreate) actions.push("create");
    if (mod.hasEdit) actions.push("edit");
    if (mod.hasDelete) actions.push("delete");

    const allPerms = [mod.id, ...actions.map((act) => `${mod.id}:${act}`)];
    const currentlyAll = isModuleAllChecked(mod);

    if (currentlyAll) {
      // Remove all for this module
      setSelectedPermissions(
        selectedPermissions.filter((p) => !allPerms.includes(p))
      );
    } else {
      // Add all for this module
      const set = new Set([...selectedPermissions, ...allPerms]);
      setSelectedPermissions(Array.from(set));
    }
  };

  const grantAllPermissions = () => {
    const all = [];
    MODULE_GROUPS.forEach((group) => {
      group.modules.forEach((mod) => {
        all.push(mod.id);
        all.push(`${mod.id}:view`);
        if (mod.hasCreate) all.push(`${mod.id}:create`);
        if (mod.hasEdit) all.push(`${mod.id}:edit`);
        if (mod.hasDelete) all.push(`${mod.id}:delete`);
      });
    });
    setSelectedPermissions(Array.from(new Set(all)));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSaveSubAdmin = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast("Name and email are required", "error");
      return;
    }

    if (!editingSubAdmin && !form.password) {
      showToast("Password is required for new sub-admin", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingSubAdmin) {
        // Edit Mode
        const payload = {
          name: form.name,
          email: form.email,
          permissions: selectedPermissions,
        };
        if (form.password) payload.password = form.password;

        const res = await API.put(`/admin/subadmins/${editingSubAdmin._id}`, payload);
        if (res.data.success) {
          showToast("Sub-admin updated successfully", "success");
          closeModal();
          fetchSubAdmins(searchQuery);
        }
      } else {
        // Create Mode
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          permissions: selectedPermissions,
        };

        const res = await API.post("/admin/subadmins", payload);
        if (res.data.success) {
          showToast("Sub-admin created successfully", "success");
          closeModal();
          fetchSubAdmins(searchQuery);
        }
      }
    } catch (err) {
      console.error("Save SubAdmin error:", err);
      showToast(err.response?.data?.message || "Failed to save sub-admin", "error");
    }
    setSaving(false);
  };

  const handleToggleStatus = async (staff) => {
    try {
      const res = await API.patch(`/admin/subadmins/${staff._id}/status`);
      if (res.data.success) {
        showToast(
          `Account ${res.data.isActive ? "activated" : "disabled"}`,
          "success"
        );
        fetchSubAdmins(searchQuery);
      }
    } catch (err) {
      showToast("Failed to toggle status", "error");
    }
  };

  const handleDeleteSubAdmin = async (staff) => {
    if (
      !window.confirm(
        `Are you sure you want to delete sub-admin account "${staff.name}"?`
      )
    ) {
      return;
    }

    try {
      const res = await API.delete(`/admin/subadmins/${staff._id}`);
      if (res.data.success) {
        showToast("Sub-admin deleted successfully", "success");
        fetchSubAdmins(searchQuery);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete sub-admin", "error");
    }
  };

  // Filter modules inside modal
  const filteredModuleGroups = useMemo(() => {
    if (!moduleSearch.trim()) return MODULE_GROUPS;
    const query = moduleSearch.toLowerCase();
    return MODULE_GROUPS.map((group) => ({
      ...group,
      modules: group.modules.filter((m) =>
        m.name.toLowerCase().includes(query)
      ),
    })).filter((group) => group.modules.length > 0);
  }, [moduleSearch]);

  // Format permission tags for the main table
  const renderPermissionBadges = (perms) => {
    if (!perms || perms.length === 0) {
      return <span className="no-perms-tag">No permissions</span>;
    }

    // Get unique module IDs from perms
    const moduleKeys = Array.from(
      new Set(
        perms.map((p) => (p.includes(":") ? p.split(":")[0] : p))
      )
    );

    return (
      <div className="perm-tags-wrapper">
        {moduleKeys.map((key) => (
          <span key={key} className="perm-chip">
            {MODULE_DISPLAY_NAMES[key] || key}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="subadmins-page">
      {/* ── Top Header ── */}
      <div className="subadmins-header">
        <div>
          <h1 className="subadmins-title">Sub-admins & Staff Management</h1>
          <p className="subadmins-subtitle">
            Create and manage role-based staff accounts with exact page control matrix
          </p>
        </div>
        <button className="add-subadmin-btn" onClick={openCreateModal}>
          <Plus size={18} />
          <span>+ Add Sub-admin</span>
        </button>
      </div>

      {/* ── Stats Overview Row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-box total">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalStaffAccounts}</div>
            <div className="stat-label">Total Staff Accounts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box active">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.activeSubAdmins}</div>
            <div className="stat-label">Active Sub-admins</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box disabled">
            <UserX size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.disabledSubAdmins}</div>
            <div className="stat-label">Disabled / Blocked</div>
          </div>
        </div>
      </div>

      {/* ── Main Data Card ── */}
      <div className="subadmins-content-card">
        {/* Search Bar */}
        <div className="table-filter-bar">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="staff-table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>ROLE</th>
                <th>ASSIGNED PERMISSIONS</th>
                <th>STATUS</th>
                <th>CREATED ON</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading sub-admins...
                  </td>
                </tr>
              ) : subadmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No staff accounts found. Click "+ Add Sub-admin" to create one.
                  </td>
                </tr>
              ) : (
                subadmins.map((staff) => {
                  const initial = staff.name ? staff.name.charAt(0).toUpperCase() : "S";
                  const createdDate = new Date(staff.createdAt).toLocaleDateString();

                  return (
                    <tr key={staff._id}>
                      <td>
                        <div className="member-info">
                          <div className="avatar-circle">{initial}</div>
                          <div>
                            <div className="member-name">{staff.name}</div>
                            <div className="member-email">{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-badge">SUBADMIN</span>
                      </td>
                      <td>{renderPermissionBadges(staff.permissions)}</td>
                      <td>
                        <button
                          className={`status-toggle-btn ${
                            staff.isActive ? "active" : "disabled"
                          }`}
                          onClick={() => handleToggleStatus(staff)}
                          title="Click to toggle status"
                        >
                          <span className="status-dot" />
                          {staff.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td>
                        <span className="date-text">{createdDate}</span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="action-icon-btn edit"
                            onClick={() => openEditModal(staff)}
                            title="Edit Permissions & Info"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="action-icon-btn delete"
                            onClick={() => handleDeleteSubAdmin(staff)}
                            title="Delete Sub-admin"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT SUB ADMIN MODAL ── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editingSubAdmin ? "Edit Sub Admin" : "Create Sub Admin"}</h2>
                <p>Assign only the permissions this admin should use.</p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubAdmin}>
              <div className="modal-body">
                {/* Form Inputs Row */}
                <div className="input-fields-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          editingSubAdmin
                            ? "Leave blank to keep password"
                            : "Set initial password"
                        }
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        required={!editingSubAdmin}
                      />
                      <button
                        type="button"
                        className="eye-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Module Permissions Matrix */}
                <div className="permissions-matrix-section">
                  <div className="matrix-header">
                    <h3>Module Permissions</h3>
                    <div className="matrix-actions">
                      <div className="module-search-input">
                        <Search size={16} />
                        <input
                          type="text"
                          placeholder="Find module..."
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="grant-all-btn"
                        onClick={grantAllPermissions}
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        className="clear-all-btn"
                        onClick={clearAllPermissions}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="matrix-table-wrap">
                    <table className="matrix-table">
                      <thead>
                        <tr>
                          <th>MODULE</th>
                          <th style={{ textAlign: "center" }}>VIEW</th>
                          <th style={{ textAlign: "center" }}>CREATE</th>
                          <th style={{ textAlign: "center" }}>EDIT</th>
                          <th style={{ textAlign: "center" }}>DELETE</th>
                          <th style={{ textAlign: "center" }}>ALL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModuleGroups.map((group) => (
                          <React.Fragment key={group.category}>
                            <tr className="category-header-row">
                              <td colSpan="6">{group.category}</td>
                            </tr>
                            {group.modules.map((mod) => {
                              const viewKey = `${mod.id}:view`;
                              const createKey = `${mod.id}:create`;
                              const editKey = `${mod.id}:edit`;
                              const deleteKey = `${mod.id}:delete`;

                              return (
                                <tr key={mod.id} className="module-row">
                                  <td className="module-name-cell">{mod.name}</td>
                                  
                                  {/* VIEW */}
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      className="perm-checkbox"
                                      checked={
                                        isPermissionChecked(viewKey) ||
                                        isPermissionChecked(mod.id)
                                      }
                                      onChange={() => {
                                        togglePermission(viewKey);
                                        if (!selectedPermissions.includes(mod.id)) {
                                          setSelectedPermissions((prev) => [
                                            ...prev,
                                            mod.id,
                                          ]);
                                        }
                                      }}
                                    />
                                  </td>

                                  {/* CREATE */}
                                  <td style={{ textAlign: "center" }}>
                                    {mod.hasCreate ? (
                                      <input
                                        type="checkbox"
                                        className="perm-checkbox"
                                        checked={isPermissionChecked(createKey)}
                                        onChange={() => {
                                          togglePermission(createKey);
                                          if (!selectedPermissions.includes(mod.id)) {
                                            setSelectedPermissions((prev) => [
                                              ...prev,
                                              mod.id,
                                            ]);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span className="dash-dim">—</span>
                                    )}
                                  </td>

                                  {/* EDIT */}
                                  <td style={{ textAlign: "center" }}>
                                    {mod.hasEdit ? (
                                      <input
                                        type="checkbox"
                                        className="perm-checkbox"
                                        checked={isPermissionChecked(editKey)}
                                        onChange={() => {
                                          togglePermission(editKey);
                                          if (!selectedPermissions.includes(mod.id)) {
                                            setSelectedPermissions((prev) => [
                                              ...prev,
                                              mod.id,
                                            ]);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span className="dash-dim">—</span>
                                    )}
                                  </td>

                                  {/* DELETE */}
                                  <td style={{ textAlign: "center" }}>
                                    {mod.hasDelete ? (
                                      <input
                                        type="checkbox"
                                        className="perm-checkbox"
                                        checked={isPermissionChecked(deleteKey)}
                                        onChange={() => {
                                          togglePermission(deleteKey);
                                          if (!selectedPermissions.includes(mod.id)) {
                                            setSelectedPermissions((prev) => [
                                              ...prev,
                                              mod.id,
                                            ]);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <span className="dash-dim">—</span>
                                    )}
                                  </td>

                                  {/* ALL */}
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      className="perm-checkbox"
                                      checked={isModuleAllChecked(mod)}
                                      onChange={() => toggleModuleAll(mod)}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSubAdmin
                    ? "Update Sub Admin"
                    : "Create Sub Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
