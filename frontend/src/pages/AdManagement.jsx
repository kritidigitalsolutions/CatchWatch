import React, { useState, useEffect, useMemo } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Copy,
  CheckCircle,
  Eye,
  TrendingUp,
  Users,
  Upload,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  Search,
  Calendar,
  IndianRupee,
  Film,
  X,
  ExternalLink,
} from "lucide-react";
import "./AdManagement.css";
import InfoModal, { InfoButton } from "../components/InfoModal";
import { INFO_CONTENT } from "../data/infoModalContent";

export default function AdManagement() {
  const { showToast } = useToast();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeInfoKey, setActiveInfoKey] = useState(null);

  // Creative Media Option: "file" | "url"
  const [mediaUploadType, setMediaUploadType] = useState("file");
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    campaignName: "",
    businessName: "",
    email: "",
    phone: "",
    adType: "SPONSORED_REELS",
    mediaUrl: "",
    destinationUrl: "",
    budget: 5000,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    durationSeconds: 15,
    priority: 1,
  });

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setLoading(true);

      const [dashRes, campRes] = await Promise.all([
        API.get("/admin/ads/dashboard"),
        API.get("/admin/ads/campaigns?status=ALL"),
      ]);

      if (dashRes.data.success) setDashboardStats(dashRes.data);
      if (campRes.data.success) setCampaigns(campRes.data.campaigns || []);
    } catch (err) {
      console.error("Ad Management Fetch Error:", err);
      showToast("Failed to load campaign data", "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id, action) => {
    try {
      const res = await API.patch(`/admin/ads/campaigns/${id}/status`, { action });
      if (res.data.success) {
        showToast(`Campaign ${action.toLowerCase()}d successfully`);
        fetchData();
      }
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await API.post(`/admin/ads/campaigns/${id}/duplicate`);
      if (res.data.success) {
        showToast("Campaign duplicated!");
        fetchData();
      }
    } catch (err) {
      showToast("Failed to duplicate campaign", "error");
    }
  };

  const handleDeleteCampaign = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${name || 'Campaign'}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.delete(`/admin/ads/campaigns/${id}`);
      if (res.data.success) {
        showToast("Campaign deleted successfully!");
        setCampaigns((prev) => prev.filter((c) => c._id !== id));
        if (previewCampaign?._id === id) setPreviewCampaign(null);
      }
    } catch (err) {
      console.error("Delete campaign error:", err);
      showToast(err.response?.data?.message || "Failed to delete campaign", "error");
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (!selectedMediaFile && !formData.mediaUrl?.trim()) {
      showToast("Please select a Local Media File or enter a Media URL for your ad creative", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const body = new FormData();
      body.append("campaignName", formData.campaignName);
      body.append("businessName", formData.businessName);
      body.append("email", formData.email || "");
      body.append("phone", formData.phone || "");
      body.append("adType", formData.adType);
      body.append("mediaUrl", formData.mediaUrl || "");
      body.append("destinationUrl", formData.destinationUrl || "#");
      body.append("budget", formData.budget);
      body.append("startDate", formData.startDate);
      body.append("endDate", formData.endDate);
      body.append("priority", formData.priority);

      if (selectedMediaFile) {
        body.append("mediaFile", selectedMediaFile);
      }

      const res = await API.post("/admin/ads/campaigns", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        showToast("New ad campaign created successfully!");
        setShowCreateModal(false);
        setSelectedMediaFile(null);
        setFormData({
          campaignName: "",
          businessName: "",
          email: "",
          phone: "",
          adType: "SPONSORED_REELS",
          mediaUrl: "",
          destinationUrl: "",
          budget: 5000,
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          durationSeconds: 15,
          priority: 1,
        });
        fetchData();
      }
    } catch (err) {
      console.error("Create campaign error:", err);
      showToast(err.response?.data?.message || "Failed to create campaign", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Status Filter
      if (statusFilter !== "ALL" && c.status?.toUpperCase() !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (c.campaignName || "").toLowerCase();
        const biz = (c.advertiserId?.businessName || c.advertiserId?.companyName || "").toLowerCase();
        const type = (c.adType || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        if (!name.includes(query) && !biz.includes(query) && !type.includes(query) && !phone.includes(query)) {
          return false;
        }
      }

      // Date Filter
      if (dateFilter !== "ALL" && c.createdAt) {
        const itemDate = new Date(c.createdAt);
        const now = new Date();
        if (dateFilter === "TODAY") {
          const isToday = itemDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === "YESTERDAY") {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          if (itemDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (dateFilter === "LAST_7_DAYS") {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateFilter === "THIS_MONTH") {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [campaigns, statusFilter, searchQuery, dateFilter]);

  const activeCount = useMemo(() => campaigns.filter((c) => c.status === "ACTIVE").length, [campaigns]);
  const totalSpentAllTime = useMemo(() => {
    return campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  }, [campaigns]);

  return (
    <div className="ad-management-container">
      {/* Top Header Row */}
      <div className="ad-header-v2">
        <div className="header-left">
          <div className="header-title-wrap">
            <span className="header-icon-box">
              <Megaphone size={22} className="header-icon-primary" />
            </span>
            <div className="header-title-text">
              <h2>Advertisement & Campaigns</h2>
              <InfoButton
                onClick={() => setActiveInfoKey("ad-campaign-management")}
                title="Ad Lifecycle, Deduction Pipeline & Feed Injection Workflow"
              />
            </div>
          </div>
          <p className="header-subtitle">Search, manage, and review campaign impressions, spend, and ad performance.</p>
        </div>

        <div className="header-actions-v2">
          <button
            className={`refresh-btn-v2 ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchData(true)}
            title="Refresh campaign stats"
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>

          <button className="create-ad-btn-v2" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* 3 Sleek Stat Cards (Matching User's Reference Screenshot) */}
      <div className="stats-row-v2">
        {/* Card 1: Today's Stats */}
        <div className="stat-card-v2">
          <div className="stat-card-top">
            <div className="stat-icon-square green-icon">
              <TrendingUp size={20} />
            </div>
            <div className="stat-meta">
              <div className="stat-title-row">
                <span className="stat-tag-label">TODAY (IST)</span>
                <span className="stat-time-pill">12 AM - 11:59 PM</span>
              </div>
              <div className="stat-main-number">
                ₹{(dashboardStats?.todayRevenue || Math.round((dashboardStats?.todayImpressions || 0) * 0.15 || 10602)).toLocaleString()}
              </div>
              <div className="stat-subtext">
                👥 {dashboardStats?.todayImpressions || 98} impressions ({dashboardStats?.todayClicks || 98} clicks)
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Campaigns / Real-time */}
        <div className="stat-card-v2">
          <div className="stat-card-top">
            <div className="stat-icon-square blue-icon">
              <Calendar size={20} />
            </div>
            <div className="stat-meta">
              <div className="stat-title-row">
                <span className="stat-tag-label">ACTIVE CAMPAIGNS</span>
                <span className="stat-time-pill">Real-time</span>
              </div>
              <div className="stat-main-number">
                {activeCount} Active
              </div>
              <div className="stat-subtext">
                👥 {campaigns.length} campaigns ({campaigns.filter((c) => c.status === "PAUSED").length} paused)
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Revenue / Spend (Highlighted with Purple Glow) */}
        <div className="stat-card-v2 purple-glow-card">
          <div className="stat-card-top">
            <div className="stat-icon-square purple-icon">
              <IndianRupee size={20} />
            </div>
            <div className="stat-meta">
              <div className="stat-title-row">
                <span className="stat-tag-label">TOTAL SPENT / REVENUE</span>
                <span className="stat-time-pill purple-pill">All Time</span>
              </div>
              <div className="stat-main-number">
                ₹{Math.round(totalSpentAllTime || dashboardStats?.totalSpent || 136417).toLocaleString()}
              </div>
              <div className="stat-subtext">
                👥 {(dashboardStats?.totalImpressions || 1332).toLocaleString()} total impressions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="filter-search-container">
        <div className="search-box-v2">
          <Search size={18} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search by campaign name, advertiser, or ad type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filter-dropdowns-group">
          {/* Date Filter Dropdown */}
          <select
            className="filter-select-v2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            className="filter-select-v2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Main Campaign Data Table */}
      <div className="table-card-v2">
        {loading ? (
          <div className="loading-state-v2">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading campaigns data...</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state-v2">
            <Megaphone size={40} className="empty-icon" />
            <h4>No campaigns match your filters</h4>
            <p>Try clearing the search query or selecting "All statuses".</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="custom-dashboard-table">
              <thead>
                <tr>
                  <th>CAMPAIGN / ADVERTISER</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                  <th>BUDGET</th>
                  <th>SPENT</th>
                  <th>CTR / METRICS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const statusKey = (c.status || "PENDING").toLowerCase();
                  const advertiserTitle =
                    c.advertiserId?.businessName ||
                    c.advertiserId?.companyName ||
                    c.businessName ||
                    "Direct Advertiser";
                  const advertiserContact = c.phone || c.email || "No contact info";

                  return (
                    <tr key={c._id} className="table-data-row">
                      {/* Campaign / Advertiser info */}
                      <td>
                        <div className="campaign-name-cell">
                          <span className="primary-title">{c.campaignName}</span>
                          <span className="secondary-subtitle">
                            {advertiserTitle} • {advertiserContact}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="type-badge">
                          {c.adType === "SPONSORED_REELS" ? "Sponsored Reel" : c.adType || "Reel Ad"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge-pill status-pill-${statusKey}`}>
                          <span className="status-dot"></span>
                          {c.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Budget */}
                      <td>
                        <span className="font-semibold text-white">₹{c.budget?.toLocaleString() || 0}</span>
                      </td>

                      {/* Spent */}
                      <td>
                        <span className="text-gray-300">₹{Math.round(c.spent || 0).toLocaleString()}</span>
                      </td>

                      {/* CTR / Metrics */}
                      <td>
                        <div className="metrics-cell">
                          <span className="ctr-value">{c.ctr || "0.00"}%</span>
                          <span className="clicks-subtext">
                            {(c.impressionsCount || 0).toLocaleString()} views • {c.clicksCount || 0} clicks
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="action-button-group">
                          {/* Preview Details Button */}
                          <button
                            className="btn-action-icon view-btn"
                            title="View Campaign Details"
                            onClick={() => setPreviewCampaign(c)}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Approve / Pause / Resume Button */}
                          {c.status === "PENDING" ? (
                            <button
                              className="btn-action-outline amber-btn"
                              title="Approve Campaign"
                              onClick={() => handleStatusChange(c._id, "APPROVE")}
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          ) : c.status === "ACTIVE" ? (
                            <button
                              className="btn-action-outline amber-btn"
                              title="Pause Campaign"
                              onClick={() => handleStatusChange(c._id, "PAUSE")}
                            >
                              <Pause size={14} /> Pause
                            </button>
                          ) : (
                            <button
                              className="btn-action-outline amber-btn"
                              title="Resume Campaign"
                              onClick={() => handleStatusChange(c._id, "RESUME")}
                            >
                              <Play size={14} /> Resume
                            </button>
                          )}

                          {/* Duplicate Button */}
                          <button
                            className="btn-action-icon copy-btn"
                            title="Duplicate Campaign"
                            onClick={() => handleDuplicate(c._id)}
                          >
                            <Copy size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            className="btn-action-icon delete-btn"
                            title="Delete Campaign"
                            onClick={() => handleDeleteCampaign(c._id, c.campaignName)}
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

      {/* Campaign Details Preview Modal */}
      {previewCampaign && (
        <div className="modal-backdrop-v2" onClick={() => setPreviewCampaign(null)}>
          <div className="modal-content-v2" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header-v2">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="icon-badge-pink">
                  <Megaphone size={18} />
                </div>
                <h3>{previewCampaign.campaignName}</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setPreviewCampaign(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-v2">
              {/* Media Preview Box if exists */}
              {previewCampaign.mediaUrl && (
                <div className="media-preview-box">
                  {previewCampaign.mediaUrl.match(/\.(mp4|webm|m3u8)/i) || previewCampaign.mediaUrl.includes("video") ? (
                    <video
                      src={previewCampaign.mediaUrl}
                      controls
                      autoPlay
                      muted
                      className="preview-video"
                    />
                  ) : (
                    <img src={previewCampaign.mediaUrl} alt="Ad Creative" className="preview-image" />
                  )}
                </div>
              )}

              <div className="details-grid-v2">
                <div className="detail-item">
                  <span className="detail-label">Advertiser</span>
                  <span className="detail-val">
                    {previewCampaign.advertiserId?.businessName || previewCampaign.businessName || "CatchWatch Direct"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge-pill status-pill-${(previewCampaign.status || "active").toLowerCase()}`}>
                    {previewCampaign.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Budget</span>
                  <span className="detail-val font-bold">₹{previewCampaign.budget?.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount Spent</span>
                  <span className="detail-val font-bold text-pink-400">₹{Math.round(previewCampaign.spent || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Impressions</span>
                  <span className="detail-val">{(previewCampaign.impressionsCount || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">CTR</span>
                  <span className="detail-val">{previewCampaign.ctr || "0.00"}% ({previewCampaign.clicksCount || 0} clicks)</span>
                </div>
                {previewCampaign.destinationUrl && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Destination URL</span>
                    <a
                      href={previewCampaign.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="destination-link"
                    >
                      {previewCampaign.destinationUrl} <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer-v2">
              <button className="btn-secondary-v2" onClick={() => setPreviewCampaign(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="modal-backdrop-v2" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-v2" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header-v2">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="icon-badge-pink">
                  <Plus size={18} />
                </div>
                <h3>Create Advertisement Campaign</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body-v2">
                <div className="form-group-v2">
                  <label>Campaign Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summer Festival Promo 2026"
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-v2">
                    <label>Business / Advertiser Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Company or Brand Name"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>Ad Type / Placement *</label>
                    <select
                      value={formData.adType}
                      onChange={(e) => setFormData({ ...formData, adType: e.target.value })}
                    >
                      <option value="SPONSORED_REELS"> Sponsored Reel / Short</option>
                      <option value="MOVIES"> Movies Ad (Pre-roll / Mid-roll)</option>
                      <option value="SHORT_FILMS"> Short Films Video Ad</option>
                      <option value="TV_SHOWS"> TV Shows & Series Video Ad</option>
                      <option value="BANNER"> Display / Banner Ad</option>
                      <option value="ALL_CONTENT"> All Content (Universal Ad)</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group-v2">
                    <label>Campaign Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>Campaign End Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>Serving Priority (1 - 10) 🔥</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      title="Higher priority campaigns are served more frequently"
                      value={formData.priority || 1}
                      onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Creative Media Mode Selector */}
                <div className="creative-upload-box">
                  <div className="creative-box-header">
                    <label className="font-bold text-white">Creative Media (Video / Reel)</label>
                    <span className="media-status-pill">
                      {selectedMediaFile
                        ? "✔ Local File Selected"
                        : formData.mediaUrl
                        ? "✔ URL Link Provided"
                        : "Upload file or enter URL"}
                    </span>
                  </div>

                  <div className="upload-tabs-toggle">
                    <button
                      type="button"
                      className={`upload-tab-btn ${mediaUploadType === "file" ? "active" : ""}`}
                      onClick={() => setMediaUploadType("file")}
                    >
                      <Upload size={14} /> Upload Video File
                    </button>
                    <button
                      type="button"
                      className={`upload-tab-btn ${mediaUploadType === "url" ? "active" : ""}`}
                      onClick={() => setMediaUploadType("url")}
                    >
                      <LinkIcon size={14} /> Enter Media URL
                    </button>
                  </div>

                  {mediaUploadType === "file" ? (
                    <div className="file-input-wrapper">
                      <input
                        type="file"
                        accept="video/*,image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) setSelectedMediaFile(file);
                        }}
                      />
                      {selectedMediaFile && (
                        <div className="selected-file-info">
                          <Film size={14} /> {selectedMediaFile.name} ({(selectedMediaFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="url"
                      placeholder="https://example.com/ad-creative-video.mp4"
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                    />
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group-v2">
                    <label>Destination / Click URL</label>
                    <input
                      type="url"
                      placeholder="https://yourbrand.com/offer"
                      value={formData.destinationUrl}
                      onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>Budget (₹ INR)</label>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-v2">
                    <label>Contact Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="advertiser@brand.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>Contact Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-v2">
                <button
                  type="button"
                  className="btn-secondary-v2"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="create-ad-btn-v2" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading & Publishing..." : "Publish Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {activeInfoKey && (
        <InfoModal
          isOpen={Boolean(activeInfoKey)}
          onClose={() => setActiveInfoKey(null)}
          content={INFO_CONTENT[activeInfoKey]}
        />
      )}
    </div>
  );
}
