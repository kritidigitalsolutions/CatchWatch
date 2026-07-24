import { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
  Tag,
} from "lucide-react";
import "./Categories.css";

export default function Categories() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    priority: 0,
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/categories");
      if (res.data.success) {
        setCategories(res.data.categories || []);
        setTotalCount(res.data.total || res.data.categories.length);
        setActiveCount(res.data.activeCount || 0);
        setInactiveCount(res.data.inactiveCount || 0);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      showToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered list
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || cat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Form Change with Auto Slug
  const handleNameChange = (e) => {
    const nameVal = e.target.value;
    const autoSlug = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: autoSlug,
    }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      priority: (categories.length > 0 ? Math.max(...categories.map((c) => c.priority || 0)) + 1 : 1),
      status: "Active",
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      priority: cat.priority || 0,
      status: cat.status || "Active",
    });
    setShowEditModal(true);
  };

  // Submit Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Category name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post("/admin/categories/add", formData);
      if (res.data.success) {
        showToast("Category created successfully");
        setShowAddModal(false);
        fetchCategories();
      }
    } catch (err) {
      console.error("Create Category error:", err);
      showToast(err.response?.data?.message || "Failed to create category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Update Category
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      const res = await API.patch(`/admin/categories/${selectedCategory._id}`, formData);
      if (res.data.success) {
        showToast("Category updated successfully");
        setShowEditModal(false);
        setSelectedCategory(null);
        fetchCategories();
      }
    } catch (err) {
      console.error("Update Category error:", err);
      showToast(err.response?.data?.message || "Failed to update category", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Priority Change
  const handlePriorityChange = async (cat, delta) => {
    const newPriority = Math.max(0, (cat.priority || 0) + delta);
    try {
      await API.patch(`/admin/categories/${cat._id}`, { priority: newPriority });
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, priority: newPriority } : c))
      );
    } catch (err) {
      showToast("Failed to update priority", "error");
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === "Active" ? "Inactive" : "Active";
    try {
      await API.patch(`/admin/categories/${cat._id}`, { status: newStatus });
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, status: newStatus } : c))
      );
      if (newStatus === "Active") {
        setActiveCount((prev) => prev + 1);
        setInactiveCount((prev) => Math.max(0, prev - 1));
      } else {
        setActiveCount((prev) => Math.max(0, prev - 1));
        setInactiveCount((prev) => prev + 1);
      }
      showToast(`Category marked as ${newStatus}`);
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    const confirm = window.confirm(
      `Are you sure you want to delete category "${cat.name}"?`
    );
    if (!confirm) return;

    try {
      const res = await API.delete(`/admin/categories/${cat._id}`);
      if (res.data.success) {
        showToast("Category deleted successfully");
        fetchCategories();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete category", "error");
    }
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="categories-page">
      {/* ── Page Header ── */}
      <div className="cat-header">
        <div className="cat-header-info">
          <div className="cat-header-icon">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="cat-title">Categories</h1>
            <p className="cat-subtitle">
              Manage content categories displayed across the platform
            </p>
          </div>
        </div>
        <button className="btn-add-category" onClick={handleOpenAddModal}>
          <Plus size={18} />
          <span>Add Category</span>
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="cat-stats-grid">
        <div className="cat-stat-card total shadow-inner">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">TOTAL</div>
        </div>
        <div className="cat-stat-card active shadow-inner">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">ACTIVE</div>
        </div>
        <div className="cat-stat-card inactive shadow-inner">
          <div className="stat-value">{inactiveCount}</div>
          <div className="stat-label">INACTIVE</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="cat-controls-row">
        <div className="cat-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="cat-filter-tabs">
          {["All", "Active", "Inactive"].map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${statusFilter === tab ? "active" : ""}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Categories Table ── */}
      <div className="cat-table-card">
        {loading ? (
          <div className="cat-loading-state">
            <Loader2 size={32} className="spin-loader" />
            <span>Loading categories...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="cat-empty-state">
            <Tag size={40} className="empty-icon" />
            <h3>No categories found</h3>
            <p>Try refining your search or add a new category to get started.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="cat-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>CATEGORY</th>
                  <th>SLUG</th>
                  <th style={{ width: "120px" }}>PRIORITY</th>
                  <th style={{ width: "120px" }}>STATUS</th>
                  <th style={{ width: "140px" }}>CREATED</th>
                  <th style={{ width: "100px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat, index) => {
                  const letter = (cat.name || "C").charAt(0).toUpperCase();
                  return (
                    <tr key={cat._id}>
                      <td className="row-num">{index + 1}</td>
                      <td>
                        <div className="cat-name-cell">
                          <div className="cat-avatar">{letter}</div>
                          <span className="cat-name-text">{cat.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cat-slug-badge">{cat.slug}</span>
                      </td>
                      <td>
                        <div className="priority-control">
                          <div className="priority-arrows">
                            <button
                              className="arrow-btn"
                              title="Increase Priority"
                              onClick={() => handlePriorityChange(cat, 1)}
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              className="arrow-btn"
                              title="Decrease Priority"
                              onClick={() => handlePriorityChange(cat, -1)}
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <span className="priority-badge">{cat.priority || 0}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className={`status-pill ${cat.status.toLowerCase()}`}
                          onClick={() => handleToggleStatus(cat)}
                          title="Click to toggle status"
                        >
                          {cat.status === "Active" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          <span>{cat.status}</span>
                        </button>
                      </td>
                      <td className="date-cell">{formatDate(cat.createdAt)}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="action-btn edit"
                            title="Edit Category"
                            onClick={() => handleOpenEditModal(cat)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="action-btn delete"
                            title="Delete Category"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Category Modal ── */}
      {showAddModal && (
        <div className="cat-modal-overlay">
          <div className="cat-modal">
            <div className="modal-header">
              <h3>Create New Category</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Action Movies, Romance"
                    value={formData.name}
                    onChange={handleNameChange}
                  />
                </div>

                <div className="form-group">
                  <label>Slug (URL key) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. action-movies"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                  />
                  <small className="form-hint">
                    Used to identify content belonging to this category.
                  </small>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of this category..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority (Order)</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                    <small className="form-hint">Higher values display first</small>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Category Modal ── */}
      {showEditModal && (
        <div className="cat-modal-overlay">
          <div className="cat-modal">
            <div className="modal-header">
              <h3>Edit Category</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Update Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
