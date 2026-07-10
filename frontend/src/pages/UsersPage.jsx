import { useEffect, useState, useRef } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, X, Clapperboard, Play, Pause, Share2 } from "lucide-react";
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
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

  const filtered = users.filter(u =>
    (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users</p>
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
          <div className="stat-value">{users.filter(u => !u.isBlocked).length}</div>
        </div>
        <div className="stat-card s-red">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{users.filter(u => u.isBlocked).length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input placeholder="Search by name or email..." value={search}
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
                        <span className="u-name">{u.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-soft)" }}>{u.email}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <span className={`badge ${u.isBlocked ? "badge-blocked" : "badge-active"}`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn view" onClick={() => setSelected(u)} title="View Profile"><Eye size={16} /></button>
                        <button className="icon-btn view" onClick={() => handleOpenShorts(u)} title="View Shorts" style={{ color: "#a78bfa" }}><Clapperboard size={16} /></button>
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

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              {/* Profile Hero */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <p>{selected.email}</p>
                    <span className={`badge ${selected.isBlocked ? "badge-blocked" : "badge-active"}`}>
                      {selected.isBlocked ? "BLOCKED" : "ACTIVE ACCOUNT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Status</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt?.$date 
                      ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : selected.createdAt 
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                        : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>Close Window</button>
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