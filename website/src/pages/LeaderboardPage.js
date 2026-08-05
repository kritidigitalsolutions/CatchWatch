import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTrophy,
  FaCrown,
  FaMedal,
  FaCoins,
  FaEye,
  FaFilm,
  FaUsers,
  FaChevronRight,
} from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { LuSparkles } from "react-icons/lu";
import VerifiedBadge from "../components/VerifiedBadge";
import { getLeaderboard } from "../api/userApi";
import "./LeaderboardPage.css";

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = useCallback(async (timeframe) => {
    try {
      setLoading(true);
      const res = await getLeaderboard(timeframe, 100);
      if (res?.success) {
        setLeaderboard(res.leaderboard || []);
        setCurrentUserRank(res.currentUserRank || null);
      }
    } catch (err) {
      console.error("Fetch Leaderboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData(selectedTimeframe);
  }, [fetchLeaderboardData, selectedTimeframe]);

  // Table leaderboard: starts at Rank #4 when not searching (since #1, #2, #3 are in Top Podium), or searches across all creators when query is typed
  const tableLeaderboard = searchQuery.trim()
    ? leaderboard.filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          (item.name || "").toLowerCase().includes(q) ||
          (item.username || "").toLowerCase().includes(q) ||
          (item.creatorLevel || "").toLowerCase().includes(q)
        );
      })
    : leaderboard.filter((item) => item.rank >= 4);

  const top1 = leaderboard[0] || null;
  const top2 = leaderboard[1] || null;
  const top3 = leaderboard[2] || null;

  const getLevelBadgeColor = (lvl) => {
    if (lvl === "Premium Creator" || lvl === "Diamond") return "linear-gradient(135deg, #9333ea, #ec4899)";
    if (lvl === "Professional Creator" || lvl === "Gold") return "linear-gradient(135deg, #d97706, #f59e0b)";
    if (lvl === "Rising Creator" || lvl === "Silver") return "linear-gradient(135deg, #2563eb, #0284c7)";
    return "linear-gradient(135deg, #475569, #64748b)";
  };

  return (
    <div className="leaderboard-container">
      {/* Hero Header Banner */}
      <div className="leaderboard-hero-banner">
        <div className="hero-content">
          <div className="hero-icon-badge">
            <FaTrophy size={28} color="#f59e0b" />
          </div>
          <div>
            <h1 className="hero-title">CatchWatch Creator Leaderboard</h1>
            <p className="hero-subtitle">
              Recognizing top creators, engagement champions, and platform pioneers.
            </p>
          </div>
        </div>

        {/* Time Period Filter Pills */}
        <div className="leaderboard-time-pills">
          {[
            { key: "all", label: "All Time" },
            { key: "today", label: "Today" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "year", label: "This Year" },
          ].map((pill) => (
            <button
              key={pill.key}
              className={`time-pill-btn ${selectedTimeframe === pill.key ? "active" : ""}`}
              onClick={() => setSelectedTimeframe(pill.key)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading Leaderboard Rankings...</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Showcase Section */}
          {leaderboard.length >= 1 && (
            <div className="podium-section">
              {/* 2nd Place */}
              {top2 && (
                <div
                  className="podium-card silver-podium"
                  onClick={() => navigate(`/user/${top2.username || top2._id}`)}
                >
                  <div className="crown-badge silver-crown">
                    <FaMedal size={20} /> #2
                  </div>
                  <div className="avatar-wrapper">
                    <img
                      src={top2.profileImage || "/default-avatar.png"}
                      alt={top2.name}
                      className="podium-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <h3 className="podium-name">
                    {top2.name} {top2.blueTick && <VerifiedBadge />}
                  </h3>
                  <p className="podium-username">{top2.username}</p>
                  <div className="podium-score-pill">
                    <FaCoins size={14} color="#f59e0b" />
                    <span>{(top2.periodPoints || top2.totalPoints || 0).toLocaleString()} pts</span>
                  </div>
                  <div className="podium-level-tag" style={{ background: getLevelBadgeColor(top2.creatorLevel) }}>
                    {top2.creatorLevel}
                  </div>
                </div>
              )}

              {/* 1st Place Champion */}
              {top1 && (
                <div
                  className="podium-card gold-podium champion-podium"
                  onClick={() => navigate(`/user/${top1.username || top1._id}`)}
                >
                  <div className="crown-badge gold-crown">
                    <FaCrown size={24} /> #1 Champion
                  </div>
                  <div className="avatar-wrapper gold-avatar-ring">
                    <img
                      src={top1.profileImage || "/default-avatar.png"}
                      alt={top1.name}
                      className="podium-avatar champion-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <h3 className="podium-name champion-name">
                    {top1.name} {top1.blueTick && <VerifiedBadge />}
                  </h3>
                  <p className="podium-username">{top1.username}</p>
                  <div className="podium-score-pill gold-score">
                    <FaCoins size={16} color="#d97706" />
                    <span>{(top1.periodPoints || top1.totalPoints || 0).toLocaleString()} pts</span>
                  </div>
                  <div className="podium-level-tag" style={{ background: getLevelBadgeColor(top1.creatorLevel) }}>
                    <LuSparkles size={12} /> {top1.creatorLevel}
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div
                  className="podium-card bronze-podium"
                  onClick={() => navigate(`/user/${top3.username || top3._id}`)}
                >
                  <div className="crown-badge bronze-crown">
                    <FaMedal size={18} /> #3
                  </div>
                  <div className="avatar-wrapper">
                    <img
                      src={top3.profileImage || "/default-avatar.png"}
                      alt={top3.name}
                      className="podium-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <h3 className="podium-name">
                    {top3.name} {top3.blueTick && <VerifiedBadge />}
                  </h3>
                  <p className="podium-username">{top3.username}</p>
                  <div className="podium-score-pill">
                    <FaCoins size={14} color="#f59e0b" />
                    <span>{(top3.periodPoints || top3.totalPoints || 0).toLocaleString()} pts</span>
                  </div>
                  <div className="podium-level-tag" style={{ background: getLevelBadgeColor(top3.creatorLevel) }}>
                    {top3.creatorLevel}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Bar & Table Section */}
          <div className="table-section-container">
            <div className="table-header-bar">
              <h2 className="table-title">Full Leaderboard Roster</h2>
              <div className="search-input-wrap">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search creator by name or handle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Rankings Table */}
            <div className="leaderboard-table-card">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Creator</th>
                    <th>Level</th>
                    <th>Quality Score</th>
                    <th>Engagement Points</th>
                    <th>Activities</th>
                    <th>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        {searchQuery.trim()
                          ? `No creators matching "${searchQuery}"`
                          : "No additional creators ranked below top 3 yet. Keep creating content to rank!"}
                      </td>
                    </tr>
                  ) : (
                    tableLeaderboard.map((item) => (
                      <tr
                        key={item._id}
                        className="leaderboard-row"
                        onClick={() => navigate(`/user/${item.username || item._id}`)}
                      >
                        {/* Rank */}
                        <td>
                          <span
                            className={`rank-number-badge ${
                              item.rank === 1
                                ? "rank-1"
                                : item.rank === 2
                                ? "rank-2"
                                : item.rank === 3
                                ? "rank-3"
                                : ""
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>

                        {/* Creator Info */}
                        <td>
                          <div className="creator-cell">
                            <img
                              src={item.profileImage || "/default-avatar.png"}
                              alt={item.name}
                              className="creator-table-avatar"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
                              }}
                            />
                            <div>
                              <div className="creator-table-name">
                                {item.name} {item.blueTick && <VerifiedBadge />}
                              </div>
                              <div className="creator-table-handle">{item.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td>
                          <span
                            className="level-badge"
                            style={{ background: getLevelBadgeColor(item.creatorLevel) }}
                          >
                            {item.creatorLevel}
                          </span>
                        </td>

                        {/* Quality Score */}
                        <td>
                          <div className="score-meter-mini">
                            <div className="score-text">{item.qualityScore} / 100</div>
                            <div className="score-bar-bg">
                              <div
                                className="score-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, item.qualityScore))}%`,
                                  background: getLevelBadgeColor(item.creatorLevel),
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Points */}
                        <td>
                          <div className="points-cell">
                            <FaCoins size={14} color="#f59e0b" />
                            <span>{(item.periodPoints || item.totalPoints || 0).toLocaleString()} pts</span>
                          </div>
                        </td>

                        {/* Activities */}
                        <td>
                          <div className="activities-pill-group">
                            <span title="Reels Uploaded">
                              <FaFilm size={11} /> {item.reelsCount || 0}
                            </span>
                            <span title="Followers">
                              <FaUsers size={11} /> {item.followersCount || 0}
                            </span>
                            <span title="Qualified Views">
                              <FaEye size={11} /> {item.qualifiedViews || 0}
                            </span>
                          </div>
                        </td>

                        {/* Badges */}
                        <td>
                          <div className="badges-cell">
                            {(item.badges || []).map((badge, bIdx) => (
                              <span key={bIdx} className="badge-tag">
                                {badge}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky/Floating Current User Rank Card */}
          {currentUserRank && (
            <div className="current-user-rank-footer">
              <div className="user-rank-left">
                <span className="my-rank-badge">Your Rank: #{currentUserRank.rank}</span>
                <img
                  src={currentUserRank.profileImage || "/default-avatar.png"}
                  alt={currentUserRank.name}
                  className="user-rank-avatar"
                />
                <div>
                  <div className="user-rank-name">
                    {currentUserRank.name} {currentUserRank.blueTick && <VerifiedBadge />}
                  </div>
                  <div className="user-rank-sub">
                    {currentUserRank.creatorLevel} • {currentUserRank.totalPoints.toLocaleString()} Points
                  </div>
                </div>
              </div>

              <button
                className="goto-dashboard-btn"
                onClick={() => navigate("/creator/dashboard")}
              >
                Go to Creator Studio <FaChevronRight size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
