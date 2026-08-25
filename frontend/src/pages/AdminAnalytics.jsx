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
  Sparkles,
  BarChart3
} from "lucide-react";
import "./AdminAnalytics.css";
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
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <div className="analytics-icon-box">
            <BarChart3 size={24} />
          </div>
          <div className="analytics-titles">
            <h2>
              <span>Live Monitoring & Platform Analytics</span>
              <InfoButton
                onClick={() => setActiveInfoKey("live-analytics")}
                title="Learn about Live Analytics & Telemetry Engine"
              />
            </h2>
            <p>Real-time ecosystem metrics, leaderboards, and creator pool simulators</p>
          </div>
        </div>

        <div className="analytics-actions">
          <button className="analytics-btn-refresh" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Section 1: Live System Metrics Cards */}
      <div className="analytics-section-title-wrap">
        <h3 className="analytics-section-title">
          <Activity size={18} color="#10b981" />
          <span>Live System Metrics</span>
        </h3>
        <InfoButton
          onClick={() => setActiveInfoKey("live-metrics")}
          title="How Live Metrics & Revenue are calculated"
          className="btn-blue"
        />
      </div>

      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <Activity size={22} />
          </div>
          <div>
            <div className="analytics-stat-label">Live Active Users</div>
            <div className="analytics-stat-value">{liveData?.liveActiveUsers || 0}</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <Play size={22} />
          </div>
          <div>
            <div className="analytics-stat-label">Live Watching Users</div>
            <div className="analytics-stat-value">{liveData?.liveWatchingUsers || 0}</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon" style={{ background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="analytics-stat-label">Live Ad Impressions</div>
            <div className="analytics-stat-value">{liveData?.liveAdViews || 0}</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="analytics-stat-label">Live Revenue</div>
            <div className="analytics-stat-value">₹{liveData?.liveRevenue || 0}</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="analytics-stat-label">Active Creators</div>
            <div className="analytics-stat-value">{liveData?.liveCreators || 0}</div>
          </div>
        </div>
      </div>

      {/* Section 2: Simulator Section */}
      <div className="analytics-panel-card">
        <div className="analytics-panel-header">
          <div className="analytics-section-title-wrap" style={{ margin: 0 }}>
            <h3 className="analytics-section-title" style={{ color: "#f472b6" }}>
              <Calculator size={20} />
              <span>Monthly Creator Reward Simulator</span>
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("reward-simulator")}
              title="Reward Pool Algorithm & Payout Multiplier Formula"
              className="btn-amber"
            />
          </div>
        </div>

        <form onSubmit={handleSimulate}>
          <div className="sim-form-grid">
            <div className="sim-field-group">
              <label className="sim-label">Qualified Views</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.qualifiedViews}
                onChange={(e) => setSimForm({ ...simForm, qualifiedViews: Number(e.target.value) })}
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-label">Watch Minutes</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.watchMinutes}
                onChange={(e) => setSimForm({ ...simForm, watchMinutes: Number(e.target.value) })}
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-label">Completion Rate (%)</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.completionRate}
                onChange={(e) => setSimForm({ ...simForm, completionRate: Number(e.target.value) })}
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-label">Total Shares</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.shares}
                onChange={(e) => setSimForm({ ...simForm, shares: Number(e.target.value) })}
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-label">Total Likes</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.likes}
                onChange={(e) => setSimForm({ ...simForm, likes: Number(e.target.value) })}
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-label">Total Comments</label>
              <input
                type="number"
                className="sim-input"
                value={simForm.comments}
                onChange={(e) => setSimForm({ ...simForm, comments: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button type="submit" className="sim-btn-calculate" disabled={simLoading}>
              <Sparkles size={16} />
              <span>{simLoading ? "Calculating..." : "Calculate Reward Pool"}</span>
            </button>
          </div>
        </form>

        {simResult && (
          <div className="sim-results-grid">
            <div className="sim-result-box">
              <div className="sim-result-lbl">Quality Score</div>
              <div className="sim-result-val" style={{ color: "#ec4899" }}>
                {simResult.creatorQualityScore} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/ 100</span>
              </div>
            </div>

            <div className="sim-result-box">
              <div className="sim-result-lbl">Engagement Score</div>
              <div className="sim-result-val" style={{ color: "#3b82f6" }}>
                {simResult.engagementScore?.toLocaleString()}
              </div>
            </div>

            <div className="sim-result-box">
              <div className="sim-result-lbl">Estimated Reward Pool</div>
              <div className="sim-result-val" style={{ color: "#10b981" }}>
                ₹{simResult.estimatedRewardPool?.toLocaleString()}
              </div>
            </div>

            <div className="sim-result-box">
              <div className="sim-result-lbl">Avg Creator Payout</div>
              <div className="sim-result-val" style={{ color: "#f59e0b" }}>
                ₹{simResult.averageCreatorReward?.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Leaderboards Table */}
      <div className="analytics-panel-card">
        <div className="analytics-panel-header">
          <div className="analytics-section-title-wrap" style={{ margin: 0 }}>
            <h3 className="analytics-section-title" style={{ color: "#facc15" }}>
              <Crown size={20} />
              <span>Top Platform Creators Leaderboard</span>
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("top-creators-leaderboard")}
              title="Creator Tiers, Ranking & Points Architecture"
              className="btn-emerald"
            />
          </div>
        </div>

        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Creator</th>
                <th>Quality Score</th>
                <th>Creator Level</th>
                <th>Engagement Points</th>
                <th>Qualified Views</th>
              </tr>
            </thead>
            <tbody>
              {(leaderboards?.topCreators || []).length > 0 ? (
                (leaderboards?.topCreators || []).map((c, index) => (
                  <tr key={c._id || index}>
                    <td>
                      <span className="rank-badge">#{index + 1}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#ffffff" }}>{c.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>@{c.username || "creator"}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: "#f472b6" }}>{c.qualityScore || 0}</span>
                    </td>
                    <td>
                      <span className="creator-tier-pill">{c.creatorLevel || "Beginner"}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#38bdf8" }}>
                      {(c.totalEngagementPoints || 0).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: "#cbd5e1" }}>
                      {(c.totalQualifiedViews || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                    No creators data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
