import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  ShieldAlert,
  Bot,
  Smartphone,
  Globe,
  Zap,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
} from "lucide-react";
import "./AdManagement.css";

export default function FraudMonitoring() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        API.get("/admin/fraud/stats"),
        API.get(`/admin/fraud/logs?fraudType=${filterType}&search=${searchQuery}`),
      ]);
      if (statsRes.data.success) setStats(statsRes.data);
      if (logsRes.data.success) setLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error("Fraud Monitoring Fetch Error:", err);
      showToast("Failed to fetch fraud logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="ad-management-container">
      {/* Header */}
      <div className="ad-header">
        <div>
          <h2>Fraud Detection & Security Monitoring</h2>
          <p>Real-time view verification checks, bot prevention, and anti-click farm engine</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="ad-stats-grid">
        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="stat-label">Total Flagged Attempts</div>
            <div className="stat-value">{stats?.totalFraudAttempts || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
            <Bot size={22} />
          </div>
          <div>
            <div className="stat-label">Bot / Crawler Views</div>
            <div className="stat-value">{stats?.breakdown?.botViews || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div className="stat-label">Duplicate Devices</div>
            <div className="stat-value">{stats?.breakdown?.duplicateDevices || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Globe size={22} />
          </div>
          <div>
            <div className="stat-label">Duplicate IPs</div>
            <div className="stat-value">{stats?.breakdown?.duplicateIPs || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="stat-label">Click Farms / Rapid</div>
            <div className="stat-value">
              {(stats?.breakdown?.clickFarms || 0) + (stats?.breakdown?.rapidRefreshes || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="tab-navigation" style={{ marginBottom: 0 }}>
          {["ALL", "BOT_VIEW", "DUPLICATE_DEVICE", "DUPLICATE_IP", "RAPID_REFRESH", "CLICK_FARM", "AUTO_REFRESH"].map((t) => (
            <button
              key={t}
              className={`tab-btn ${filterType === t ? "active" : ""}`}
              onClick={() => setFilterType(t)}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Search IP, Device, User..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "0.85rem",
            }}
          />
          <button type="submit" className="refresh-btn">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">Scanning fraud logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No fraud attempts detected</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Fraud Type</th>
                <th>IP Address</th>
                <th>Device ID</th>
                <th>Viewer / User</th>
                <th>Details</th>
                <th>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                      }}
                    >
                      {log.fraudType}
                    </span>
                  </td>
                  <td className="font-medium">{log.ip || "Unknown IP"}</td>
                  <td style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
                    {log.deviceId ? log.deviceId.substring(0, 14) + "..." : "N/A"}
                  </td>
                  <td>{log.viewerId?.name || log.viewerId?.username || "Guest Viewer"}</td>
                  <td style={{ maxWidth: "260px", fontSize: "0.8rem" }}>{log.details}</td>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                      }}
                    >
                      {log.actionTaken}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
