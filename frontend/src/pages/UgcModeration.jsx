import { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Ban,
  UserX,
  Search,
  RefreshCw,
  Clock,
  Film,
  MessageSquare,
  User,
  ExternalLink,
  X,
  Filter,
  Check,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Shield,
  Layers,
  ArrowRight,
  UserCheck,
  AlertOctagon,
  FileText,
} from "lucide-react";
import "./UgcModeration.css";

export default function UgcModeration() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("REPORTS"); // "REPORTS" | "BLOCKS"
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    reviewedReports: 0,
    actionTakenReports: 0,
    dismissedReports: 0,
    reelReports: 0,
    commentReports: 0,
    userReports: 0,
    totalBlocks: 0,
    totalBannedUsers: 0,
  });

  // Reports Table State
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");

  // User Blocks State
  const [blocks, setBlocks] = useState([]);
  const [blocksTotal, setBlocksTotal] = useState(0);
  const [blocksPage, setBlocksPage] = useState(1);
  const [blocksTotalPages, setBlocksTotalPages] = useState(1);
  const [blocksSearch, setBlocksSearch] = useState("");
  const [blocksLoading, setBlocksLoading] = useState(false);

  // Review & Action Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionStatus, setActionStatus] = useState("ACTION_TAKEN");
  const [actionType, setActionType] = useState("CONTENT_DELETED");
  const [adminNotes, setAdminNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "REPORTS") {
      fetchReports();
    } else if (activeTab === "BLOCKS") {
      fetchUserBlocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, statusFilter, typeFilter, reasonFilter, blocksPage]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await API.get("/admin/reports/stats");
      if (res.data?.success) {
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to load moderation stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch UGC Reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/reports", {
        params: {
          page,
          limit: 15,
          status: statusFilter,
          targetType: typeFilter,
          reason: reasonFilter,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) {
        setReports(res.data.reports || []);
        setReportsTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
      showToast(err.response?.data?.message || "Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch User-to-User Blocks
  const fetchUserBlocks = async () => {
    setBlocksLoading(true);
    try {
      const res = await API.get("/admin/reports/blocks", {
        params: {
          page: blocksPage,
          limit: 15,
          search: blocksSearch.trim() || undefined,
        },
      });
      if (res.data?.success) {
        setBlocks(res.data.blocks || []);
        setBlocksTotal(res.data.total || 0);
        setBlocksTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load user blocks:", err);
      showToast(err.response?.data?.message || "Failed to load user blocks", "error");
    } finally {
      setBlocksLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleBlocksSearchSubmit = (e) => {
    e.preventDefault();
    setBlocksPage(1);
    fetchUserBlocks();
  };

  const openActionModal = (report) => {
    setSelectedReport(report);
    setActionStatus(report.status === "PENDING" ? "ACTION_TAKEN" : report.status);
    setActionType(report.actionTaken && report.actionTaken !== "NONE" ? report.actionTaken : "CONTENT_DELETED");
    setAdminNotes(report.adminNotes || "");
  };

  const closeActionModal = () => {
    setSelectedReport(null);
    setAdminNotes("");
    setSubmittingAction(false);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setSubmittingAction(true);
    try {
      const res = await API.patch(`/admin/reports/${selectedReport._id}`, {
        status: actionStatus,
        actionTaken: actionStatus === "DISMISSED" ? "NONE" : actionType,
        adminNotes,
      });

      if (res.data?.success) {
        showToast("Report resolved and moderation action executed successfully!", "success");
        closeActionModal();
        fetchReports();
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to resolve report:", err);
      showToast(err.response?.data?.message || "Failed to resolve report", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Quick Action: Ban User Globally from Block List
  const handleBanUserGlobally = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to ban and block ${userName || "this user"} from Catch & Watch?`)) {
      return;
    }
    try {
      const res = await API.patch(`/admin/user/${userId}/block`);
      if (res.data?.success) {
        showToast(`User ${userName || ""} banned successfully!`, "success");
        fetchUserBlocks();
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to ban user:", err);
      showToast(err.response?.data?.message || "Failed to ban user", "error");
    }
  };

  // Quick Action: Remove User-to-User Block
  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm("Remove this user block entry?")) return;
    try {
      const res = await API.delete(`/admin/reports/blocks/${blockId}`);
      if (res.data?.success) {
        showToast("Block removed successfully", "success");
        fetchUserBlocks();
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to remove block:", err);
      showToast(err.response?.data?.message || "Failed to remove block", "error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReasonBadgeClass = (reason) => {
    switch (reason) {
      case "HARASSMENT":
      case "HATE_SPEECH":
      case "VIOLENCE":
        return "badge-danger";
      case "NUDITY_OR_SEXUAL":
      case "SCAM_OR_FRAUD":
      case "COPYRIGHT_VIOLATION":
        return "badge-warning";
      case "SPAM":
      case "INAPPROPRIATE_CONTENT":
        return "badge-purple";
      default:
        return "badge-secondary";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="status-badge pending"><span className="pulse-dot"></span> Pending Review</span>;
      case "REVIEWED":
        return <span className="status-badge reviewed"><Eye size={12} /> Under Review</span>;
      case "ACTION_TAKEN":
        return <span className="status-badge action-taken"><CheckCircle2 size={12} /> Action Taken</span>;
      case "DISMISSED":
        return <span className="status-badge dismissed"><XCircle size={12} /> Dismissed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "CONTENT_DELETED":
        return <span className="action-tag red"><Trash2 size={11} /> Content Deleted</span>;
      case "USER_BANNED":
      case "USER_BLOCKED":
        return <span className="action-tag dark-red"><Ban size={11} /> User Banned</span>;
      case "USER_WARNED":
        return <span className="action-tag orange"><AlertTriangle size={11} /> User Warned</span>;
      case "NONE":
        return <span className="action-tag gray">No Action</span>;
      default:
        return action ? <span className="action-tag gray">{action}</span> : null;
    }
  };

  return (
    <div className="ugc-moderation-page">
      {/* ── Page Header ── */}
      <div className="ugc-page-header">
        <div className="ugc-title-area">
          <div className="ugc-icon-badge">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1>UGC Reports & Blocks</h1>
            <p className="ugc-subtitle">
              Apple Guideline 1.2 Compliance: Review objectionable UGC reports (Reels, Comments, Profiles) & monitor user block activities
            </p>
          </div>
        </div>

        <div className="ugc-header-actions">
          <div className="sla-badge">
            <span className="sla-dot"></span>
            24h Moderation SLA Active
          </div>
          <button
            className="ugc-btn ugc-btn-secondary"
            onClick={() => {
              fetchStats();
              if (activeTab === "REPORTS") fetchReports();
              else fetchUserBlocks();
            }}
            disabled={loading || statsLoading}
          >
            <RefreshCw size={16} className={loading || statsLoading ? "spinning" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats KPI Bar ── */}
      <div className="ugc-stats-grid">
        <div className="stat-card stat-pending">
          <div className="stat-top">
            <span className="stat-label">Pending Action</span>
            <AlertOctagon size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.pendingReports}</div>
          <div className="stat-hint">Must review within 24 hours</div>
        </div>

        <div className="stat-card stat-reels">
          <div className="stat-top">
            <span className="stat-label">Reel Reports</span>
            <Film size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.reelReports}</div>
          <div className="stat-hint">Flagged video content</div>
        </div>

        <div className="stat-card stat-comments">
          <div className="stat-top">
            <span className="stat-label">Comment Reports</span>
            <MessageSquare size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.commentReports}</div>
          <div className="stat-hint">Abusive & spam comments</div>
        </div>

        <div className="stat-card stat-users">
          <div className="stat-top">
            <span className="stat-label">Profile Reports</span>
            <User size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.userReports}</div>
          <div className="stat-hint">Impersonation / fake accounts</div>
        </div>

        <div className="stat-card stat-blocks">
          <div className="stat-top">
            <span className="stat-label">User-to-User Blocks</span>
            <UserX size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.totalBlocks}</div>
          <div className="stat-hint">Peer-to-peer block events</div>
        </div>

        <div className="stat-card stat-resolved">
          <div className="stat-top">
            <span className="stat-label">Resolved / Actions</span>
            <CheckCircle2 size={20} className="stat-icon" />
          </div>
          <div className="stat-val">{stats.actionTakenReports}</div>
          <div className="stat-hint">Content removed / bans</div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="ugc-tabs-bar">
        <button
          className={`ugc-tab-btn ${activeTab === "REPORTS" ? "active" : ""}`}
          onClick={() => setActiveTab("REPORTS")}
        >
          <ShieldAlert size={18} />
          UGC Reports
          <span className="tab-pill">{stats.pendingReports > 0 ? stats.pendingReports : stats.totalReports}</span>
        </button>

        <button
          className={`ugc-tab-btn ${activeTab === "BLOCKS" ? "active" : ""}`}
          onClick={() => setActiveTab("BLOCKS")}
        >
          <UserX size={18} />
          User-to-User Blocks
          <span className="tab-pill">{stats.totalBlocks}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB 1: UGC REPORTS VIEW */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "REPORTS" && (
        <div className="ugc-content-section">
          {/* Controls Bar */}
          <div className="ugc-filter-card">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <div className="search-input-wrap">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reporter, reported user, or report text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="ugc-btn ugc-btn-primary">
                Search
              </button>
            </form>

            <div className="filters-row">
              {/* Status Filter */}
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="REVIEWED">Under Review</option>
                  <option value="ACTION_TAKEN">Action Taken</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              {/* Target Type Filter */}
              <div className="filter-group">
                <label>Content Type:</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Content Types</option>
                  <option value="reel">🎬 Reels</option>
                  <option value="comment">💬 Comments</option>
                  <option value="user">👤 User Profiles</option>
                </select>
              </div>

              {/* Reason Filter */}
              <div className="filter-group">
                <label>Reason:</label>
                <select
                  value={reasonFilter}
                  onChange={(e) => {
                    setReasonFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Reasons</option>
                  <option value="SPAM">Spam</option>
                  <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                  <option value="HARASSMENT">Harassment / Bullying</option>
                  <option value="HATE_SPEECH">Hate Speech</option>
                  <option value="NUDITY_OR_SEXUAL">Nudity / Sexual Content</option>
                  <option value="VIOLENCE">Violence / Dangerous</option>
                  <option value="COPYRIGHT_VIOLATION">Copyright Infringement</option>
                  <option value="SCAM_OR_FRAUD">Scam or Fraud</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="ugc-table-wrapper">
            {loading ? (
              <div className="loading-state">
                <RefreshCw size={32} className="spinning" />
                <p>Loading reported content...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <ShieldCheck size={52} className="empty-icon" />
                <h3>No reports found</h3>
                <p>Everything looks clean and safe based on your current filters.</p>
              </div>
            ) : (
              <table className="ugc-table">
                <thead>
                  <tr>
                    <th>TYPE & ID</th>
                    <th>REPORTED CONTENT / TARGET</th>
                    <th>REASON & NOTES</th>
                    <th>REPORTER</th>
                    <th>STATUS</th>
                    <th>ACTION TAKEN</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const isReel = report.targetType === "reel";
                    const isComment = report.targetType === "comment";
                    const isUser = report.targetType === "user";

                    return (
                      <tr key={report._id} className={report.status === "PENDING" ? "row-pending" : ""}>
                        {/* Type & Date */}
                        <td>
                          <div className="type-badge-box">
                            {isReel && <span className="type-chip reel"><Film size={12} /> Reel</span>}
                            {isComment && <span className="type-chip comment"><MessageSquare size={12} /> Comment</span>}
                            {isUser && <span className="type-chip user"><User size={12} /> User</span>}
                          </div>
                          <div className="report-time">
                            <Clock size={11} /> {formatDate(report.createdAt)}
                          </div>
                        </td>

                        {/* Reported Target Preview */}
                        <td>
                          {isReel && (
                            <div className="target-preview-reel">
                              {report.targetContent?.thumbnailUrl ? (
                                <img
                                  src={report.targetContent.thumbnailUrl}
                                  alt="Reel"
                                  className="target-thumb"
                                />
                              ) : (
                                <div className="target-thumb-placeholder">🎬</div>
                              )}
                              <div className="target-details">
                                <span className="target-title">
                                  {report.targetContent?.title || "Reel Content"}
                                </span>
                                <span className="target-sub">
                                  Author: {report.reportedUser?.name || "Unknown"}
                                  {report.targetContent?.status === "DELETED" && (
                                    <span className="deleted-pill">Deleted</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}

                          {isComment && (
                            <div className="target-preview-comment">
                              <p className="comment-quote">
                                "{report.targetContent?.text || report.description || "Reported comment text"}"
                              </p>
                              <span className="target-sub">
                                By: {report.reportedUser?.name || "Unknown"}
                              </span>
                            </div>
                          )}

                          {isUser && (
                            <div className="target-preview-user">
                              <div className="user-avatar-circle">
                                {report.reportedUser?.profileImage ? (
                                  <img src={report.reportedUser.profileImage} alt="" />
                                ) : (
                                  report.reportedUser?.name?.charAt(0) || "U"
                                )}
                              </div>
                              <div className="target-details">
                                <span className="target-title">
                                  {report.reportedUser?.name || "User Account"}
                                </span>
                                <span className="target-sub">
                                  @{report.reportedUser?.username || "user"} • Status:{" "}
                                  <span style={{ color: report.reportedUser?.status === "Blocked" ? "#ef4444" : "#10b981" }}>
                                    {report.reportedUser?.status || "Active"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Reason & Notes */}
                        <td>
                          <span className={`reason-badge ${getReasonBadgeClass(report.reason)}`}>
                            {report.reason.replace(/_/g, " ")}
                          </span>
                          {report.description && (
                            <p className="report-desc-preview" title={report.description}>
                              {report.description}
                            </p>
                          )}
                        </td>

                        {/* Reporter */}
                        <td>
                          <div className="reporter-chip">
                            <div className="reporter-avatar">
                              {report.reporter?.profileImage ? (
                                <img src={report.reporter.profileImage} alt="" />
                              ) : (
                                report.reporter?.name?.charAt(0) || "R"
                              )}
                            </div>
                            <div>
                              <div className="reporter-name">{report.reporter?.name || "User"}</div>
                              <div className="reporter-contact">{report.reporter?.phone || report.reporter?.email || "-"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td>{getStatusBadge(report.status)}</td>

                        {/* Action Taken */}
                        <td>{getActionBadge(report.actionTaken)}</td>

                        {/* Action Buttons */}
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="ugc-btn-action"
                            onClick={() => openActionModal(report)}
                            title="Inspect & Resolve"
                          >
                            <Eye size={15} />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {reports.length > 0 && (
              <div className="ugc-pagination">
                <span className="page-summary">
                  Showing Page {page} of {totalPages} ({reportsTotal} total reports)
                </span>
                <div className="page-nav-btns">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB 2: USER-TO-USER BLOCKS VIEW */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "BLOCKS" && (
        <div className="ugc-content-section">
          <div className="ugc-filter-card">
            <form onSubmit={handleBlocksSearchSubmit} className="search-form">
              <div className="search-input-wrap">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search blocker or blocked user by name, username, phone..."
                  value={blocksSearch}
                  onChange={(e) => setBlocksSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="ugc-btn ugc-btn-primary">
                Search Blocks
              </button>
            </form>
          </div>

          <div className="ugc-table-wrapper">
            {blocksLoading ? (
              <div className="loading-state">
                <RefreshCw size={32} className="spinning" />
                <p>Loading user block events...</p>
              </div>
            ) : blocks.length === 0 ? (
              <div className="empty-state">
                <ShieldCheck size={52} className="empty-icon" />
                <h3>No user blocks recorded</h3>
                <p>No user-to-user block activity matches your query.</p>
              </div>
            ) : (
              <table className="ugc-table">
                <thead>
                  <tr>
                    <th>BLOCKER USER (WHO BLOCKED)</th>
                    <th></th>
                    <th>BLOCKED USER (WHO GOT BLOCKED)</th>
                    <th>DATE & TIME</th>
                    <th>BLOCKED USER STATUS</th>
                    <th style={{ textAlign: "right" }}>ADMIN MODERATION</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b) => (
                    <tr key={b._id}>
                      {/* Blocker */}
                      <td>
                        <div className="user-info-row">
                          <div className="user-avatar-circle">
                            {b.blocker?.profileImage ? (
                              <img src={b.blocker.profileImage} alt="" />
                            ) : (
                              b.blocker?.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div>
                            <div className="user-name">
                              {b.blocker?.name || "Deleted User"}
                              {b.blocker?.isVerified && <span className="verified-dot">✓</span>}
                            </div>
                            <div className="user-handle">@{b.blocker?.username || "user"} • {b.blocker?.phone || ""}</div>
                          </div>
                        </div>
                      </td>

                      {/* Direction Icon */}
                      <td style={{ textAlign: "center", color: "#ef4444" }}>
                        <div className="block-direction-pill">
                          <Ban size={14} /> BLOCKED <ArrowRight size={14} />
                        </div>
                      </td>

                      {/* Blocked */}
                      <td>
                        <div className="user-info-row">
                          <div className="user-avatar-circle">
                            {b.blocked?.profileImage ? (
                              <img src={b.blocked.profileImage} alt="" />
                            ) : (
                              b.blocked?.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div>
                            <div className="user-name">
                              {b.blocked?.name || "Deleted User"}
                              {b.blocked?.isVerified && <span className="verified-dot">✓</span>}
                            </div>
                            <div className="user-handle">@{b.blocked?.username || "user"} • {b.blocked?.phone || ""}</div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td>
                        <div className="report-time">
                          <Calendar size={12} /> {formatDate(b.createdAt)}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {b.blocked?.status === "Blocked" ? (
                          <span className="status-badge dismissed">
                            <Ban size={12} /> Globally Banned
                          </span>
                        ) : (
                          <span className="status-badge action-taken">
                            <CheckCircle2 size={12} /> Active Account
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions-inline">
                          {b.blocked?.status !== "Blocked" && (
                            <button
                              className="ugc-btn-danger-sm"
                              onClick={() => handleBanUserGlobally(b.blocked?._id, b.blocked?.name)}
                              title="Ban offender across platform"
                            >
                              <Ban size={13} />
                              Ban User
                            </button>
                          )}
                          <button
                            className="ugc-btn-secondary-sm"
                            onClick={() => handleDeleteBlock(b._id)}
                            title="Remove block rule"
                          >
                            <Trash2 size={13} />
                            Remove Block
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination for Blocks */}
            {blocks.length > 0 && (
              <div className="ugc-pagination">
                <span className="page-summary">
                  Showing Page {blocksPage} of {blocksTotalPages} ({blocksTotal} block records)
                </span>
                <div className="page-nav-btns">
                  <button
                    disabled={blocksPage <= 1}
                    onClick={() => setBlocksPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <button
                    disabled={blocksPage >= blocksTotalPages}
                    onClick={() => setBlocksPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* REVIEW & ACTION MODAL */}
      {/* ══════════════════════════════════════════════════════ */}
      {selectedReport && (
        <div className="ugc-modal-overlay" onClick={closeActionModal}>
          <div className="ugc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ugc-modal-header">
              <div className="modal-title-box">
                <ShieldAlert size={22} color="#FF7A1A" />
                <h3>Review & Moderate UGC Report</h3>
              </div>
              <button className="modal-close-btn" onClick={closeActionModal}>
                <X size={20} />
              </button>
            </div>

            <div className="ugc-modal-body">
              {/* Context Summary */}
              <div className="modal-section-grid">
                {/* Reporter Information */}
                <div className="modal-info-card">
                  <h4>Reporter</h4>
                  <div className="user-info-row">
                    <div className="user-avatar-circle">
                      {selectedReport.reporter?.profileImage ? (
                        <img src={selectedReport.reporter.profileImage} alt="" />
                      ) : (
                        selectedReport.reporter?.name?.charAt(0) || "R"
                      )}
                    </div>
                    <div>
                      <div className="user-name">{selectedReport.reporter?.name || "User"}</div>
                      <div className="user-handle">@{selectedReport.reporter?.username || "user"}</div>
                      <div className="user-phone">{selectedReport.reporter?.phone || selectedReport.reporter?.email || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Reported User Information */}
                <div className="modal-info-card">
                  <h4>Reported Creator / User</h4>
                  <div className="user-info-row">
                    <div className="user-avatar-circle">
                      {selectedReport.reportedUser?.profileImage ? (
                        <img src={selectedReport.reportedUser.profileImage} alt="" />
                      ) : (
                        selectedReport.reportedUser?.name?.charAt(0) || "U"
                      )}
                    </div>
                    <div>
                      <div className="user-name">
                        {selectedReport.reportedUser?.name || "User Account"}
                        {selectedReport.reportedUser?.isVerified && <span className="verified-dot">✓</span>}
                      </div>
                      <div className="user-handle">@{selectedReport.reportedUser?.username || "user"}</div>
                      <div className="user-phone">Status: {selectedReport.reportedUser?.status || "Active"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reported Content Preview Box */}
              <div className="reported-content-preview-box">
                <h4>
                  Reported Target:{" "}
                  <span className="target-type-label">
                    {selectedReport.targetType.toUpperCase()}
                  </span>
                </h4>

                {selectedReport.targetType === "reel" && (
                  <div className="modal-target-reel">
                    {selectedReport.targetContent?.thumbnailUrl && (
                      <img
                        src={selectedReport.targetContent.thumbnailUrl}
                        alt="Reel preview"
                        className="modal-reel-img"
                      />
                    )}
                    <div className="modal-target-info">
                      <div className="modal-target-title">
                        {selectedReport.targetContent?.title || "Reel Content"}
                      </div>
                      <p className="modal-target-desc">
                        {selectedReport.targetContent?.description || "No description provided."}
                      </p>
                      {selectedReport.targetContent?.videoUrl && (
                        <a
                          href={selectedReport.targetContent.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="view-content-link"
                        >
                          <ExternalLink size={14} /> Open Video Stream
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selectedReport.targetType === "comment" && (
                  <div className="modal-target-comment">
                    <p className="comment-quote-full">
                      "{selectedReport.targetContent?.text || selectedReport.description || "Comment content"}"
                    </p>
                  </div>
                )}

                {selectedReport.targetType === "user" && (
                  <div className="modal-target-user-card">
                    <div className="user-name">{selectedReport.targetContent?.name}</div>
                    <div className="user-handle">@{selectedReport.targetContent?.username}</div>
                    <p className="user-bio">{selectedReport.targetContent?.bio || "No profile bio."}</p>
                  </div>
                )}
              </div>

              {/* User Report Claim & Reason */}
              <div className="report-reason-details-box">
                <div className="reason-header">
                  <span className="reason-label">Reported Reason:</span>
                  <span className={`reason-badge ${getReasonBadgeClass(selectedReport.reason)}`}>
                    {selectedReport.reason.replace(/_/g, " ")}
                  </span>
                </div>
                {selectedReport.description && (
                  <div className="reporter-notes">
                    <strong>User Comment / Explanation:</strong>
                    <p>{selectedReport.description}</p>
                  </div>
                )}
              </div>

              {/* Form: Take Moderation Action */}
              <form onSubmit={handleResolveSubmit} className="moderation-action-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Resolution Status:</label>
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                    >
                      <option value="ACTION_TAKEN">Action Taken (Enforce Penalty)</option>
                      <option value="REVIEWED">Reviewed (Mark Under Review)</option>
                      <option value="DISMISSED">Dismissed (No Violation / False Report)</option>
                      <option value="PENDING">Keep Pending</option>
                    </select>
                  </div>

                  {actionStatus !== "DISMISSED" && (
                    <div className="form-group">
                      <label>Enforcement Action to Execute:</label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                      >
                        <option value="CONTENT_DELETED">
                          🗑️ Delete Reported Content (Reel / Comment)
                        </option>
                        <option value="USER_BANNED">
                          🚫 Ban / Block Offending User Account
                        </option>
                        <option value="USER_WARNED">
                          ⚠️ Issue Warning to User
                        </option>
                        <option value="NONE">
                          No Penalty (Keep Content & User)
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Moderator Audit Notes (Internal):</label>
                  <textarea
                    rows={3}
                    placeholder="Provide justification for this decision for Apple compliance audit logs..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <div className="modal-footer-btns">
                  <button
                    type="button"
                    className="ugc-btn ugc-btn-secondary"
                    onClick={closeActionModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ugc-btn ugc-btn-primary"
                    disabled={submittingAction}
                  >
                    {submittingAction ? (
                      <>
                        <RefreshCw size={16} className="spinning" />
                        Saving Decision...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Save & Enforce Moderation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
