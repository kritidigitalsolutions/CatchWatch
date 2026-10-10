import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X, Clapperboard, Play, Ban, ShieldCheck } from "lucide-react";
import "./Dashboard.css";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shortsUser, setShortsUser] = useState(null);
  const [userReels, setUserReels] = useState([]);
  const [loadingReels, setLoadingReels] = useState(false);
  const [previewReel, setPreviewReel] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  const handleSelectUser = async (u) => {
    setSelected(u);
    try {
      const res = await API.get(`/admin/users/${u._id}`);
      if (res.data && res.data.user) {
        setSelected((prev) => ({ ...prev, ...res.data.user }));
      }
    } catch (err) {
      console.error("Failed to fetch full user details:", err);
    }
  };

  const handleToggleBlock = async (u) => {
    try {
      const res = await API.patch(`/admin/users/${u._id}/block`);
      const updatedUser = res.data.user || {};
      const isBlocked = updatedUser.status === "Blocked" || updatedUser.isBlocked;
      setUsers((prev) =>
        prev.map((item) =>
          item._id === u._id ? { ...item, status: updatedUser.status, isBlocked } : item
        )
      );
      if (selected?._id === u._id) {
        setSelected((prev) => ({
          ...prev,
          status: updatedUser.status,
          isBlocked,
        }));
      }
    } catch (err) {
      alert("Failed to toggle block status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch { alert("Failed to delete"); }
  };

  const handleOpenShorts = async (user) => {
    setShortsUser(user);
    setLoadingReels(true);
    setUserReels([]);
    setPreviewReel(null);
    try {
      const res = await API.get(`/reels/user/${user._id}`);
      setUserReels(res.data.reels || []);
    } catch (err) {
      console.error("Failed to fetch user reels:", err);
      setUserReels([]);
    }
    setLoadingReels(false);
  };

  const handleDeleteReel = async (id) => {
    if (!window.confirm("Delete this reel/short permanently?")) return;
    try {
      await API.delete(`/admin/reels/${id}`);
      setUserReels((prev) => prev.filter((r) => r._id !== id));
      if (previewReel?._id === id) setPreviewReel(null);
    } catch (err) {
      alert("Failed to delete reel");
    }
  };

  const filtered = users.filter((u) =>
    (u.name || "").toLowerCase().includes((search || "").toLowerCase()) ||
    (u.email || "").toLowerCase().includes((search || "").toLowerCase()) ||
    (u.phone || "").toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users and detailed profiles</p>
        </div>
        <button className="btn btn-primary" onClick={fetchUsers}><RefreshCw size={16} style={{ display: "inline-block", marginRight: 6 }} /> Refresh</button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card s-green">
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card s-blue">
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{users.filter(u => !u.isBlocked && u.status !== "Blocked").length}</div>
        </div>
        <div className="stat-card s-red">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{users.filter(u => u.isBlocked || u.status === "Blocked").length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input placeholder="Search by name, phone or email..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8 }} /> Loading users...</p></div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><p>No users found 😕</p></div>
                  </td></tr>
                ) : filtered.map((u, i) => (
                  <tr key={u._id || i}>
                    <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">
                          {u.profileImage ? (
                            <img src={getImageUrl(u.profileImage)} alt={u.name} />
                          ) : (
                            u.name ? u.name[0].toUpperCase() : "U"
                          )}
                        </div>
                        <div>
                          <span className="u-name">{u.name || "Unknown"}</span>
                          {u.username && <span style={{ fontSize: "0.72rem", color: "var(--primary)", display: "block" }}>{u.username}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-soft)" }}>{u.email || u.phone || "—"}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <span className={`badge ${u.isBlocked || u.status === "Blocked" ? "badge-blocked" : "badge-active"}`}>
                        {u.isBlocked || u.status === "Blocked" ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn view" onClick={() => handleSelectUser(u)} title="View Detailed Profile"><Eye size={16} /></button>
                        <button className="icon-btn view" onClick={() => handleOpenShorts(u)} title="View Shorts" style={{ color: "#a78bfa" }}><Clapperboard size={16} /></button>
                        <button className="icon-btn" onClick={() => handleToggleBlock(u)} title={u.isBlocked || u.status === "Blocked" ? "Unblock User" : "Block User"} style={{ color: u.isBlocked || u.status === "Blocked" ? "#10b981" : "#ef4444" }}><Ban size={16} /></button>
                        <button className="icon-btn del" onClick={() => handleDelete(u._id)} title="Delete User"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()} style={{ maxWidth: "900px", width: "95%" }}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} /> User Detailed Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0" style={{ maxHeight: "78vh", overflowY: "auto" }}>
              {/* Profile Hero Header */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content" style={{ flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", items: "center", gap: 16 }}>
                    <div className="u-avatar large">
                      {selected.profileImage ? (
                        <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                      ) : (
                        selected.name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="profile-hero-text">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{selected.name || "Unknown User"}</h2>
                        {selected.verification?.isVerified || selected.isVerified || selected.profileComplete ? (
                          <span className="badge badge-active" style={{ fontSize: "0.68rem", padding: "2px 8px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                            ✓ VERIFIED
                          </span>
                        ) : null}
                        <span className={`badge ${selected.isBlocked || selected.status === "Blocked" ? "badge-blocked" : "badge-active"}`}>
                          {selected.isBlocked || selected.status === "Blocked" ? "BLOCKED" : "ACTIVE"}
                        </span>
                        <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.4)" }}>
                          {selected.plan || "Free Tier"}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 6px 0", color: "var(--text-soft)", fontSize: "0.88rem" }}>
                        {selected.username ? (selected.username.startsWith("@") ? selected.username : `@${selected.username}`) : "@user"} • {selected.email || selected.phone || "No contact info"}
                      </p>
                    </div>
                  </div>

                  {/* Hero Quick Actions */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                    <button
                      className="btn"
                      onClick={() => handleToggleBlock(selected)}
                      style={{ fontSize: "0.8rem", padding: "6px 14px", background: selected.isBlocked || selected.status === "Blocked" ? "#10b981" : "rgba(239, 68, 68, 0.15)", color: selected.isBlocked || selected.status === "Blocked" ? "#fff" : "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                    >
                      <Ban size={14} /> {selected.isBlocked || selected.status === "Blocked" ? "Unblock User" : "Block User"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleOpenShorts(selected)}
                      style={{ fontSize: "0.8rem", padding: "6px 14px", color: "#a78bfa", borderColor: "rgba(167, 139, 250, 0.4)" }}
                    >
                      <Clapperboard size={14} /> View Shorts
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 1: Personal & Contact Info */}
              <div style={{ padding: "16px 24px 8px 24px" }}>
                <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={15} /> Personal & Contact Info
                </h4>
              </div>
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Username</span>
                  <span className="p-detail-value mono" style={{ color: "var(--primary)" }}>{selected.username || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account Role</span>
                  <span className="p-detail-value">{selected.role || "USER"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Completion</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete ✓" : "Incomplete ⚠️"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono" style={{ fontSize: "0.78rem" }}>{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Online Status</span>
                  <span className={`p-detail-value ${selected.isOnline ? "text-success" : ""}`}>
                    {selected.isOnline ? "🟢 Online Now" : selected.lastSeen ? `Offline (${new Date(selected.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : "Offline"}
                  </span>
                </div>
                <div className="p-detail-card" style={{ gridColumn: "span 2" }}>
                  <span className="p-detail-label">Bio</span>
                  <span className="p-detail-value" style={{ fontStyle: selected.bio ? "normal" : "italic", opacity: selected.bio ? 1 : 0.7 }}>
                    {selected.bio || "No bio provided"}
                  </span>
                </div>
                <div className="p-detail-card" style={{ gridColumn: "span 2" }}>
                  <span className="p-detail-label">Preferred Genres</span>
                  <span className="p-detail-value">
                    {Array.isArray(selected.genres) && selected.genres.length > 0 ? selected.genres.join(", ") : "None specified"}
                  </span>
                </div>
              </div>

              {/* Section 2: Creator & Activity Statistics */}
              <div style={{ padding: "20px 24px 8px 24px" }}>
                <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clapperboard size={15} /> Activity & Creator Statistics
                </h4>
              </div>
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Shorts / Reels</span>
                  <span className="p-detail-value" style={{ fontSize: "1.15rem", fontWeight: 800, color: "#a78bfa" }}>
                    {selected.reelsCount !== undefined ? selected.reelsCount : 0}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Followers</span>
                  <span className="p-detail-value" style={{ fontSize: "1.15rem", fontWeight: 800, color: "#10b981" }}>
                    {selected.followersCount !== undefined ? selected.followersCount : (selected.totalCreatorFollowers || 0)}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Following</span>
                  <span className="p-detail-value" style={{ fontSize: "1.15rem", fontWeight: 800, color: "#3b82f6" }}>
                    {selected.followingCount !== undefined ? selected.followingCount : 0}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Quality Score</span>
                  <span className="p-detail-value" style={{ fontWeight: 700, color: "#f59e0b" }}>
                    {selected.qualityScore || 0} / 100
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Creator Level</span>
                  <span className="p-detail-value">{selected.creatorLevel || "Beginner"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Creator Category</span>
                  <span className="p-detail-value">{selected.creatorCategory || "General"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Watch Minutes</span>
                  <span className="p-detail-value mono">{selected.totalWatchMinutes || 0} mins</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Qualified Views</span>
                  <span className="p-detail-value mono">{selected.totalQualifiedViews || 0}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Engagement Points</span>
                  <span className="p-detail-value mono">{selected.totalEngagementPoints || 0} pts</span>
                </div>
              </div>

              {/* Section 3: Subscription & Security Settings */}
              <div style={{ padding: "20px 24px 8px 24px" }}>
                <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={15} /> Subscription, Verification & Security
                </h4>
              </div>
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Subscription Plan</span>
                  <span className={`p-detail-value ${selected.plan && selected.plan !== "Free" ? "text-success" : ""}`}>
                    {selected.plan || selected.subscription?.plan?.name || "Free Plan"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Subscription Status</span>
                  <span className={`p-detail-value ${selected.subscription?.status === "active" ? "text-success" : "text-muted"}`}>
                    {selected.subscription?.status === "active" ? "Active Subscription" : selected.subscription?.status || "No Active Plan"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Verification Status</span>
                  <span className="p-detail-value">
                    {selected.verification?.status || (selected.isVerified ? "VERIFIED" : "NOT VERIFIED")}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Verification Badge</span>
                  <span className="p-detail-value">
                    {(selected.verification?.badgeType === "BLUE" ? "ORANGE TICK" : selected.verification?.badgeType) || (selected.isVerified ? "ORANGE TICK" : "None")}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">End-to-End Encryption</span>
                  <span className="p-detail-value mono">
                    {selected.publicKey ? "🔒 Public Key Active" : "Not Configured"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Push Notifications (FCM)</span>
                  <span className="p-detail-value mono">
                    {selected.fcmToken ? "🔔 Push Token Active" : "No Token"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Joined Date</span>
                  <span className="p-detail-value">
                    {selected.createdAt
                      ? new Date(selected.createdAt.$date || selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : "—"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Last Profile Update</span>
                  <span className="p-detail-value">
                    {selected.updatedAt
                      ? new Date(selected.updatedAt.$date || selected.updatedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
              <button
                className="btn"
                onClick={() => handleToggleBlock(selected)}
                style={{ background: selected.isBlocked || selected.status === "Blocked" ? "#10b981" : "rgba(239, 68, 68, 0.15)", color: selected.isBlocked || selected.status === "Blocked" ? "#fff" : "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
              >
                <Ban size={16} /> {selected.isBlocked || selected.status === "Blocked" ? "Unblock Account" : "Block Account"}
              </button>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Shorts Modal */}
      {shortsUser && (
        <div className="modal-overlay" onClick={() => setShortsUser(null)}>
          <div className="modal-box shorts-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><Clapperboard size={20} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} /> {shortsUser.name || "User"}'s Shorts</h3>
              <button className="modal-close" onClick={() => setShortsUser(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body">
              {loadingReels ? (
                <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8, animation: "spin 1.5s linear infinite" }} /> Loading shorts...</p></div>
              ) : userReels.length === 0 ? (
                <div className="empty-state"><p>No shorts uploaded by this user 😕</p></div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Preview</th>
                        <th>Caption</th>
                        <th>Views</th>
                        <th>Shares</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userReels.map((reel, index) => {
                        const posterUrl = reel.thumbnail ? getImageUrl(reel.thumbnail) : getImageUrl(reel.videoUrl);
                        return (
                          <tr key={reel._id}>
                            <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{index + 1}</td>
                            <td>
                              <div 
                                className="short-video-wrapper" 
                                onClick={() => setPreviewReel(reel)} 
                                style={{ width: "80px", height: "110px", borderRadius: "8px", position: "relative" }}
                              >
                                <img
                                  src={posterUrl}
                                  alt="Preview"
                                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                                />
                                <div className="short-video-play-btn" style={{ opacity: 1 }}>
                                  <Play size={16} style={{ marginLeft: 2 }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ maxWidth: "250px", wordBreak: "break-word" }}>
                              <p style={{ margin: 0, fontWeight: 500 }}>{reel.caption || "No caption"}</p>
                              {reel.hashtags && reel.hashtags.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                  {reel.hashtags.map((tag, idx) => (
                                    <span key={idx} style={{ fontSize: "0.75rem", color: "var(--primary)" }}>#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ color: "var(--text-soft)" }}>{reel.viewsCount || 0}</td>
                            <td style={{ color: "var(--text-soft)" }}>{reel.sharesCount || 0}</td>
                            <td>
                              <div className="tbl-actions">
                                <button 
                                  className="icon-btn view" 
                                  onClick={() => setPreviewReel(reel)} 
                                  title="Play Preview"
                                  style={{ color: previewReel?._id === reel._id ? "var(--primary)" : "#10b981" }}
                                >
                                  <Play size={16} />
                                </button>
                                <button 
                                  className="icon-btn del" 
                                  onClick={() => handleDeleteReel(reel._id)} 
                                  title="Delete Reel"
                                >
                                  <Trash2 size={16} />
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

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => { setShortsUser(null); setPreviewReel(null); }}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Video Preview Player (Non-Blocking) */}
      {previewReel && (
        <div className="floating-preview-player">
          <div className="floating-player-header">
            <span className="floating-player-title">Preview: {previewReel.caption || "Short Reel"}</span>
            <button className="floating-player-close" onClick={() => setPreviewReel(null)}>
              <X size={16} />
            </button>
          </div>
          <div className="floating-player-body">
            <video
              key={previewReel._id}
              src={getImageUrl(previewReel.videoUrl)}
              poster={getImageUrl(previewReel.thumbnail)}
              controls
              autoPlay
              loop
              playsInline
              className="floating-player-video"
            />
          </div>
        </div>
      )}
    </div>
  );
}