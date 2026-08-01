import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";
import {
  FaDollarSign,
  FaChartLine,
  FaPlus,
  FaEye,
  FaMousePointer,
  FaBriefcase,
} from "react-icons/fa";
import "./CreatorDashboard.css";

export default function AdvertiserPortal() {
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    campaignName: "",
    businessName: "",
    companyName: "",
    gstNumber: "",
    email: "",
    phone: "",
    adType: "SPONSORED_REELS",
    mediaUrl: "",
    destinationUrl: "",
    budget: 5000,
    durationSeconds: 15,
  });

  const fetchData = async () => {
    try {
      const [dashRes, campRes] = await Promise.all([
        API.get("/ads/advertiser/dashboard"),
        API.get("/ads/advertiser/campaigns"),
      ]);
      if (dashRes.data?.success) setDashboard(dashRes.data);
      if (campRes.data?.success) setCampaigns(campRes.data.campaigns || []);
    } catch (err) {
      console.error("Fetch Advertiser Portal Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/ads/advertiser/campaigns", formData);
      if (res.data?.success) {
        alert("Ad Campaign submitted successfully for review!");
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      alert("Failed to submit campaign");
    }
  };

  return (
    <div className="creator-dashboard-container">
      {/* Header */}
      <div className="creator-banner-card">
        <div>
          <h1 className="creator-name" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaBriefcase size={28} color="#ec4899" /> Business Advertiser Portal
          </h1>
          <p className="creator-username">Purchase ads, target audience demographics, and track ROI</p>
        </div>
        <button
          className="time-filter-btn active"
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px" }}
          onClick={() => setShowModal(true)}
        >
          <FaPlus size={18} /> Buy Advertisement
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="creator-cards-grid">
        <div className="creator-card">
          <div className="card-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <FaDollarSign size={22} />
          </div>
          <div>
            <div className="card-label">Total Budget</div>
            <div className="card-value">₹{(dashboard?.totalBudget || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="creator-card">
          <div className="card-icon" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
            <FaChartLine size={22} />
          </div>
          <div>
            <div className="card-label">Spent</div>
            <div className="card-value">₹{(dashboard?.spent || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="creator-card">
          <div className="card-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <FaEye size={22} />
          </div>
          <div>
            <div className="card-label">Total Reach / Impressions</div>
            <div className="card-value">{(dashboard?.reach || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="creator-card">
          <div className="card-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <FaMousePointer size={22} />
          </div>
          <div>
            <div className="card-label">Average CTR</div>
            <div className="card-value">{dashboard?.ctr || "0.00"}%</div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <h3 className="section-title">My Ad Campaigns</h3>
      <div className="creator-card" style={{ padding: 0, overflow: "hidden", display: "block" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.05)", color: "#94a3b8" }}>
              <th style={{ padding: "14px 18px" }}>Campaign Name</th>
              <th style={{ padding: "14px 18px" }}>Status</th>
              <th style={{ padding: "14px 18px" }}>Budget</th>
              <th style={{ padding: "14px 18px" }}>Spent</th>
              <th style={{ padding: "14px 18px" }}>Clicks</th>
              <th style={{ padding: "14px 18px" }}>CTR</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                  No active ad campaigns yet. Click "Buy Advertisement" to start!
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "16px 18px", fontWeight: 600, color: "#fff" }}>{c.campaignName}</td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: c.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: c.status === "ACTIVE" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px" }}>₹{c.budget?.toLocaleString()}</td>
                  <td style={{ padding: "16px 18px" }}>₹{c.spent ? Math.round(c.spent).toLocaleString() : 0}</td>
                  <td style={{ padding: "16px 18px" }}>{c.totalClicks || 0}</td>
                  <td style={{ padding: "16px 18px" }}>{c.ctr || "0.00"}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ background: "#1e293b", padding: "24px", borderRadius: "14px" }}>
            <h3 style={{ color: "#fff", marginBottom: "16px" }}>Purchase Advertisement Campaign</h3>
            <form onSubmit={handleCreateCampaign}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Business / Company Name</label>
                <input
                  type="text"
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value, companyName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Campaign Name</label>
                <input
                  type="text"
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Ad Creative Video/Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://cdn.example.com/ad.mp4"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Destination URL (Website/App)</label>
                <input
                  type="url"
                  required
                  placeholder="https://mywebsite.com"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  value={formData.destinationUrl}
                  onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>Ad Budget (₹)</label>
                <input
                  type="number"
                  min="1000"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="time-filter-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="time-filter-btn active">
                  Submit Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
