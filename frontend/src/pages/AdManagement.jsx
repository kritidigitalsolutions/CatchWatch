import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Copy,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  RefreshCw,
  Upload,
  Link,
  FileVideo,
  Trash2,
} from "lucide-react";
import "./AdManagement.css";

export default function AdManagement() {
  const { showToast } = useToast();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    durationSeconds: 15,
    priority: 1,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, campRes] = await Promise.all([
        API.get("/admin/ads/dashboard"),
        API.get(`/admin/ads/campaigns?status=${activeTab}`),
      ]);
      if (dashRes.data.success) setDashboardStats(dashRes.data);
      if (campRes.data.success) setCampaigns(campRes.data.campaigns || []);
    } catch (err) {
      console.error("Ad Management Fetch Error:", err);
      showToast("Failed to load campaign data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
        fetchData();
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
      body.append("priority", formData.priority);

      if (selectedMediaFile) {
        body.append("mediaFile", selectedMediaFile);
      }

      const res = await API.post("/admin/ads/campaigns", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        showToast("New ad campaign created successfully!");
        setShowModal(false);
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

  return (
    <div className="ad-management-container" style={{ padding: "24px", color: "#f8fafc" }}>
      {/* Header */}
      <div className="ad-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>Advertisement & Campaign Management</h2>
          <p>Monitor real-time impressions, click-through rates (CTR), and create sponsored ad campaigns</p>
        </div>
        <button className="create-ad-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Create New Campaign
        </button>
      </div>

      {/* Metrics Row (Responsive 4-Column Grid) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="ad-stat-card" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon-wrap" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Megaphone size={22} />
          </div>
          <div>
            <div className="stat-label">Active Campaigns</div>
            <div className="stat-value">{dashboardStats?.activeCampaignsCount || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={22} />
          </div>
          <div>
            <div className="stat-label">Total Impressions</div>
            <div className="stat-value">{(dashboardStats?.totalImpressions || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="ad-stat-card" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={22} />
          </div>
          <div>
            <div className="stat-label">Total Clicks</div>
            <div className="stat-value">{(dashboardStats?.totalClicks || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="ad-stat-card" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="stat-label">Average CTR</div>
            <div className="stat-value">{dashboardStats?.averageCtr || "0.00"}%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation" style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["ALL", "ACTIVE", "PENDING", "PAUSED", "COMPLETED"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              background: activeTab === tab ? "#ec4899" : "#1e293b",
              color: "#fff",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">No campaigns found</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Advertiser</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>CTR</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td className="font-medium">{c.campaignName}</td>
                  <td>{c.advertiserId?.businessName || c.advertiserId?.companyName || "CatchWatch Ad"}</td>
                  <td>
                    <span className={`status-pill status-${c.status?.toLowerCase()}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>₹{c.budget?.toLocaleString()}</td>
                  <td>₹{c.spent ? Math.round(c.spent).toLocaleString() : 0}</td>
                  <td>{c.ctr || "0.00"}%</td>
                  <td>Level {c.priority || 1}</td>
                  <td>
                    <div className="action-buttons" style={{ display: "flex", gap: "6px" }}>
                      {c.status === "PENDING" && (
                        <button
                          className="btn-icon btn-approve"
                          title="Approve Campaign"
                          onClick={() => handleStatusChange(c._id, "APPROVE")}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {c.status === "ACTIVE" ? (
                        <button
                          className="btn-icon btn-pause"
                          title="Pause Campaign"
                          onClick={() => handleStatusChange(c._id, "PAUSE")}
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          className="btn-icon btn-play"
                          title="Resume Campaign"
                          onClick={() => handleStatusChange(c._id, "RESUME")}
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        className="btn-icon btn-copy"
                        title="Duplicate Campaign"
                        onClick={() => handleDuplicate(c._id)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        title="Delete Campaign"
                        style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                        onClick={() => handleDeleteCampaign(c._id, c.campaignName)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "580px" }}>
            <div className="modal-header">
              <h3>Create Advertisement Campaign</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label>Campaign Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Festival Promo"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business / Advertiser Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Company Name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Ad Type</label>
                  <select
                    value={formData.adType}
                    onChange={(e) => setFormData({ ...formData, adType: e.target.value })}
                  >
                    <option value="SPONSORED_REELS">Sponsored Reel / Short</option>
                    <option value="VIDEO">Video Ad</option>
                    <option value="BANNER">Banner Ad</option>
                    <option value="CAROUSEL">Carousel Ad</option>
                    <option value="SPLASH">Splash Screen Ad</option>
                  </select>
                </div>
              </div>

              {/* Creative Media Mode Selector */}
              <div className="form-group" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ margin: 0, fontWeight: 700 }}>Creative Media (Video or Image)</label>
                  <span style={{ fontSize: "0.75rem", color: "#ec4899", fontWeight: 700 }}>
                    {selectedMediaFile ? "✔ Local File Uploaded" : formData.mediaUrl ? "✔ URL Link Provided" : "Optional URL or File"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <button
                    type="button"
                    className={`tab-btn ${mediaUploadType === "file" ? "active" : ""}`}
                    onClick={() => setMediaUploadType("file")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: mediaUploadType === "file" ? "#ec4899" : "#1e293b",
                      border: "none",
                      color: "#fff",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    <Upload size={14} /> Upload from Local Device
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${mediaUploadType === "url" ? "active" : ""}`}
                    onClick={() => setMediaUploadType("url")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: mediaUploadType === "url" ? "#ec4899" : "#1e293b",
                      border: "none",
                      color: "#fff",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    <Link size={14} /> Enter Media URL Link
                  </button>
                </div>

                {mediaUploadType === "file" ? (
                  <div>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setSelectedMediaFile(file);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        background: "#0f172a",
                        border: "1px dashed rgba(236, 72, 153, 0.4)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    />
                    {selectedMediaFile && (
                      <div style={{ marginTop: "8px", fontSize: "0.78rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        <FileVideo size={14} /> Selected: {selectedMediaFile.name} ({(selectedMediaFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://cdn.example.com/ad-video.mp4 (Optional if local file chosen)"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Destination / Call-to-Action URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/landing-page"
                  value={formData.destinationUrl}
                  onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Budget (₹)</label>
                  <input
                    type="number"
                    min="500"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading & Publishing..." : "Publish Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
