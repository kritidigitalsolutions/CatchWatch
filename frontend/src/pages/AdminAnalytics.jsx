import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Activity,
  Award,
  DollarSign,
  Users,
  Play,
  TrendingUp,
  Calculator,
  RefreshCw,
  Crown,
  Film,
} from "lucide-react";
import "./AdManagement.css";
import InfoModal, { InfoButton } from "../components/InfoModal";
import { INFO_CONTENT } from "../data/infoModalContent";

export default function AdminAnalytics() {
  const { showToast } = useToast();
  const [liveData, setLiveData] = useState(null);
  const [leaderboards, setLeaderboards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeInfoKey, setActiveInfoKey] = useState(null);

  // Reward Simulator Form
  const [simForm, setSimForm] = useState({
    qualifiedViews: 5000000,
    watchMinutes: 4000000,
    completionRate: 90,
    shares: 40000,
    likes: 80000,
    comments: 12000,
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [liveRes, lbRes] = await Promise.all([
        API.get("/admin/analytics/live"),
        API.get("/admin/analytics/leaderboards"),
      ]);
      if (liveRes.data.success) setLiveData(liveRes.data);
      if (lbRes.data.success) setLeaderboards(lbRes.data);
    } catch (err) {
      console.error("Admin Analytics Fetch Error:", err);
      showToast("Failed to load analytics data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    try {
      setSimLoading(true);
      const res = await API.post("/admin/analytics/simulate-reward", simForm);
      if (res.data.success) {
        setSimResult(res.data);
        showToast("Monthly reward estimated!");
      }
    } catch (err) {
      showToast("Failed to calculate reward estimation", "error");
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="ad-management-container">
      {/* Header */}
      <div className="ad-header">
        <div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <h2>Live Monitoring & Platform Analytics</h2>
            <InfoButton
              onClick={() => setActiveInfoKey("live-analytics")}
              title="Learn about Live Analytics & Telemetry Engine"
            />
          </div>
          <p>Real-time ecosystem metrics, leaderboards, and creator pool simulators</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Live System Metrics Cards */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
        <h3 className="page-section-title" style={{ margin: 0 }}>Live System Metrics</h3>
        <InfoButton
          onClick={() => setActiveInfoKey("live-metrics")}
          title="How Live Metrics & Revenue are calculated"
          className="btn-blue"
        />
      </div>

      <div className="ad-stats-grid">
        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <Activity size={22} />
          </div>
          <div>
            <div className="stat-label">Live Active Users</div>
            <div className="stat-value">{liveData?.liveActiveUsers || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <Play size={22} />
          </div>
          <div>
            <div className="stat-label">Live Watching Users</div>
            <div className="stat-value">{liveData?.liveWatchingUsers || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="stat-label">Live Ad Impressions</div>
            <div className="stat-value">{liveData?.liveAdViews || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-label">Live Revenue</div>
            <div className="stat-value">₹{liveData?.liveRevenue || 0}</div>
          </div>
        </div>

        <div className="ad-stat-card">
          <div className="stat-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="stat-label">Active Creators</div>
            <div className="stat-value">{liveData?.liveCreators || 0}</div>
          </div>
        </div>
      </div>

      {/* Simulator Section */}
      <div style={{ marginTop: "32px", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
          <h3 className="page-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Calculator size={20} color="#ec4899" /> Monthly Creator Reward Simulator
          </h3>
          <InfoButton
            onClick={() => setActiveInfoKey("reward-simulator")}
            title="Reward Pool Algorithm & Payout Multiplier Formula"
            className="btn-amber"
          />
        </div>

        <div className="table-card" style={{ padding: "24px" }}>
          <form onSubmit={handleSimulate} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Qualified Views</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.qualifiedViews}
                onChange={(e) => setSimForm({ ...simForm, qualifiedViews: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Watch Minutes</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.watchMinutes}
                onChange={(e) => setSimForm({ ...simForm, watchMinutes: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completion Rate (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.completionRate}
                onChange={(e) => setSimForm({ ...simForm, completionRate: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Shares</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.shares}
                onChange={(e) => setSimForm({ ...simForm, shares: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Likes</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.likes}
                onChange={(e) => setSimForm({ ...simForm, likes: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Comments</label>
              <input
                type="number"
                className="form-control-input"
                value={simForm.comments}
                onChange={(e) => setSimForm({ ...simForm, comments: Number(e.target.value) })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="create-ad-btn" disabled={simLoading}>
                {simLoading ? "Calculating..." : "Calculate Reward Pool"}
              </button>
            </div>
          </form>

          {simResult && (
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border, rgba(255,255,255,0.1))", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div className="sim-result-box" style={{ background: "var(--bg3, rgba(255,255,255,0.03))", padding: "16px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border, transparent)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>Quality Score</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#ec4899" }}>{simResult.creatorQualityScore} / 100</div>
              </div>
              <div className="sim-result-box" style={{ background: "var(--bg3, rgba(255,255,255,0.03))", padding: "16px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border, transparent)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>Engagement Score</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#3b82f6" }}>{simResult.engagementScore.toLocaleString()}</div>
              </div>
              <div className="sim-result-box" style={{ background: "var(--bg3, rgba(255,255,255,0.03))", padding: "16px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border, transparent)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>Estimated Reward Pool</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#10b981" }}>₹{simResult.estimatedRewardPool.toLocaleString()}</div>
              </div>
              <div className="sim-result-box" style={{ background: "var(--bg3, rgba(255,255,255,0.03))", padding: "16px", borderRadius: "10px", textAlign: "center", border: "1px solid var(--border, transparent)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)", fontWeight: 600 }}>Avg Creator Payout</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b" }}>₹{simResult.averageCreatorReward.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboards */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
        <h3 className="page-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <Crown size={20} color="#facc15" /> Top Platform Creators Leaderboard
        </h3>
        <InfoButton
          onClick={() => setActiveInfoKey("top-creators-leaderboard")}
          title="Creator Tiers, Ranking & Points Architecture"
          className="btn-emerald"
        />
      </div>

      <div className="table-card" style={{overflow: "auto"}}>
        <table className="ad-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Creator Name</th>
              <th>Quality Score</th>
              <th>Creator Level</th>
              <th>Engagement Points</th>
              <th>Qualified Views</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboards?.topCreators || []).map((c, index) => (
              <tr key={c._id}>
                <td style={{ fontWeight: 700, color: "#facc15" }}>#{index + 1}</td>
                <td className="font-medium">{c.name} ({c.username})</td>
                <td>{c.qualityScore || 0}</td>
                <td>
                  <span className="status-pill status-active">{c.creatorLevel || "Beginner"}</span>
                </td>
                <td>{(c.totalEngagementPoints || 0).toLocaleString()}</td>
                <td>{(c.totalQualifiedViews || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reusable Info Modal Overlay */}
      <InfoModal
        isOpen={!!activeInfoKey}
        onClose={() => setActiveInfoKey(null)}
        data={activeInfoKey ? INFO_CONTENT[activeInfoKey] : null}
      />
    </div>
  );
}
