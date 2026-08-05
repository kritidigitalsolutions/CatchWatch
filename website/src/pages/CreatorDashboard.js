import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';

import API from "../api/axiosConfig";
import {
  FaAward,
  FaEye,
  FaClock,
  FaCheckCircle,
  FaUsers,
  FaShareAlt,
  FaBookmark,
  FaThumbsUp,
  FaHistory,
  FaFilm,
  FaCoins,
} from "react-icons/fa";
import { LuSparkles, LuMessageSquare } from "react-icons/lu";
import VerifiedBadge from "../components/VerifiedBadge";
import "./CreatorDashboard.css";

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW | REELS | HISTORY
  const [selectedTimeframe, setSelectedTimeframe] = useState("all"); // all | today | week | month | year
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (timeframe = "all") => {
    try {
      
      setLoading(true);
      const dashRes = await API.get(`/creator/dashboard?timeframe=${timeframe}`);
      if (dashRes.data?.success) {
        setDashboardData(dashRes.data);
      }
      try {
        const profRes = await API.get("/creator/profile");
        if (profRes.data?.success) {
          setProfile(profRes.data.user || profRes.data.creator);
        }
      } catch (e) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setProfile(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Fetch Creator Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedTimeframe);
    
  }, [fetchData, selectedTimeframe]);

  const score = dashboardData?.qualityScore || profile?.qualityScore || 0;
  const level = dashboardData?.creatorLevel || profile?.creatorLevel || "Beginner";
  const isVerified = Boolean(dashboardData?.blueTick || profile?.isVerified);

  const getBadgeColor = (lvl) => {
    if (lvl === "Premium Creator" || lvl === "Diamond") return "linear-gradient(135deg, #9333ea, #ec4899)";
    if (lvl === "Professional Creator" || lvl === "Gold") return "linear-gradient(135deg, #d97706, #f59e0b)";
    if (lvl === "Rising Creator" || lvl === "Silver") return "linear-gradient(135deg, #2563eb, #0284c7)";
    return "linear-gradient(135deg, #475569, #64748b)";
  };

  if (loading && !dashboardData) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Creator Dashboard...</p>
      </div>
    );
  }

  const timeStats = dashboardData?.timeStats || {
    today: { likes: 0, comments: 0, views: 0, saves: 0, shares: 0 },
    week: { likes: 0, comments: 0, views: 0, saves: 0, shares: 0 },
    month: { likes: 0, comments: 0, views: 0, saves: 0, shares: 0 },
    year: { likes: 0, comments: 0, views: 0, saves: 0, shares: 0 },
    total: { likes: 0, comments: 0, views: 0, saves: 0, shares: 0 },
  };

  return (
    <div className="creator-dashboard-container">
      {/* Profile & Quality Score Banner */}
      <div className="creator-banner-card">
        <div className="creator-banner-info">
          <div className="creator-avatar-wrap">
            <img
              src={profile?.profileImage || "/default-avatar.png"}
              alt="Avatar"
              className="creator-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
              }}
            />
            <div className="badge-pill" style={{ background: getBadgeColor(level) }}>
              <LuSparkles size={14} /> {level}
            </div>
          </div>
          <div>
            <h1 className="creator-name" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {profile?.name || "Creator Studio"}
              {isVerified && <VerifiedBadge />}
            </h1>
            <p className="creator-username">{profile?.username ? (profile.username.startsWith("@") ? profile.username : `@${profile.username}`) : "@creator"}</p>
          </div>
        </div>

        {/* Quality Score Meter */}
        <div className="quality-score-meter-card">
          <div className="meter-header">
            <span>Creator Quality Score</span>
            <span className="meter-score-text">{score} / 100</span>
          </div>
          <div className="meter-bar-track">
            <div
              className="meter-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, score))}%`,
                background: getBadgeColor(level),
              }}
            />
          </div>
          <div className="meter-labels">
            <span>Beginner (0-30)</span>
            <span>Rising (31-60)</span>
            <span>Pro (61-80)</span>
            <span>Premium (81-100)</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="filter-time-bar">
        <button
          className={`time-filter-btn ${activeTab === "OVERVIEW" ? "active" : ""}`}
          onClick={() => setActiveTab("OVERVIEW")}
        >
          Overview & Metrics
        </button>
        <button
          className={`time-filter-btn ${activeTab === "REELS" ? "active" : ""}`}
          onClick={() => setActiveTab("REELS")}
        >
          <FaFilm style={{ marginRight: "6px" }} /> Reels Performance ({dashboardData?.topReels?.length || 0})
        </button>
        <button
          className={`time-filter-btn ${activeTab === "HISTORY" ? "active" : ""}`}
          onClick={() => setActiveTab("HISTORY")}
        >
          <FaHistory style={{ marginRight: "6px" }} /> Points History Log ({dashboardData?.pointHistory?.length || 0})
        </button>
        <button
          className="time-filter-btn"
          style={{ background: "#fff7ed", borderColor: "#fed7aa", color: "#ea580c" }}
          onClick={() => navigate("/leaderboard")}
        >
          <FaAward style={{ marginRight: "6px" }} /> Community Leaderboard 🏆
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === "OVERVIEW" && (
        <>
          {/* Metric Cards Grid */}
          <div className="creator-cards-grid">
            <div className="creator-card">
              <div className="card-icon" style={{ background: "#fce7f3", color: "#db2777" }}>
                <FaAward size={22} />
              </div>
              <div>
                <div className="card-label">Quality Score</div>
                <div className="card-value">{score} / 100</div>
              </div>
            </div>

            <div className="creator-card">
              <div className="card-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
                <FaEye size={22} />
              </div>
              <div>
                <div className="card-label">Qualified Views</div>
                <div className="card-value">{(dashboardData?.qualifiedViews || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="creator-card">
              <div className="card-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                <FaClock size={22} />
              </div>
              <div>
                <div className="card-label">Qualified Watch Time</div>
                <div className="card-value">{dashboardData?.watchMinutes || 0} Mins</div>
              </div>
            </div>

            <div className="creator-card">
              <div className="card-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                <FaCheckCircle size={22} />
              </div>
              <div>
                <div className="card-label">Completion Rate</div>
                <div className="card-value">{dashboardData?.completionRate || 0}%</div>
              </div>
            </div>

            <div className="creator-card">
              <div className="card-icon" style={{ background: "#f3e8ff", color: "#9333ea" }}>
                <FaUsers size={22} />
              </div>
              <div>
                <div className="card-label">Followers Gained</div>
                <div className="card-value">{(dashboardData?.followers || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="creator-card">
              <div className="card-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                <FaCoins size={22} />
              </div>
              <div>
                <div className="card-label">Redeemable Coins</div>
                <div className="card-value">{(dashboardData?.redeemablePoints || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Time Period Filter Sub-Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            <h3 className="section-title" style={{ margin: 0 }}>Interactions & Performance By Time</h3>
            <div className="timeframe-pills" style={{ display: "flex", gap: "8px" }}>
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "This Week" },
                { key: "month", label: "This Month" },
                { key: "year", label: "This Year" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  className={`time-filter-btn ${selectedTimeframe === pill.key ? "active" : ""}`}
                  style={{ padding: "6px 14px", fontSize: "0.8rem", borderRadius: "10px" }}
                  onClick={() => setSelectedTimeframe(pill.key)}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engagement Counts Matrix for Selected Timeframe */}
          <div className="points-breakdown-grid" style={{ marginBottom: "32px" }}>
            <div className="point-card">
              <div className="point-header">
                <FaThumbsUp size={16} color="#2563eb" />
                <span>Likes Count</span>
              </div>
              <div className="point-value">{(dashboardData?.likes || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <LuMessageSquare size={16} color="#0891b2" />
                <span>Comments Count</span>
              </div>
              <div className="point-value">{(dashboardData?.comments || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaEye size={16} color="#059669" />
                <span>Qualified Views</span>
              </div>
              <div className="point-value">{(dashboardData?.viewsByTime?.[selectedTimeframe] || dashboardData?.qualifiedViews || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaShareAlt size={16} color="#8b5cf6" />
                <span>Shares Count</span>
              </div>
              <div className="point-value">{(dashboardData?.shares || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaBookmark size={16} color="#d97706" />
                <span>Saves Count</span>
              </div>
              <div className="point-value">{(dashboardData?.saves || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Comparative Time Breakdown Table */}
          <h3 className="section-title">Time Period Breakdown Matrix</h3>
          <div className="creator-card" style={{ padding: 0, overflow: "hidden", display: "block", marginBottom: "32px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "14px 18px" }}>Metric</th>
                  <th style={{ padding: "14px 18px" }}>Today</th>
                  <th style={{ padding: "14px 18px" }}>This Week</th>
                  <th style={{ padding: "14px 18px" }}>This Month</th>
                  <th style={{ padding: "14px 18px" }}>This Year</th>
                  <th style={{ padding: "14px 18px" }}>All Time</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaThumbsUp size={14} color="#2563eb" /> Likes
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.today?.likes || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.week?.likes || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.month?.likes || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.year?.likes || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: "#2563eb" }}>{(timeStats.total?.likes || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <LuMessageSquare size={14} color="#0891b2" /> Comments
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.today?.comments || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.week?.comments || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.month?.comments || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.year?.comments || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: "#0891b2" }}>{(timeStats.total?.comments || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaEye size={14} color="#059669" /> Views
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.today?.views || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.week?.views || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.month?.views || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.year?.views || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: "#059669" }}>{(timeStats.total?.views || 0).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaShareAlt size={14} color="#8b5cf6" /> Shares
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.today?.shares || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.week?.shares || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.month?.shares || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.year?.shares || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: "#8b5cf6" }}>{(timeStats.total?.shares || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaBookmark size={14} color="#d97706" /> Saves
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.today?.saves || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.week?.saves || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.month?.saves || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600 }}>{(timeStats.year?.saves || 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: "#d97706" }}>{(timeStats.total?.saves || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Time Points Breakdown */}
          <h3 className="section-title">Points Period Breakdown</h3>
          <div className="points-breakdown-grid" style={{ marginBottom: "32px" }}>
            <div className="point-card">
              <div className="point-header">
                <FaCoins size={16} color="#2563eb" />
                <span>Today's Points</span>
              </div>
              <div className="point-value">{(dashboardData?.todayPoints || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaCoins size={16} color="#059669" />
                <span>Weekly Points</span>
              </div>
              <div className="point-value">{(dashboardData?.weeklyPoints || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaCoins size={16} color="#d97706" />
                <span>Monthly Points</span>
              </div>
              <div className="point-value">{(dashboardData?.monthlyPoints || 0).toLocaleString()}</div>
            </div>

            <div className="point-card">
              <div className="point-header">
                <FaCoins size={16} color="#db2777" />
                <span>Lifetime Points</span>
              </div>
              <div className="point-value">{(dashboardData?.totalPoints || 0).toLocaleString()}</div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: REELS MONITORING & PERFORMANCE */}
      {activeTab === "REELS" && (
        <div className="creator-card" style={{ padding: 0, overflow: "hidden", display: "block" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "14px 18px" }}>Reel Details</th>
                <th style={{ padding: "14px 18px" }}>Views</th>
                <th style={{ padding: "14px 18px" }}>Likes</th>
                <th style={{ padding: "14px 18px" }}>Comments</th>
                <th style={{ padding: "14px 18px" }}>Shares</th>
                <th style={{ padding: "14px 18px" }}>Saves</th>
              </tr>
            </thead>
            <tbody>
              {(!dashboardData?.topReels || dashboardData.topReels.length === 0) ? (
                <tr>
                  <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>
                    No active reels uploaded yet
                  </td>
                </tr>
              ) : (
                dashboardData.topReels.map((reel) => (
                  <tr key={reel._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={reel.thumbnailUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%231e293b'/%3E%3Cpath d='M120 170 L190 200 L120 230 Z' fill='%2364748b'/%3E%3C/svg%3E"}
                        alt="Reel"
                        style={{ width: "44px", height: "58px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e5e7eb" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%231e293b'/%3E%3Cpath d='M120 170 L190 200 L120 230 Z' fill='%2364748b'/%3E%3C/svg%3E";
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: "#111827" }}>{reel.caption || "Untitled Reel"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 500 }}>{new Date(reel.createdAt).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 800, color: "#111827" }}>{(reel.viewsCount || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "#374151" }}>{(reel.likesCount || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "#374151" }}>{(reel.commentsCount || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "#374151" }}>{(reel.sharesCount || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "#374151" }}>{(reel.savesCount || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: POINTS HISTORY LOG */}
      {activeTab === "HISTORY" && (
        <div className="creator-card" style={{ padding: 0, overflow: "hidden", display: "block" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "14px 18px" }}>Timestamp</th>
                <th style={{ padding: "14px 18px" }}>Action</th>
                <th style={{ padding: "14px 18px" }}>Reel / Content</th>
                <th style={{ padding: "14px 18px" }}>User</th>
                <th style={{ padding: "14px 18px" }}>Points Earned</th>
              </tr>
            </thead>
            <tbody>
              {(!dashboardData?.pointHistory || dashboardData.pointHistory.length === 0) ? (
                <tr>
                  <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>
                    No points history logged yet
                  </td>
                </tr>
              ) : (
                dashboardData.pointHistory.map((item) => (
                  <tr key={item._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "14px 18px", fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background: item.points > 0 ? "#d1fae5" : "#fee2e2",
                          color: item.points > 0 ? "#059669" : "#dc2626",
                        }}
                      >
                        {item.action}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", color: "#374151", fontWeight: 600 }}>
                      {item.reel?.caption ? item.reel.caption.slice(0, 30) + "..." : "Reel Interaction"}
                    </td>
                    <td style={{ padding: "14px 18px", color: "#374151", fontWeight: 600 }}>
                      {item.user?.name || item.user?.username || "Guest User"}
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 800, color: item.points >= 0 ? "#059669" : "#dc2626" }}>
                      {item.points >= 0 ? `+${item.points}` : item.points} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
