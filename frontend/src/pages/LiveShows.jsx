import React, { useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import Pagination from "../components/Pagination";
import {
  Tv,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Play,
  Eye,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Upload,
  X,
  Radio,
  Clock,
  Film,
  Sparkles,
} from "lucide-react";
import "./LiveShows.css";

const CATEGORIES = [
  "Live Show",
  "Music Concert",
  "Podcast",
  "Entertainment",
  "Talk Show",
  "Comedy",
  "Award Show",
  "Gaming",
  "Special Event",
  "News & Info",
];

export default function LiveShows() {
  const { showToast } = useToast ? useToast() : { showToast: (msg) => alert(msg) };

  // Data states
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, live: 0, upcoming: 0, ended: 0 });

  // Filter & Pagination
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShows, setTotalShows] = useState(0);
  const limit = 9;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [previewShow, setPreviewShow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const initialForm = {
    title: "",
    description: "",
    streamUrl: "",
    backupStreamUrl: "",
    streamType: "auto",
    category: "Live Show",
    tags: "",
    status: "LIVE",
    scheduledStartTime: new Date().toISOString().slice(0, 16),
    scheduledEndTime: "",
    thumbnail: "",
    banner: "",
    isFeatured: true,
    isPremium: false,
    isActive: true,
    viewersCount: 0,
  };

  const [formData, setFormData] = useState(initialForm);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  // Fetch live shows from admin API
  const fetchShows = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (activeTab !== "ALL") params.status = activeTab;
      if (selectedCategory !== "ALL") params.category = selectedCategory;

      const res = await API.get("/admin/live-shows", { params });
      if (res.data?.success) {
        const { shows: dataShows, pagination, stats: dataStats } = res.data.data || {};
        setShows(dataShows || []);
        setTotalPages(pagination?.totalPages || 1);
        setTotalShows(pagination?.total || 0);
        if (dataStats) setStats(dataStats);
      }
    } catch (err) {
      console.error("Failed to fetch live shows:", err);
      showToast(err.response?.data?.message || "Failed to load live shows", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, activeTab, selectedCategory]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingShow(null);
    setFormData(initialForm);
    setThumbnailFile(null);
    setBannerFile(null);
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (show) => {
    setEditingShow(show);
    setFormData({
      title: show.title || "",
      description: show.description || "",
      streamUrl: show.streamUrl || "",
      backupStreamUrl: show.backupStreamUrl || "",
      streamType: show.streamType || "auto",
      category: show.category || "Live Show",
      tags: Array.isArray(show.tags) ? show.tags.join(", ") : show.tags || "",
      status: show.status || "LIVE",
      scheduledStartTime: show.scheduledStartTime
        ? new Date(show.scheduledStartTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      scheduledEndTime: show.scheduledEndTime
        ? new Date(show.scheduledEndTime).toISOString().slice(0, 16)
        : "",
      thumbnail: show.thumbnail || "",
      banner: show.banner || "",
      isFeatured: show.isFeatured ?? true,
      isPremium: show.isPremium ?? false,
      isActive: show.isActive ?? true,
      viewersCount: show.viewersCount || 0,
    });
    setThumbnailFile(null);
    setBannerFile(null);
    setShowModal(true);
  };

  // Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Show title is required", "error");
      return;
    }
    if (!formData.streamUrl.trim()) {
      showToast("Live Stream URL is required", "error");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "thumbnail" && thumbnailFile) return;
        if (key === "banner" && bannerFile) return;
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      if (thumbnailFile) {
        data.append("thumbnail", thumbnailFile);
      }
      if (bannerFile) {
        data.append("banner", bannerFile);
      }

      if (editingShow) {
        await API.put(`/admin/live-shows/${editingShow._id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Live show updated successfully!", "success");
      } else {
        await API.post("/admin/live-shows", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Live show created successfully!", "success");
      }

      setShowModal(false);
      fetchShows();
    } catch (err) {
      console.error("Save live show failed:", err);
      showToast(err.response?.data?.message || "Failed to save live show", "error");
    } finally {
      setSaving(false);
    }
  };

  // Quick Status change
  const handleStatusChange = async (showId, newStatus) => {
    try {
      await API.patch(`/admin/live-shows/${showId}/status`, { status: newStatus });
      showToast(`Status changed to ${newStatus}`, "success");
      fetchShows();
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast(err.response?.data?.message || "Failed to change status", "error");
    }
  };

  // Delete Show
  const handleDelete = async (showId, showTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${showTitle}"?`)) return;
    try {
      await API.delete(`/admin/live-shows/${showId}`);
      showToast("Live show deleted", "success");
      fetchShows();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(err.response?.data?.message || "Failed to delete show", "error");
    }
  };

  // Copy Stream URL
  const handleCopyUrl = (id, url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("Stream URL copied to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="ls-container">
      {/* ── Header ── */}
      <div className="ls-header">
        <div className="ls-title-area">
          <div className="ls-header-icon">
            <Radio size={26} />
          </div>
          <div>
            <h1>Live Shows & Streaming</h1>
            <p>Broadcast live concerts, podcasts, talk shows, and special events</p>
          </div>
        </div>

        <div className="ls-header-actions">
          <button className="ls-btn ls-btn-secondary" onClick={fetchShows} title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button className="ls-btn ls-btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} /> Add Live Show
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="ls-stats-grid">
        <div className="ls-stat-card">
          <div className="ls-stat-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <Tv size={22} />
          </div>
          <div className="ls-stat-info">
            <span className="ls-stat-value">{stats.total}</span>
            <span className="ls-stat-label">Total Shows</span>
          </div>
        </div>

        <div className="ls-stat-card">
          <div className="ls-stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
            <Radio size={22} />
          </div>
          <div className="ls-stat-info">
            <span className="ls-stat-value" style={{ color: "#ef4444" }}>{stats.live}</span>
            <span className="ls-stat-label">Live Streaming Now</span>
          </div>
        </div>

        <div className="ls-stat-card">
          <div className="ls-stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Clock size={22} />
          </div>
          <div className="ls-stat-info">
            <span className="ls-stat-value" style={{ color: "#f59e0b" }}>{stats.upcoming}</span>
            <span className="ls-stat-label">Upcoming Scheduled</span>
          </div>
        </div>

        <div className="ls-stat-card">
          <div className="ls-stat-icon" style={{ background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" }}>
            <Film size={22} />
          </div>
          <div className="ls-stat-info">
            <span className="ls-stat-value">{stats.ended}</span>
            <span className="ls-stat-label">Ended / Replays</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Filters ── */}
      <div className="ls-toolbar">
        <div className="ls-tabs">
          {["ALL", "LIVE", "UPCOMING", "ENDED"].map((tab) => (
            <button
              key={tab}
              className={`ls-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
            >
              {tab === "LIVE" && <span className="ls-pulse-dot" style={{ background: "#ffffff" }} />}
              {tab === "ALL" ? "All Shows" : tab === "LIVE" ? "Live Now" : tab}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          {/* Category Dropdown */}
          <select
            className="ls-form-select"
            style={{ width: "auto", minWidth: "150px" }}
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="ls-search-box">
            <Search size={16} className="ls-search-icon" />
            <input
              type="text"
              placeholder="Search live show title, category, tags..."
              className="ls-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Content Grid / Cards ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "#94a3b8" }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: "#f97316" }} />
          <p>Loading live shows...</p>
        </div>
      ) : shows.length === 0 ? (
        <div className="ls-empty">
          <div className="ls-empty-icon">
            <Radio size={32} />
          </div>
          <h3>No Live Shows Found</h3>
          <p>Add a new live show stream with an onboarding URL to start broadcasting.</p>
          <button className="ls-btn ls-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Add First Live Show
          </button>
        </div>
      ) : (
        <div className="ls-grid">
          {shows.map((show) => {
            const isLive = show.status === "LIVE";
            const isUpcoming = show.status === "UPCOMING";
            const thumbnailSrc =
              show.thumbnail ||
              show.banner ||
              (show.youtubeVideoId
                ? `https://img.youtube.com/vi/${show.youtubeVideoId}/hqdefault.jpg`
                : "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=60");

            return (
              <div key={show._id} className="ls-card">
                {/* Media Banner */}
                <div className="ls-card-media">
                  <img src={thumbnailSrc} alt={show.title} className="ls-card-img" />

                  {isLive && (
                    <div className="ls-badge-live">
                      <span className="ls-pulse-dot" /> LIVE
                    </div>
                  )}
                  {isUpcoming && <div className="ls-badge-upcoming">UPCOMING</div>}
                  {show.status === "ENDED" && <div className="ls-badge-ended">ENDED</div>}

                  <div className="ls-viewers-badge">
                    <Eye size={12} /> {show.viewersCount || 0} watching
                  </div>
                </div>

                {/* Card Body */}
                <div className="ls-card-body">
                  <div className="ls-card-tags">
                    <span className="ls-category-pill">{show.category || "Live Show"}</span>
                    <span className="ls-type-pill">{show.resolvedStreamType || show.streamType || "HLS"}</span>
                    {show.isFeatured && (
                      <span className="ls-category-pill" style={{ color: "#eab308", background: "rgba(234, 179, 8, 0.12)" }}>
                        Featured
                      </span>
                    )}
                  </div>

                  <h3 className="ls-card-title">{show.title}</h3>
                  {show.description && <p className="ls-card-desc">{show.description}</p>}

                  {/* Stream URL Preview Box */}
                  <div className="ls-stream-preview-box">
                    <span className="ls-stream-text" title={show.streamUrl}>
                      {show.streamUrl}
                    </span>
                    <button
                      className="ls-copy-btn"
                      onClick={() => handleCopyUrl(show._id, show.streamUrl)}
                      title="Copy Stream URL"
                    >
                      {copiedId === show._id ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                    </button>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="ls-card-footer">
                    <select
                      className="ls-status-select"
                      value={show.status}
                      onChange={(e) => handleStatusChange(show._id, e.target.value)}
                    >
                      <option value="LIVE">🔴 LIVE</option>
                      <option value="UPCOMING">🟡 UPCOMING</option>
                      <option value="ENDED">⚪ ENDED</option>
                    </select>

                    <div className="ls-card-actions">
                      <button
                        className="ls-action-icon-btn preview"
                        title="Watch / Preview Stream"
                        onClick={() => setPreviewShow(show)}
                      >
                        <Play size={15} />
                      </button>
                      <button
                        className="ls-action-icon-btn"
                        title="Edit Show"
                        onClick={() => handleOpenEdit(show)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="ls-action-icon-btn danger"
                        title="Delete Show"
                        onClick={() => handleDelete(show._id, show.title)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalShows > limit && (
        <div style={{ marginTop: "2rem" }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="ls-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ls-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ls-modal-header">
              <h2>{editingShow ? "Edit Live Show" : "Add New Live Show"}</h2>
              <button className="ls-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ls-modal-body">
                {/* Title */}
                <div className="ls-form-group">
                  <label>Show Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Grand Music Concert Live 2026"
                    className="ls-form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Onboarding Stream URL */}
                <div className="ls-form-group">
                  <label>Onboarding Live Stream URL * (HLS .m3u8, YouTube, MP4)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/live/stream.m3u8 or https://www.youtube.com/watch?v=..."
                    className="ls-form-input"
                    value={formData.streamUrl}
                    onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  />
                  <span className="ls-helper-text">
                    Supported: HLS (.m3u8) streams, YouTube Live / Video URLs, direct MP4 streams, or embed links.
                  </span>
                </div>

                {/* Backup Stream URL */}
                <div className="ls-form-group">
                  <label>Backup Stream URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://backup-stream.example.com/live.m3u8"
                    className="ls-form-input"
                    value={formData.backupStreamUrl}
                    onChange={(e) => setFormData({ ...formData, backupStreamUrl: e.target.value })}
                  />
                </div>

                {/* Stream Type & Category */}
                <div className="ls-form-row">
                  <div className="ls-form-group">
                    <label>Stream Type</label>
                    <select
                      className="ls-form-select"
                      value={formData.streamType}
                      onChange={(e) => setFormData({ ...formData, streamType: e.target.value })}
                    >
                      <option value="auto">Auto Detect</option>
                      <option value="hls">HLS (.m3u8)</option>
                      <option value="youtube">YouTube</option>
                      <option value="mp4">Direct MP4 / WebM</option>
                      <option value="embed">Embed iframe</option>
                    </select>
                  </div>

                  <div className="ls-form-group">
                    <label>Category / Genre</label>
                    <input
                      type="text"
                      list="categories-list"
                      className="ls-form-input"
                      placeholder="e.g. Music Concert"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="categories-list">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Status & Scheduled Start Time */}
                <div className="ls-form-row">
                  <div className="ls-form-group">
                    <label>Status</label>
                    <select
                      className="ls-form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="LIVE">🔴 LIVE NOW</option>
                      <option value="UPCOMING">🟡 UPCOMING</option>
                      <option value="ENDED">⚪ ENDED</option>
                    </select>
                  </div>

                  <div className="ls-form-group">
                    <label>Scheduled Start Time</label>
                    <input
                      type="datetime-local"
                      className="ls-form-input"
                      value={formData.scheduledStartTime}
                      onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Poster / Thumbnail */}
                <div className="ls-form-group">
                  <label>Poster / Thumbnail Image URL or Upload File</label>
                  <input
                    type="url"
                    placeholder="https://... image poster URL"
                    className="ls-form-input"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  />
                  <div style={{ marginTop: "0.5rem" }}>
                    <label className="ls-file-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files[0])}
                      />
                      <Upload size={18} style={{ margin: "0 auto 0.25rem auto", color: "#f97316" }} />
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block" }}>
                        {thumbnailFile ? `Selected: ${thumbnailFile.name}` : "Click to browse thumbnail file from PC"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="ls-form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description about the show, performers, or broadcast..."
                    className="ls-form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                  <label className="ls-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    />
                    <span>Feature on Homepage Hero & Rail</span>
                  </label>

                  <label className="ls-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active (Visible on website & app)</span>
                  </label>
                </div>
              </div>

              <div className="ls-modal-footer">
                <button type="button" className="ls-btn ls-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ls-btn ls-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingShow ? "Update Show" : "Publish Live Show"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Live Stream Player Preview Modal ── */}
      {previewShow && (
        <div className="ls-modal-overlay" onClick={() => setPreviewShow(null)}>
          <div className="ls-modal ls-player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ls-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="ls-badge-live" style={{ position: "static" }}>
                  <span className="ls-pulse-dot" /> LIVE PREVIEW
                </span>
                <h2 style={{ fontSize: "1.1rem" }}>{previewShow.title}</h2>
              </div>
              <button className="ls-modal-close" onClick={() => setPreviewShow(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="ls-modal-body" style={{ padding: "1rem" }}>
              <div className="ls-player-container">
                {previewShow.youtubeVideoId || previewShow.streamUrl.includes("youtube") || previewShow.streamUrl.includes("youtu.be") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${
                      previewShow.youtubeVideoId ||
                      (previewShow.streamUrl.match(
                        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
                      )?.[1] || "")
                    }?autoplay=1`}
                    title={previewShow.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={previewShow.streamUrl}
                    controls
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                )}
              </div>

              <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Stream URL:</span>
                  <p style={{ margin: "0.2rem 0 0 0", fontFamily: "monospace", fontSize: "0.85rem", color: "#cbd5e1" }}>
                    {previewShow.streamUrl}
                  </p>
                </div>
                <button
                  className="ls-btn ls-btn-secondary"
                  onClick={() => handleCopyUrl(previewShow._id, previewShow.streamUrl)}
                >
                  <Copy size={14} /> Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
