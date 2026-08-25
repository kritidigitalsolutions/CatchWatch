import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Bell, Send, X, Trash2, Eye, RefreshCw, Search, Image as ImageIcon,
  Film, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Sparkles,
  Users, UserCheck, Smartphone, Check, ChevronDown, Upload, Link as LinkIcon
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";

// ── Type badge colours ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  GENERAL: { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  SYSTEM: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  CONTENT_ALERT: { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  SUBSCRIPTION: { bg: "rgba(236,72,153,0.15)", color: "#ec4899" },
  BLUETICK: { bg: "rgba(6,182,212,0.15)", color: "#06b6d4" },
  REEL: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  CHAT: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
  CALL: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  FOLLOW: { bg: "rgba(147,51,234,0.15)", color: "#9333ea" },
  ACCOUNT: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
};

const EMPTY_FORM = {
  title: "",
  message: "",
  imageUrl: "",
  type: "GENERAL",
  sendTo: "All Users",
  targetUser: null,
  attachmentType: "NONE", // NONE, CONTENT, SUBSCRIPTION_PLAN
  selectedContent: null,
  selectedPlan: null,
  actionUrl: "",
  userSearch: "",
};

// Map friendly dropdown names to backend target codes
const SEND_TO_MAP = {
  "All Users": "ALL",
  "Subscribed Users": "SUBSCRIBERS",
  "Free / Non-Subscribed Users": "NON_SUBSCRIBERS",
  "Expiring Soon (Next 7 Days)": "EXPIRING_SOON",
  "Verified Creators": "CREATORS",
  "Specific User": "SPECIFIC_USER",
};

export default function NotificationsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageMode, setImageMode] = useState("file"); // "file" or "url"
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ totalSent: 0, delivered: 0, failed: 0 });
  const [attachmentOptions, setAttachmentOptions] = useState({ content: [], plans: [] });
  const [users, setUsers] = useState([]);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [contentPickerOpen, setContentPickerOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewNotif, setViewNotif] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  const fileInputRef = useRef(null);

  // ── Toast Helper ────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Notifications & Attachment Options ─────────────────────────────
  const fetchAllData = useCallback(async () => {
    setFetching(true);
    try {
      const [notifRes, attachRes, userRes] = await Promise.all([
        API.get("/admin/notifications/"),
        API.get("/admin/notifications/attachment-options").catch(() => ({ data: { content: [], plans: [] } })),
        API.get("/admin/users").catch(() => ({ data: { users: [] } })),
      ]);

      if (notifRes.data?.success) {
        setNotifications(notifRes.data.data || []);
        if (notifRes.data.stats) {
          setStats(notifRes.data.stats);
        }
      }

      if (attachRes.data?.success) {
        setAttachmentOptions({
          content: attachRes.data.content || [],
          plans: attachRes.data.plans || [],
        });
      }

      if (userRes.data?.users || userRes.data?.data) {
        setUsers(userRes.data.users || userRes.data.data || []);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      showToast(err.response?.data?.message || "Failed to load notification studio data.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Handle Local Image File Select ───────────────────────────────────────
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // ── Filtered Users for Specific User Selection ───────────────────────────
  const filteredUsers = useMemo(() => {
    const q = (form.userSearch || "").toLowerCase().trim();
    if (!q) return users.slice(0, 20);
    return users
      .filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").includes(q)
      )
      .slice(0, 30);
  }, [users, form.userSearch]);

  // ── Filtered Content Items ───────────────────────────────────────────────
  const filteredContentList = useMemo(() => {
    const q = contentSearch.toLowerCase().trim();
    if (!q) return attachmentOptions.content.slice(0, 25);
    return attachmentOptions.content
      .filter((c) => c.title?.toLowerCase().includes(q) || c.typeName?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [attachmentOptions.content, contentSearch]);

  // ── Filtered Plans ───────────────────────────────────────────────────────
  const filteredPlansList = useMemo(() => {
    const q = planSearch.toLowerCase().trim();
    if (!q) return attachmentOptions.plans;
    return attachmentOptions.plans.filter((p) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }, [attachmentOptions.plans, planSearch]);

  // ── Handle Attachment Selection ──────────────────────────────────────────
  const handleSelectContent = (item) => {
    setForm((prev) => ({
      ...prev,
      attachmentType: "CONTENT",
      selectedContent: item,
      title: prev.title.trim() ? prev.title : `🎬 Now Streaming: ${item.title}`,
      message: prev.message.trim() ? prev.message : `Watch ${item.title} now in 4K Ultra HD on CatchWatch!`,
      imageUrl: item.image || prev.imageUrl,
      actionUrl: item.actionUrl || `/watch/${item._id}`,
      type: "CONTENT_ALERT",
    }));
    if (item.image) {
      setImagePreview(item.image);
    }
    setContentPickerOpen(false);
  };

  const handleSelectPlan = (plan) => {
    setForm((prev) => ({
      ...prev,
      attachmentType: "SUBSCRIPTION_PLAN",
      selectedPlan: plan,
      title: prev.title.trim() ? prev.title : `👑 Upgrade to ${plan.name}`,
      message: prev.message.trim()
        ? prev.message
        : `Get ad-free 4K streaming and full access to CatchWatch for only ₹${plan.price}!`,
      actionUrl: plan.actionUrl || `/subscription?planId=${plan._id}`,
      type: "SUBSCRIPTION",
    }));
    setPlanPickerOpen(false);
  };

  // ── Clear Form ───────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelectedImageFile(null);
    setImagePreview("");
    setContentSearch("");
    setPlanSearch("");
    setContentPickerOpen(false);
    setPlanPickerOpen(false);
    setUserDropOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Send Notification ────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Please enter a notification title and message.", "error");
      return;
    }

    if (form.sendTo === "Specific User" && !form.targetUser) {
      showToast("Please select a target user from the search dropdown.", "error");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("message", form.message.trim());
      formData.append("type", form.type);
      formData.append("sendTo", SEND_TO_MAP[form.sendTo] || "ALL");
      formData.append("actionUrl", form.actionUrl.trim());
      formData.append("attachmentType", form.attachmentType);

      if (form.targetUser?._id) {
        formData.append("targetUser", form.targetUser._id);
      }
      if (form.imageUrl?.trim()) {
        formData.append("imageUrl", form.imageUrl.trim());
      }
      if (selectedImageFile) {
        formData.append("imageFile", selectedImageFile);
      }
      if (form.selectedContent?._id) {
        formData.append("contentId", form.selectedContent._id);
        formData.append("contentType", form.selectedContent.type || "");
      }
      if (form.selectedPlan?._id) {
        formData.append("planId", form.selectedPlan._id);
      }

      const res = await API.post("/admin/notifications/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const report = res.data.pushReport;
        showToast(
          `Notification dispatched! Sent: ${report?.sent || report?.delivered || 1} • Audience: ${form.sendTo}`,
          "success"
        );
        handleClear();
        fetchAllData();
      }
    } catch (err) {
      console.error("Send notification error:", err);
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete Notification ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification record?")) return;
    try {
      const res = await API.delete(`/admin/notifications/${id}`);
      if (res.data.success) {
        showToast("Notification deleted successfully.");
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete notification.", "error");
    }
  };

  // ── Filtered History ─────────────────────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (historyFilter !== "ALL" && n.type !== historyFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const msgMatch = (n.message || "").toLowerCase().includes(q);
        const targetMatch = (n.targetUser?.name || n.targetUserType || "").toLowerCase().includes(q);
        return titleMatch || msgMatch || targetMatch;
      }
      return true;
    });
  }, [notifications, historyFilter, historySearch]);

  return (
    <div className="notif-studio-container">
      {/* Toast Notification */}
      {toast && <div className={`notif-toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── Top Header Section ── */}
      <div className="notif-header">
        <div className="notif-header-left">
          <div className="notif-header-icon-box">
            <Bell size={24} />
          </div>
          <div className="notif-header-titles">
            <h2>Notifications</h2>
            <p>Send and manage user notifications</p>
          </div>
        </div>

        {/* Stats Strip: Total Sent, Delivered, Failed */}
        <div className="notif-stats-strip">
          <div className="notif-stat-box">
            <div className="notif-stat-num">{stats.totalSent || notifications.length}</div>
            <div className="notif-stat-lbl">TOTAL SENT</div>
          </div>

          <div className="notif-stat-box delivered">
            <div className="notif-stat-num">{stats.delivered || stats.totalSent || notifications.length}</div>
            <div className="notif-stat-lbl">DELIVERED</div>
          </div>

          <div className="notif-stat-box failed">
            <div className="notif-stat-num">{stats.failed || 0}</div>
            <div className="notif-stat-lbl">FAILED</div>
          </div>

          <button
            onClick={fetchAllData}
            disabled={fetching}
            className="notif-refresh-btn"
            title="Refresh Notification Data"
          >
            <RefreshCw size={18} className={fetching ? "spin-icon text-purple-400" : ""} />
          </button>
        </div>
      </div>

      {/* ── Main Send Notification Card ── */}
      <div className="notif-card">
        <div className="notif-card-header-title">
          <Send size={16} />
          <span>Send Notification</span>
        </div>

        <form onSubmit={handleSend} className="notif-form">
          {/* Notification Title */}
          <div className="notif-form-group">
            <label className="notif-label">NOTIFICATION TITLE *</label>
            <input
              type="text"
              required
              className="notif-input-text"
              placeholder="Enter notification title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* Message Textarea */}
          <div className="notif-form-group">
            <label className="notif-label">MESSAGE *</label>
            <textarea
              required
              rows={4}
              className="notif-textarea"
              placeholder="Write notification message..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          {/* Image Upload & URL Mode Selector */}
          <div className="notif-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="notif-label">
                NOTIFICATION IMAGE <span>(Optional - Upload system image or enter URL)</span>
              </label>
              {(selectedImageFile || form.imageUrl || imagePreview) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null);
                    setImagePreview("");
                    setForm({ ...form, imageUrl: "" });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{ background: "none", border: "none", color: "#f87171", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                >
                  Remove Image
                </button>
              )}
            </div>

            {/* Upload or URL Tabs */}
            <div className="notif-image-tabs">
              <button
                type="button"
                className={`notif-tab-btn ${imageMode === "file" ? "active" : ""}`}
                onClick={() => setImageMode("file")}
              >
                <Upload size={14} /> Upload from System
              </button>
              <button
                type="button"
                className={`notif-tab-btn ${imageMode === "url" ? "active" : ""}`}
                onClick={() => setImageMode("url")}
              >
                <LinkIcon size={14} /> Enter Image URL
              </button>
            </div>

            <div className="notif-image-input-row">
              {imageMode === "file" ? (
                <label className="notif-file-dropzone">
                  <div className="dropzone-label">
                    <Upload size={18} color="#a855f7" />
                    <span>
                      {selectedImageFile
                        ? `${selectedImageFile.name} (${(selectedImageFile.size / 1024).toFixed(1)} KB)`
                        : "Click to select banner/poster image from your system..."}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: 700 }}>Browse File</span>
                </label>
              ) : (
                <div className="notif-input-wrapper">
                  <input
                    type="url"
                    className="notif-input-text"
                    placeholder="https://example.com/image.jpg or poster URL"
                    value={form.imageUrl}
                    onChange={(e) => {
                      setForm({ ...form, imageUrl: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                  />
                  <ImageIcon size={16} className="input-icon" />
                </div>
              )}

              {/* Thumbnail Preview */}
              {imagePreview && (
                <div className="notif-thumb-preview">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Grid: TYPE & SEND TO */}
          <div className="notif-grid-2">
            <div className="notif-form-group">
              <label className="notif-label">TYPE</label>
              <select
                className="notif-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="PROMOTIONAL">PROMOTIONAL / SPECIAL OFFER</option>
                <option value="CONTENT_ALERT">CONTENT ALERT (Movies & Shows)</option>
                <option value="SUBSCRIPTION">SUBSCRIPTION & BILLING</option>
                <option value="BLUETICK">BLUE TICK VERIFICATION</option>
                <option value="SYSTEM">SYSTEM UPDATE</option>
              </select>
            </div>

            <div className="notif-form-group">
              <label className="notif-label">SEND TO</label>
              <select
                className="notif-select"
                value={form.sendTo}
                onChange={(e) => {
                  setForm({ ...form, sendTo: e.target.value, targetUser: null });
                  if (e.target.value === "Specific User") setUserDropOpen(true);
                  else setUserDropOpen(false);
                }}
              >
                <option value="All Users">All Users</option>
                <option value="Subscribed Users">Subscribed Users Only</option>
                <option value="Free / Non-Subscribed Users">Free / Non-Subscribed Users</option>
                <option value="Expiring Soon (Next 7 Days)">Expiring Soon (Next 7 Days)</option>
                <option value="Verified Creators">Verified Creators</option>
                <option value="Specific User">Specific User</option>
              </select>
            </div>
          </div>

          {/* Specific User Search Autocomplete */}
          {form.sendTo === "Specific User" && (
            <div className="notif-picker-box">
              <div className="notif-picker-header">
                <span className="notif-picker-header-title">
                  <UserCheck size={14} /> TARGET USER SELECTION *
                </span>
              </div>

              {form.targetUser ? (
                <div className="notif-selected-item-card">
                  <div className="selected-item-info">
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", overflow: "hidden" }}>
                      {form.targetUser.profileImage || form.targetUser.avatar ? (
                        <img src={form.targetUser.profileImage || form.targetUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        (form.targetUser.name || "U")[0]
                      )}
                    </div>
                    <div>
                      <div className="selected-item-name">{form.targetUser.name}</div>
                      <div className="selected-item-tag">@{form.targetUser.username || "user"} • {form.targetUser.email || form.targetUser.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, targetUser: null })}
                    className="btn-remove-selected"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="notif-input-text"
                    placeholder="Search user by name, @username, email, or phone..."
                    value={form.userSearch}
                    onChange={(e) => {
                      setForm({ ...form, userSearch: e.target.value });
                      setUserDropOpen(true);
                    }}
                    onFocus={() => setUserDropOpen(true)}
                  />
                  {userDropOpen && filteredUsers.length > 0 && (
                    <div className="notif-dropdown-list">
                      {filteredUsers.map((u) => (
                        <div
                          key={u._id}
                          onClick={() => {
                            setForm({ ...form, targetUser: u, userSearch: "" });
                            setUserDropOpen(false);
                          }}
                          className="notif-dropdown-row"
                        >
                          <div>
                            <div className="dropdown-item-title">{u.name}</div>
                            <div className="dropdown-item-sub">@{u.username} • {u.email || u.phone}</div>
                          </div>
                          {u.fcmToken && <span style={{ fontSize: "0.7rem", background: "#064e3b", color: "#34d399", padding: "2px 6px", borderRadius: 4 }}>Push Token Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ATTACHMENT TYPE (Radio Buttons) ── */}
          <div className="notif-form-group">
            <label className="notif-label">ATTACHMENT TYPE</label>
            <div className="notif-radio-row">
              <label className="notif-radio-item">
                <input
                  type="radio"
                  name="attachmentType"
                  value="NONE"
                  checked={form.attachmentType === "NONE"}
                  onChange={() =>
                    setForm({
                      ...form,
                      attachmentType: "NONE",
                      selectedContent: null,
                      selectedPlan: null,
                    })
                  }
                />
                <span>None</span>
              </label>

              <label className="notif-radio-item">
                <input
                  type="radio"
                  name="attachmentType"
                  value="CONTENT"
                  checked={form.attachmentType === "CONTENT"}
                  onChange={() => {
                    setForm({ ...form, attachmentType: "CONTENT", selectedPlan: null });
                    setContentPickerOpen(true);
                  }}
                />
                <span>Content</span>
              </label>

              <label className="notif-radio-item">
                <input
                  type="radio"
                  name="attachmentType"
                  value="SUBSCRIPTION_PLAN"
                  checked={form.attachmentType === "SUBSCRIPTION_PLAN"}
                  onChange={() => {
                    setForm({ ...form, attachmentType: "SUBSCRIPTION_PLAN", selectedContent: null });
                    setPlanPickerOpen(true);
                  }}
                />
                <span>Subscription Plan</span>
              </label>
            </div>
          </div>

          {/* Dynamic Content Search & Selection Box */}
          {form.attachmentType === "CONTENT" && (
            <div className="notif-picker-box">
              <div className="notif-picker-header">
                <span className="notif-picker-header-title">
                  <Film size={14} /> SELECT CONTENT ATTACHMENT
                </span>
                {form.selectedContent && (
                  <button
                    type="button"
                    onClick={() => setContentPickerOpen(true)}
                    style={{ background: "none", border: "none", color: "#c084fc", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                  >
                    Change Content
                  </button>
                )}
              </div>

              {form.selectedContent ? (
                <div className="notif-selected-item-card">
                  <div className="selected-item-info">
                    {form.selectedContent.image && (
                      <img src={form.selectedContent.image} alt="" className="selected-item-thumb" />
                    )}
                    <div>
                      <div className="selected-item-name">{form.selectedContent.title}</div>
                      <div className="selected-item-tag">{form.selectedContent.typeName}</div>
                      <div className="selected-item-link">Deep Link: {form.selectedContent.actionUrl}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, selectedContent: null })}
                    className="btn-remove-selected"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="notif-input-text"
                    placeholder="Search movies, series, tv shows, short films..."
                    value={contentSearch}
                    onChange={(e) => {
                      setContentSearch(e.target.value);
                      setContentPickerOpen(true);
                    }}
                    onFocus={() => setContentPickerOpen(true)}
                  />

                  {contentPickerOpen && (
                    <div className="notif-dropdown-list">
                      {filteredContentList.length > 0 ? (
                        filteredContentList.map((c) => (
                          <div
                            key={`${c.type}-${c._id}`}
                            onClick={() => handleSelectContent(c)}
                            className="notif-dropdown-row"
                          >
                            <div className="dropdown-item-left">
                              {c.image && <img src={c.image} alt="" className="dropdown-item-thumb" />}
                              <div>
                                <div className="dropdown-item-title">{c.title}</div>
                                <div className="dropdown-item-sub">{c.typeName}</div>
                              </div>
                            </div>
                            <span className="dropdown-attach-badge">Attach ➔</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                          No matching content found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Subscription Plan Search & Selection Box */}
          {form.attachmentType === "SUBSCRIPTION_PLAN" && (
            <div className="notif-picker-box">
              <div className="notif-picker-header">
                <span className="notif-picker-header-title">
                  <CreditCard size={14} /> SEARCH SUBSCRIPTION PLAN
                </span>
                {form.selectedPlan && (
                  <button
                    type="button"
                    onClick={() => setPlanPickerOpen(true)}
                    style={{ background: "none", border: "none", color: "#c084fc", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                  >
                    Change Plan
                  </button>
                )}
              </div>

              {form.selectedPlan ? (
                <div className="notif-selected-item-card">
                  <div>
                    <div className="selected-item-name">{form.selectedPlan.name}</div>
                    <div className="selected-item-tag">₹{form.selectedPlan.price} • {form.selectedPlan.category} ({form.selectedPlan.duration} Days)</div>
                    <div className="selected-item-link">Link: {form.selectedPlan.actionUrl}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, selectedPlan: null })}
                    className="btn-remove-selected"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="notif-input-text"
                    placeholder="Search plan name (e.g. VIP, Premium, Blue Tick)..."
                    value={planSearch}
                    onChange={(e) => {
                      setPlanSearch(e.target.value);
                      setPlanPickerOpen(true);
                    }}
                    onFocus={() => setPlanPickerOpen(true)}
                  />

                  {planPickerOpen && (
                    <div className="notif-dropdown-list">
                      {filteredPlansList.length > 0 ? (
                        filteredPlansList.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => handleSelectPlan(p)}
                            className="notif-dropdown-row"
                          >
                            <div>
                              <div className="dropdown-item-title">{p.name}</div>
                              <div className="dropdown-item-sub">₹{p.price} • {p.category}</div>
                            </div>
                            <span className="dropdown-attach-badge">Attach ➔</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                          No active plans found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: Send & Clear */}
          <div className="notif-form-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn-send-notif-v2"
            >
              <Send size={16} />
              <span>{loading ? "Sending..." : "Send Notification"}</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="btn-clear-v2"
            >
              ✕ Clear
            </button>
          </div>
        </form>
      </div>

      {/* ── Notification Delivery History Table ── */}
      <div className="notif-history-card">
        <div className="history-header">
          <div className="history-title-wrap">
            <h3>
              <span>Notification Delivery Log</span>
              <span className="history-count-badge">{filteredNotifications.length}</span>
            </h3>
            <p>Track dispatched announcements, deep links, and target reaches</p>
          </div>

          <div className="history-filters">
            {/* Search */}
            <div className="history-search-box">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <Search size={14} className="search-icon" />
            </div>

            {/* Type Filter */}
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="history-type-select"
            >
              <option value="ALL">All Types</option>
              <option value="GENERAL">General</option>
              <option value="PROMOTIONAL">Promotional</option>
              <option value="CONTENT_ALERT">Content Alert</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="BLUETICK">BlueTick</option>
              <option value="REEL">Reel</option>
              <option value="CHAT">Chat</option>
              <option value="CALL">Call</option>
              <option value="ACCOUNT">Account</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Image</th>
                <th>Type</th>
                <th>Audience</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((n) => {
                  const typeCfg = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;
                  const thumb = n.imageUrl || n.metadata?.imageUrl || "";

                  return (
                    <tr key={n._id}>
                      {/* Title & Message */}
                      <td style={{ maxWidth: "320px" }}>
                        <div className="history-notif-title">{n.title}</div>
                        <div className="history-notif-msg">{n.message}</div>
                        {n.actionUrl && (
                          <div className="history-notif-link">
                            <ExternalLink size={11} /> {n.actionUrl}
                          </div>
                        )}
                      </td>

                      {/* Image Thumbnail */}
                      <td>
                        {thumb ? (
                          <img src={thumb} alt="" className="history-thumb" />
                        ) : (
                          <span style={{ color: "#475569", fontFamily: "monospace" }}>—</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td>
                        <span
                          className="type-pill"
                          style={{ backgroundColor: typeCfg.bg, color: typeCfg.color }}
                        >
                          {n.type}
                        </span>
                      </td>

                      {/* Audience / Target */}
                      <td>
                        {n.targetUser ? (
                          <span style={{ color: "#d8b4fe", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <UserCheck size={12} /> {n.targetUser.name || "User"}
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>{n.targetUserType || "All Users"}</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "0.78rem" }}>
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="history-action-btns" style={{ justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setViewNotif(n)}
                            className="action-icon-btn"
                            title="View Full Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(n._id)}
                            className="action-icon-btn delete"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                    No notification history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View Detail Modal ── */}
      {viewNotif && (
        <div className="notif-modal-overlay" onClick={() => setViewNotif(null)}>
          <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className="type-pill"
                  style={{
                    backgroundColor: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).bg,
                    color: (TYPE_COLORS[viewNotif.type] || TYPE_COLORS.GENERAL).color,
                  }}
                >
                  {viewNotif.type}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {new Date(viewNotif.createdAt).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setViewNotif(null)} className="action-icon-btn">
                <X size={16} />
              </button>
            </div>

            {viewNotif.imageUrl && (
              <div className="modal-img-banner">
                <img src={viewNotif.imageUrl} alt="" />
              </div>
            )}

            <div>
              <h3 className="modal-title">{viewNotif.title}</h3>
              <p className="modal-message">{viewNotif.message}</p>
            </div>

            {viewNotif.actionUrl && (
              <div className="modal-link-box">
                <ExternalLink size={14} /> Link: {viewNotif.actionUrl}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "0.8rem" }}>
              <div>
                <span style={{ display: "block", color: "#64748b", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 800 }}>Audience</span>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>
                  {viewNotif.targetUser?.name ? `User: ${viewNotif.targetUser.name}` : viewNotif.targetUserType || "All Users"}
                </span>
              </div>
              <div>
                <span style={{ display: "block", color: "#64748b", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 800 }}>Status</span>
                <span style={{ color: "#34d399", fontWeight: 700 }}>Delivered</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
