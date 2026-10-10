import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import {
  BadgeCheck,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Ban,
  Trash2,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Coins,
  Apple,
  Copy,
  CheckCircle2,
  Shield,
  Calendar,
  Phone,
  Mail,
  Hash,
  User,
  CreditCard,
  Zap,
} from "lucide-react";
import "./VerificationManagement.css";

export default function VerificationManagement() {
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, VERIFIED, PENDING, REJECTED, SUSPENDED, SETTINGS, REDEEM
  const [stats, setStats] = useState({
    totalVerifiedUsers: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    suspendedUsers: 0,
    todayApplications: 0,
    verificationRate: "0%",
  });

  const [requests, setRequests] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [viewRequest, setViewRequest] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // request item
  const [rejectReason, setRejectReason] = useState("");
  const [suspendModal, setSuspendModal] = useState(null); // request item or user
  const [suspendReason, setSuspendReason] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [manualVerifyUserId, setManualVerifyUserId] = useState("");

  // Live Apple Verification inside Modal & Copy state
  const [copiedKey, setCopiedKey] = useState(null);
  const [modalVerifying, setModalVerifying] = useState(false);
  const [modalVerifyResult, setModalVerifyResult] = useState(null);
  const [modalVerifyError, setModalVerifyError] = useState("");

  const handleCopy = (text, key) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLiveAppleVerifyInModal = async (txId) => {
    if (!txId) return;
    setModalVerifying(true);
    setModalVerifyError("");
    setModalVerifyResult(null);
    try {
      const res = await API.post("/admin/apple-payments/verify-single", {
        transactionId: txId,
      });
      if (res.data?.success) {
        setModalVerifyResult(res.data);
      } else {
        setModalVerifyError(res.data?.message || "Verification failed");
      }
    } catch (err) {
      setModalVerifyError(
        err.response?.data?.message ||
          "Could not verify transaction with Apple StoreKit 2."
      );
    } finally {
      setModalVerifying(false);
    }
  };

  // User Selection for Manual Verification
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  // Redeem Modals state
  const [approveRedeemModal, setApproveRedeemModal] = useState(null);
  const [approveRupeesInput, setApproveRupeesInput] = useState("");
  const [approveAdminRemark, setApproveAdminRemark] = useState("");
  const [rejectRedeemModal, setRejectRedeemModal] = useState(null);
  const [rejectRedeemReason, setRejectRedeemReason] = useState("");

  const getMediaUrl = (path) => {
    if (!path) return "/avatar-placeholder.png";
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [activeTab, page, search]);

  useEffect(() => {
    if (activeTab === "SETTINGS") {
      fetchUsersForSelection(userSearchQuery);
    }
  }, [activeTab, userSearchQuery]);

  const fetchUsersForSelection = async (searchQuery = "") => {
    setIsFetchingUsers(true);
    try {
      const res = await API.get("/admin/verification/users-select", {
        params: { search: searchQuery },
      });
      if (res.data?.success) {
        const fetched = res.data.users || [];
        setUsersList(fetched);
        if (fetched.length > 0 && !selectedUser) {
          setSelectedUser(fetched[0]);
          setManualVerifyUserId(fetched[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users for selection:", err);
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/admin/verification/stats");
      if (res.data?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch verification stats:", err);
    }
  };

  const fetchRequests = async () => {
    if (activeTab === "SETTINGS") return;
    setLoading(true);
    try {
      if (activeTab === "REDEEM") {
        const res = await API.get("/admin/redeem", {
          params: { page, limit: 15 },
        });
        if (res.data?.success) {
          setRedeemRequests(res.data.requests || []);
          setTotalPages(res.data.totalPages || 1);
        }
      } else {
        const res = await API.get("/admin/verification", {
          params: {
            status: activeTab,
            search,
            page,
            limit: 15,
          },
        });
        if (res.data?.success) {
          setRequests(res.data.requests || []);
          setTotalPages(res.data.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setRequests([]);
      setRedeemRequests([]);
    }
    setLoading(false);
  };

  const handleApproveRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!approveRedeemModal) return;
    const rupees = Number(approveRupeesInput);
    if (isNaN(rupees) || rupees < 0) {
      alert("Please enter a valid non-negative rupee amount.");
      return;
    }
    try {
      const res = await API.put(`/admin/redeem/${approveRedeemModal._id}/approve`, {
        amount: rupees,
        adminRemark: approveAdminRemark,
      });
      if (res.data?.success) {
        alert(`Redeem request approved! Payout amount ₹${rupees} logged and notified to creator.`);
        setApproveRedeemModal(null);
        setApproveRupeesInput("");
        setApproveAdminRemark("");
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve redeem request.");
    }
  };

  const handleRejectRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!rejectRedeemModal) return;
    if (!rejectRedeemReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    try {
      const res = await API.put(`/admin/redeem/${rejectRedeemModal._id}/reject`, {
        reason: rejectRedeemReason,
      });
      if (res.data?.success) {
        alert("Redeem request rejected and coins restored to user!");
        setRejectRedeemModal(null);
        setRejectRedeemReason("");
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject redeem request.");
    }
  };

  const handleApprove = async (reqId) => {
    if (!window.confirm("Approve this profile verification request?")) return;
    try {
      const res = await API.patch("/admin/verification/approve", { id: reqId });
      if (res.data?.success) {
        alert("Verification request approved successfully!");
        setViewRequest(null);
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve verification request.");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert("Please enter a reason for rejection.");
      return;
    }
    try {
      const res = await API.patch("/admin/verification/reject", {
        id: rejectModal._id,
        reason: rejectReason.trim(),
      });
      if (res.data?.success) {
        alert("Verification request rejected.");
        setRejectModal(null);
        setRejectReason("");
        setViewRequest(null);
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject verification request.");
    }
  };

  const handleSuspendSubmit = async (e) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      alert("Please enter a reason for suspension.");
      return;
    }
    try {
      const res = await API.patch("/admin/verification/suspend", {
        id: suspendModal._id,
        userId: suspendModal.userId?._id || suspendModal.userId,
        reason: suspendReason.trim(),
      });
      if (res.data?.success) {
        alert("User verification badge suspended.");
        setSuspendModal(null);
        setSuspendReason("");
        setViewRequest(null);
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to suspend verification.");
    }
  };

  const handleRemoveVerification = async (userId) => {
    if (!window.confirm("Remove orange tick verification badge from this user?")) return;
    try {
      const res = await API.patch("/admin/verification/remove", { userId });
      if (res.data?.success) {
        alert("Orange tick verification badge removed.");
        setViewRequest(null);
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove verification badge.");
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to permanently delete this verification request history?")) return;
    try {
      const res = await API.delete(`/admin/verification/${requestId}`);
      if (res.data?.success) {
        alert("Verification request history deleted permanently.");
        setViewRequest(null);
        fetchStats();
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete verification request.");
    }
  };

  // Toast Notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4500);
  };

  const handleManualVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetId = manualVerifyUserId || selectedUser?._id;
    if (!targetId) {
      showToast("Please select a user to verify.", "error");
      return;
    }

    try {
      const res = await API.patch("/admin/verification/user/verify", {
        userId: targetId,
      });

      if (res.data?.success) {
        const successMsg = res.data.message || `🎉 Orange Tick granted successfully to ${selectedUser?.name || 'User'}!`;
        
        // 1. Show Toast Notification instantly
        showToast(successMsg, "success");

        // 2. Automatically update selected user state without page refresh
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                isVerified: true,
                verification: {
                  ...prev.verification,
                  status: "VERIFIED",
                  isVerified: true,
                },
              }
            : null
        );

        // 3. Update users list in memory so dropdown updates instantly
        setUsersList((prevList) =>
          prevList.map((u) =>
            u._id === targetId
              ? {
                  ...u,
                  isVerified: true,
                  verification: {
                    ...u.verification,
                    status: "VERIFIED",
                    isVerified: true,
                  },
                }
              : u
          )
        );

        // 4. Background re-fetch stats, requests & dropdown list without page refresh
        fetchStats();
        fetchRequests();
        fetchUsersForSelection(userSearchQuery);
      } else {
        showToast(res.data?.message || "Failed to grant Orange Tick.", "error");
      }
    } catch (err) {
      console.error("Manual verify error:", err);
      showToast(err.response?.data?.message || "Failed to manually verify user.", "error");
    }
  };

  return (
    <div className="verification-management">
      {/* ── TOASTER NOTIFICATION ── */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            borderRadius: "12px",
            background: toast.type === "success" ? "#064e3b" : "#7f1d1d",
            color: "#ffffff",
            border: toast.type === "success" ? "1px solid #059669" : "1px solid #dc2626",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
            fontSize: "0.9rem",
            fontWeight: 700,
            maxWidth: "450px",
            transition: "all 0.3s ease",
          }}
        >
          {toast.type === "success" ? (
            <BadgeCheck size={22} color="#34d399" />
          ) : (
            <AlertTriangle size={22} color="#fca5a5" />
          )}
          <span style={{ flex: 1, lineHeight: "1.4" }}>{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: "", type: "success" })}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="verif-header">
        <div className="verif-header-title">
          <BadgeCheck size={28} color="#f97316" />
          <div>
            <h1>Orange Tick & Verification Management</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "2px 0 0" }}>
              Review, approve, reject, and manage profile verification requests.
            </p>
          </div>
        </div>
        <button
          className="verif-btn secondary"
          onClick={() => {
            fetchStats();
            fetchRequests();
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* ── Dashboard Statistics Cards ── */}
      <div className="verif-stats-grid">
        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316" }}>
            <BadgeCheck size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.totalVerifiedUsers}</div>
            <div className="verif-stat-lbl">Total Verified Users (Orange Tick)</div>
          </div>
        </div>

        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.pendingRequests}</div>
            <div className="verif-stat-lbl">Pending Requests</div>
          </div>
        </div>

        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
            <XCircle size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.rejectedRequests}</div>
            <div className="verif-stat-lbl">Rejected Requests</div>
          </div>
        </div>

        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.suspendedUsers}</div>
            <div className="verif-stat-lbl">Suspended Users</div>
          </div>
        </div>

        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.todayApplications}</div>
            <div className="verif-stat-lbl">Today's Applications</div>
          </div>
        </div>

        <div className="verif-stat-card">
          <div className="verif-stat-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="verif-stat-val">{stats.verificationRate}</div>
            <div className="verif-stat-lbl">Verification Rate</div>
          </div>
        </div>
      </div>

      {/* ── Submenus / Navigation Tabs ── */}
      <div className="verif-tabs">
        <button
          className={`verif-tab-btn ${activeTab === "ALL" ? "active" : ""}`}
          onClick={() => { setActiveTab("ALL"); setPage(1); }}
        >
          <FileText size={16} /> Verification Requests
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "PENDING" ? "active" : ""}`}
          onClick={() => { setActiveTab("PENDING"); setPage(1); }}
        >
          <Clock size={16} /> Pending Requests ({stats.pendingRequests})
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "VERIFIED" ? "active" : ""}`}
          onClick={() => { setActiveTab("VERIFIED"); setPage(1); }}
        >
          <BadgeCheck size={16} /> Verified Users ({stats.totalVerifiedUsers})
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "REJECTED" ? "active" : ""}`}
          onClick={() => { setActiveTab("REJECTED"); setPage(1); }}
        >
          <XCircle size={16} /> Rejected Requests ({stats.rejectedRequests})
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "SUSPENDED" ? "active" : ""}`}
          onClick={() => { setActiveTab("SUSPENDED"); setPage(1); }}
        >
          <Ban size={16} /> Suspended Users ({stats.suspendedUsers})
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "REDEEM" ? "active" : ""}`}
          onClick={() => { setActiveTab("REDEEM"); setPage(1); }}
          style={{ background: activeTab === "REDEEM" ? "#f59e0b" : "", color: activeTab === "REDEEM" ? "#fff" : "" }}
        >
          <Coins size={16} /> Coins Redeem Requests
        </button>
        <button
          className={`verif-tab-btn ${activeTab === "SETTINGS" ? "active" : ""}`}
          onClick={() => setActiveTab("SETTINGS")}
        >
          <ShieldCheck size={16} /> Verification Settings
        </button>
      </div>

      {activeTab === "SETTINGS" ? (
        <div className="verif-settings-card">
          <div className="verif-settings-header">
            <UserCheck size={26} color="#f97316" />
            <h2 className="verif-settings-title">Manually Verify User</h2>
          </div>
          <p className="verif-settings-desc">
            Search and select any registered user by their Name or Username to grant official Orange Tick verification status directly.
          </p>

          <div className="verif-settings-grid">
            {/* Left Column: Search & Select Dropdown Menu */}
            <div className="verif-settings-column">
              <label className="verif-settings-label">
                1. Search Registered Users (By Name or @username)
              </label>
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Type to search user name or username..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="verif-settings-input"
                />
                {isFetchingUsers && (
                  <RefreshCw
                    className="animate-spin"
                    size={16}
                    style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-muted, #94a3b8)" }}
                  />
                )}
              </div>

              <label className="verif-settings-label">
                2. Select User from Dropdown ({usersList.length} users listed)
              </label>
              <select
                size={8}
                value={selectedUser?._id || ""}
                onChange={(e) => {
                  const u = usersList.find((usr) => usr._id === e.target.value);
                  if (u) {
                    setSelectedUser(u);
                    setManualVerifyUserId(u._id);
                  }
                }}
                className="verif-settings-select"
              >
                {usersList.length === 0 ? (
                  <option disabled style={{ padding: "10px", color: "var(--text-muted, #94a3b8)" }}>
                    No matching active users found.
                  </option>
                ) : (
                  usersList.map((u) => {
                    const isVer = u.isVerified || u.verification?.isVerified || u.verification?.status === "VERIFIED";
                    return (
                      <option
                        key={u._id}
                        value={u._id}
                        style={{
                          padding: "10px 12px",
                          margin: "2px 0",
                          borderRadius: "6px",
                          background: selectedUser?._id === u._id ? "#f97316" : "transparent",
                          color: selectedUser?._id === u._id ? "#fff" : "inherit",
                          fontWeight: 600,
                        }}
                      >
                        {u.name} (@{u.username || "user"}) {isVer ? "✔️ [VERIFIED]" : "— Unverified"}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Right Column: Selected User Card & Grant Action */}
            <div className="verif-settings-column verif-user-preview-column">
              {selectedUser ? (
                <div>
                  <h3 className="verif-preview-heading">
                    Selected User Details
                  </h3>

                  <div className="verif-preview-user-card">
                    <img
                      src={getMediaUrl(selectedUser.profileImage)}
                      alt={selectedUser.name}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #f97316",
                      }}
                    />
                    <div>
                      <div className="verif-preview-user-name">
                        <span>{selectedUser.name}</span>
                        {(selectedUser.isVerified || selectedUser.verification?.isVerified || selectedUser.verification?.status === "VERIFIED") && (
                          <BadgeCheck size={20} color="#f97316" />
                        )}
                      </div>
                      <div className="verif-preview-user-handle">
                        {selectedUser.username ? (selectedUser.username.startsWith("@") ? selectedUser.username : `@${selectedUser.username}`) : "@user"}
                      </div>
                      <div className="verif-preview-user-id">
                        ID: {selectedUser._id}
                      </div>
                    </div>
                  </div>

                  <div className="verif-preview-status-box">
                    <div className="verif-preview-status-lbl">Current Verification Status:</div>
                    <strong style={{ color: selectedUser.isVerified || selectedUser.verification?.isVerified || selectedUser.verification?.status === "VERIFIED" ? "#10b981" : "#f59e0b" }}>
                      {selectedUser.isVerified || selectedUser.verification?.isVerified || selectedUser.verification?.status === "VERIFIED"
                        ? "✔️ Official Orange Tick Active"
                        : "⚠️ Unverified User"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--text-muted, #64748b)", padding: "40px 20px" }}>
                  <UserCheck size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>Select a user from the dropdown list on the left to verify.</p>
                </div>
              )}

              {selectedUser && (
                <button
                  className="verif-btn approve"
                  onClick={handleManualVerify}
                  style={{
                    width: "100%",
                    padding: "13px",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    borderRadius: "10px",
                    justifyContent: "center",
                    marginTop: "20px",
                    background: "#f97316",
                  }}
                >
                  <BadgeCheck size={20} /> Grant Orange Tick to {selectedUser.name}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "REDEEM" ? (
        <div className="verif-table-wrapper" style={{ marginTop: "20px" }}>
          <table className="verif-table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Requested Coins</th>
                <th>Payment & Payout Details</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>Loading redeem requests...</td>
                </tr>
              ) : redeemRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>No coins redeem requests found.</td>
                </tr>
              ) : (
                redeemRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={getMediaUrl(req.creatorId?.profileImage)}
                          alt=""
                          style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{req.creatorId?.name || "Creator"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {req.creatorId?.username || ""} • {req.creatorId?.phone || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: "#f59e0b", fontSize: "1rem" }}>
                        {req.points} Coins
                      </span>
                    </td>
                    <td>
                      {req.paymentDetails?.paymentMethod === "BANK_TRANSFER" ? (
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: "8px" }}>
                          <div style={{ color: "#38bdf8", fontWeight: 700 }}>🏦 Bank Transfer</div>
                          <div>Name: <strong>{req.paymentDetails.accountHolderName}</strong></div>
                          <div>Acc: <strong>{req.paymentDetails.accountNumber}</strong> | IFSC: <strong>{req.paymentDetails.ifscCode}</strong></div>
                          {req.paymentDetails.bankName && <div>Bank: {req.paymentDetails.bankName}</div>}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: "8px" }}>
                          <div style={{ color: "#38bdf8", fontWeight: 700 }}>⚡ UPI Payment</div>
                          <div style={{ color: "#94a3b8" }}>UPI ID: <strong style={{ color: "#f59e0b" }}>{req.paymentDetails?.upiId || "UPI Submitted"}</strong></div>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {req.status === "PENDING" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="verif-btn approve"
                            onClick={() => {
                              setApproveRedeemModal(req);
                              setApproveRupeesInput(Math.round(req.points * 0.1));
                              setApproveAdminRemark("");
                            }}
                          >
                            <Check size={14} /> Approve & Set ₹
                          </button>
                          <button
                            className="verif-btn reject"
                            onClick={() => {
                              setRejectRedeemModal(req);
                              setRejectRedeemReason("");
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : req.status === "APPROVED" ? (
                        <div style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 700 }}>
                          Approved Payout: ₹{req.amount} INR
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>
                          Rejected: {req.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* ── Search Controls ── */}
          <div className="verif-controls">
            <div className="verif-search-box">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by full name, username or ID number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* ── Table Container ── */}
          <div className="verif-table-container">
            <table className="verif-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Government ID</th>
                  <th>Phone / Email</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px 0" }}>
                      <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
                      <div>Loading verification requests...</div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                      No verification requests found matching current filter.
                    </td>
                  </tr>
                ) : (
                  requests.map((reqItem) => {
                    const u = reqItem.userId || {};
                    return (
                      <tr key={reqItem._id}>
                        <td>
                          <div className="verif-user-cell">
                            <img
                              src={getMediaUrl(u.profileImage ||"https://static.vecteezy.com/system/resources/previews/065/959/781/non_2x/simple-dark-blue-user-profile-icon-person-symbol-free-vector.jpg")}
                              alt={reqItem.fullName}
                              className="verif-avatar"
                            />
                            <div className="verif-user-info">
                              <div className="verif-user-name">
                                {reqItem.fullName}{" "}
                                {(u.verification?.isVerified || reqItem.status === "VERIFIED") && (
                                  <BadgeCheck size={16} color="#f97316" />
                                )}
                              </div>
                              <div className="verif-user-uname">{reqItem.username || u.username || "@user"}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{reqItem.governmentIdType}</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{reqItem.governmentIdNumber || "N/A"}</div>
                        </td>

                        <td>
                          <div>{u.phone || "N/A"}</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{u.email || "N/A"}</div>
                        </td>

                        <td>{new Date(reqItem.createdAt).toLocaleDateString()}</td>

                        <td>
                          <span className={`status-badge ${reqItem.status}`}>
                            {reqItem.status === "VERIFIED" && <Check size={12} />}
                            {reqItem.status === "PENDING" && <Clock size={12} />}
                            {reqItem.status === "REJECTED" && <X size={12} />}
                            {reqItem.status === "SUSPENDED" && <Ban size={12} />}
                            {reqItem.status}
                          </span>
                        </td>

                        <td>
                          <div className="verif-actions">
                            <button
                              className="btn-icon"
                              title="View Application Details"
                              onClick={() => {
                                setViewRequest(reqItem);
                                setModalVerifyResult(null);
                                setModalVerifyError("");
                              }}
                            >
                              <Eye size={16} />
                            </button>

                            {reqItem.status === "PENDING" && (
                              <>
                                <button
                                  className="btn-icon approve"
                                  title="Approve Request"
                                  onClick={() => handleApprove(reqItem._id)}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  className="btn-icon reject"
                                  title="Reject Request"
                                  onClick={() => setRejectModal(reqItem)}
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}

                            {reqItem.status === "VERIFIED" && (
                              <>
                                <button
                                  className="btn-icon suspend"
                                  title="Suspend Verification"
                                  onClick={() => setSuspendModal(reqItem)}
                                >
                                  <Ban size={16} />
                                </button>
                              </>
                            )}

                            <button
                              className="btn-icon reject"
                              title="Delete Request History"
                              onClick={() => handleDeleteRequest(reqItem._id)}
                              style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── View Application Details Modal ── */}
      {viewRequest && (() => {
        const user = viewRequest.userId || {};
        const payment = viewRequest.paymentInfo || {};
        const isApple =
          payment.isApple ||
          viewRequest.paymentGateway === "apple" ||
          Boolean(viewRequest.appleDetails?.transactionId) ||
          Boolean(viewRequest.paymentId && /^\d{10,}$/.test(String(viewRequest.paymentId).trim()));

        const rawGateway = payment.paymentGateway || viewRequest.paymentGateway || (isApple ? "apple" : viewRequest.paymentId ? "razorpay" : "manual");
        const txId = payment.transactionId || viewRequest.appleDetails?.transactionId || viewRequest.paymentId || "";
        const origTxId = payment.originalTransactionId || viewRequest.appleDetails?.originalTransactionId || viewRequest.orderId || "";
        const prodId = payment.appleProductId || viewRequest.appleDetails?.productId || viewRequest.selectedPlan?.planId?.appleProductId || "—";
        const env = payment.environment || viewRequest.appleDetails?.environment || (txId && String(txId).startsWith("2") ? "Production" : "Sandbox");
        const payStatus = payment.paymentStatus || viewRequest.paymentStatus || (txId ? "PAID" : "UNPAID");
        const amount = payment.amount || viewRequest.selectedPlan?.price || 0;
        const planName = viewRequest.selectedPlan?.name || "Orange Tick Verification";
        const planDuration = viewRequest.selectedPlan?.duration || 30;

        return (
          <div className="verif-modal-overlay" onClick={() => setViewRequest(null)}>
            <div className="verif-modal-card rich-details" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="verif-modal-top">
                <div className="verif-title-group">
                  <div className="verif-title-icon">
                    <BadgeCheck size={26} color="#f97316" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: "#fff", fontSize: "1.3rem" }}>Verification Application Details</h2>
                    <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.84rem" }}>
                      Application ID: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{viewRequest._id}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`status-badge ${viewRequest.status}`}>
                    {viewRequest.status}
                  </span>
                  <button className="btn-icon" onClick={() => setViewRequest(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 1. Applicant & User Profile Card */}
              <div className="verif-section-card">
                <div className="verif-section-header">
                  <h4 className="verif-section-title">
                    <User size={16} color="#3b82f6" /> Applicant & User Profile
                  </h4>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Applied on {new Date(viewRequest.createdAt).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <img
                    src={getMediaUrl(user.profileImage || viewRequest.selfie)}
                    alt={viewRequest.fullName}
                    className="verif-avatar"
                    style={{ width: "62px", height: "62px", borderRadius: "50%", border: "2px solid #f97316" }}
                    onError={(e) => (e.target.src = "/avatar-placeholder.png")}
                  />
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      {viewRequest.fullName || user.name || "User"}
                      {(viewRequest.status === "VERIFIED" || user.isVerified) && (
                        <BadgeCheck size={20} color="#f97316" />
                      )}
                    </h3>
                    <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.88rem" }}>
                      {viewRequest.username || user.username || "@username"}
                    </p>
                  </div>
                </div>

                <div className="verif-user-grid">
                  <div className="user-meta-field">
                    <span className="meta-field-label"><Hash size={12} /> User ID</span>
                    <span className="meta-field-val code">
                      {user._id ? String(user._id) : "—"}
                      {user._id && (
                        <button className="copy-inline-btn" title="Copy User ID" onClick={() => handleCopy(String(user._id), "user-id")}>
                          {copiedKey === "user-id" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      )}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label"><Phone size={12} /> Mobile Phone</span>
                    <span className="meta-field-val">
                      {user.phone ? `+${user.phone}` : "Not provided"}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label"><Mail size={12} /> Email</span>
                    <span className="meta-field-val">
                      {user.email || "Not linked"}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label"><Shield size={12} /> Account Role</span>
                    <span className="meta-field-val">
                      {user.role || "USER"} · {user.isCreator ? "Creator Account" : "Standard"}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label"><Calendar size={12} /> Member Since</span>
                    <span className="meta-field-val">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label"><BadgeCheck size={12} /> Badge Status</span>
                    <span className="meta-field-val" style={{ color: user.isVerified || user.verification?.status === "VERIFIED" ? "#10b981" : "#f59e0b" }}>
                      {user.verification?.status || (user.isVerified ? "VERIFIED" : "NOT_VERIFIED")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Payment & In-App Purchase Details Card */}
              <div className="verif-section-card verif-payment-card">
                <div className="verif-section-header">
                  <h4 className="verif-section-title">
                    {isApple ? <Apple size={16} color="#38bdf8" /> : <CreditCard size={16} color="#60a5fa" />}
                    Payment & StoreKit Purchase Breakdown
                  </h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className={`payment-gateway-pill ${isApple ? "apple" : rawGateway === "razorpay" ? "razorpay" : "manual"}`}>
                      {isApple ? (
                        <>
                          <Apple size={13} /> Apple StoreKit (IAP)
                        </>
                      ) : rawGateway === "razorpay" ? (
                        "💳 Razorpay"
                      ) : (
                        "🏷️ Manual / Grant"
                      )}
                    </span>
                    <span className={`status-badge ${payStatus === "PAID" ? "VERIFIED" : "PENDING"}`}>
                      {payStatus}
                    </span>
                  </div>
                </div>

                <div className="verif-payment-grid">
                  <div className="user-meta-field">
                    <span className="meta-field-label">Selected Plan</span>
                    <span className="meta-field-val" style={{ color: "#f97316" }}>
                      {planName} ({planDuration} days)
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label">Amount Paid</span>
                    <span className="meta-field-val" style={{ color: "#10b981", fontSize: "1rem" }}>
                      ₹{amount} INR
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label">Apple Product ID</span>
                    <span className="meta-field-val code" style={{ color: "#38bdf8" }}>
                      {prodId}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label">Environment</span>
                    <span className="meta-field-val">
                      <span className={`env-badge ${env?.toLowerCase()}`}>
                        {env === "Sandbox" ? "🧪 Sandbox" : "🟢 Production"}
                      </span>
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label">Transaction ID</span>
                    <span className="meta-field-val code">
                      {txId || "—"}
                      {txId && (
                        <button className="copy-inline-btn" title="Copy Transaction ID" onClick={() => handleCopy(txId, "modal-tx")}>
                          {copiedKey === "modal-tx" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      )}
                    </span>
                  </div>

                  <div className="user-meta-field">
                    <span className="meta-field-label">Original Transaction / Order ID</span>
                    <span className="meta-field-val code">
                      {origTxId || "—"}
                      {origTxId && (
                        <button className="copy-inline-btn" title="Copy Order ID" onClick={() => handleCopy(origTxId, "modal-orig")}>
                          {copiedKey === "modal-orig" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                {/* Live Apple StoreKit Verification Diagnostic Trigger */}
                {txId && (
                  <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600 }}>
                          Apple StoreKit 2 Live Verification Engine
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>
                          Query Apple App Store servers to cryptographically confirm receipt & ownership.
                        </p>
                      </div>

                      <button
                        className="apple-live-verify-btn"
                        onClick={() => handleLiveAppleVerifyInModal(txId)}
                        disabled={modalVerifying}
                      >
                        {modalVerifying ? (
                          <>
                            <RefreshCw size={14} className="spin" /> Verifying with Apple...
                          </>
                        ) : (
                          <>
                            <Zap size={14} /> Verify Apple Transaction
                          </>
                        )}
                      </button>
                    </div>

                    {modalVerifyResult && (
                      <div className="live-verify-banner success">
                        <div className="live-verify-banner-content">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <CheckCircle2 size={18} color="#10b981" />
                            <div>
                              <strong>StoreKit 2 Signature Validated: Active Apple In-App Purchase</strong>
                              <div style={{ fontSize: "0.76rem", color: "#cbd5e1", marginTop: "2px" }}>
                                Protocol: {modalVerifyResult.storeKitVersion} · Algorithm: {modalVerifyResult.cryptographicAlgorithm} · Environment: {modalVerifyResult.environment}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, color: "#10b981" }}>OWNERSHIP: {modalVerifyResult.ownershipType || "PURCHASED"}</span>
                        </div>
                      </div>
                    )}

                    {modalVerifyError && (
                      <div className="live-verify-banner error">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <AlertTriangle size={18} color="#ef4444" />
                          <span>{modalVerifyError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Uploaded Identity Documents */}
              <div className="verif-section-card">
                <div className="verif-section-header">
                  <h4 className="verif-section-title">
                    <FileText size={16} color="#a855f7" /> Uploaded Identity Documents
                  </h4>
                  <span style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                    ID: <strong>{viewRequest.governmentIdType}</strong> ({viewRequest.governmentIdNumber || "Number Not Provided"})
                  </span>
                </div>

                <div className="verif-doc-grid">
                  <div className="verif-doc-card">
                    <img
                      src={getMediaUrl(viewRequest.idFront)}
                      alt="Front ID"
                      onClick={() => setImagePreview(getMediaUrl(viewRequest.idFront))}
                    />
                    <div className="verif-doc-label">Front ID Image (Click to Zoom)</div>
                  </div>

                  {viewRequest.idBack ? (
                    <div className="verif-doc-card">
                      <img
                        src={getMediaUrl(viewRequest.idBack)}
                        alt="Back ID"
                        onClick={() => setImagePreview(getMediaUrl(viewRequest.idBack))}
                      />
                      <div className="verif-doc-label">Back ID Image (Click to Zoom)</div>
                    </div>
                  ) : (
                    <div className="verif-doc-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "160px" }}>
                      <FileText size={32} color="#64748b" />
                      <div className="verif-doc-label" style={{ marginTop: "10px" }}>Back ID Not Provided</div>
                    </div>
                  )}

                  <div className="verif-doc-card">
                    <img
                      src={getMediaUrl(viewRequest.selfie)}
                      alt="Selfie Photo"
                      onClick={() => setImagePreview(getMediaUrl(viewRequest.selfie))}
                    />
                    <div className="verif-doc-label">Selfie Photo (Face Match)</div>
                  </div>
                </div>
              </div>

              {/* 4. Social Links & Online Presence */}
              <div className="verif-section-card">
                <h4 className="verif-section-title">
                  <ExternalLink size={16} color="#06b6d4" /> Social Profiles & Online Presence
                </h4>
                <div className="verif-social-chips">
                  {viewRequest.website && (
                    <a href={viewRequest.website} target="_blank" rel="noreferrer" className="social-chip website">
                      🌐 Website <ExternalLink size={12} />
                    </a>
                  )}
                  {viewRequest.instagram && (
                    <a href={viewRequest.instagram.startsWith("http") ? viewRequest.instagram : `https://instagram.com/${viewRequest.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="social-chip instagram">
                      📸 Instagram <ExternalLink size={12} />
                    </a>
                  )}
                  {viewRequest.youtube && (
                    <a href={viewRequest.youtube} target="_blank" rel="noreferrer" className="social-chip youtube">
                      ▶️ YouTube <ExternalLink size={12} />
                    </a>
                  )}
                  {viewRequest.facebook && (
                    <a href={viewRequest.facebook} target="_blank" rel="noreferrer" className="social-chip facebook">
                      📘 Facebook <ExternalLink size={12} />
                    </a>
                  )}
                  {viewRequest.twitter && (
                    <a href={viewRequest.twitter.startsWith("http") ? viewRequest.twitter : `https://x.com/${viewRequest.twitter.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="social-chip twitter">
                      𝕏 Twitter / X <ExternalLink size={12} />
                    </a>
                  )}
                  {viewRequest.linkedin && (
                    <a href={viewRequest.linkedin} target="_blank" rel="noreferrer" className="social-chip linkedin">
                      💼 LinkedIn <ExternalLink size={12} />
                    </a>
                  )}
                  {!viewRequest.website && !viewRequest.instagram && !viewRequest.facebook && !viewRequest.youtube && !viewRequest.twitter && !viewRequest.linkedin && (
                    <span style={{ fontSize: "0.84rem", color: "#64748b" }}>No social media profiles submitted.</span>
                  )}
                </div>
              </div>

              {/* 5. Application Reason & Notes */}
              <div className="verif-section-card">
                <h4 className="verif-section-title">
                  <FileText size={16} color="#f59e0b" /> Application Reason & Notes
                </h4>
                <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {viewRequest.reason || "Applicant did not provide custom notes."}
                </p>

                {viewRequest.adminRemark && (
                  <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                    <span style={{ fontSize: "0.76rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Admin Review Remark:</span>
                    <p style={{ margin: "4px 0 0", color: "#fef3c7", fontSize: "0.85rem" }}>{viewRequest.adminRemark}</p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="verif-modal-actions">
                {viewRequest.status === "PENDING" && (
                  <>
                    <button
                      className="verif-btn approve"
                      onClick={() => handleApprove(viewRequest._id)}
                    >
                      <Check size={16} /> Approve Verification
                    </button>
                    <button
                      className="verif-btn reject"
                      onClick={() => setRejectModal(viewRequest)}
                    >
                      <X size={16} /> Reject Request
                    </button>
                  </>
                )}

                {viewRequest.status === "VERIFIED" && (
                  <>
                    <button
                      className="verif-btn suspend"
                      onClick={() => setSuspendModal(viewRequest)}
                    >
                      <Ban size={16} /> Suspend Verification
                    </button>
                    <button
                      className="verif-btn reject"
                      onClick={() => handleRemoveVerification(viewRequest.userId?._id || viewRequest.userId)}
                    >
                      <Trash2 size={16} /> Remove Orange Tick
                    </button>
                  </>
                )}

                <button
                  className="verif-btn reject"
                  onClick={() => handleDeleteRequest(viewRequest._id)}
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={16} /> Delete Request History
                </button>

                <button
                  className="verif-btn secondary"
                  onClick={() => setViewRequest(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Reject Reason Popup Modal ── */}
      {rejectModal && (
        <div className="verif-modal-overlay">
          <div className="verif-modal-card" style={{ maxWidth: "450px" }}>
            <div className="verif-modal-header">
              <h2>Reject Verification Request</h2>
              <button className="btn-icon" onClick={() => setRejectModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: 0 }}>
                Please specify the reason for rejecting <strong>{rejectModal.fullName}</strong>'s request:
              </p>
              <textarea
                required
                rows="4"
                placeholder="Enter rejection reason (e.g. Document image is unclear / Government ID number mismatch)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div className="verif-modal-actions">
                <button className="verif-btn secondary" type="button" onClick={() => setRejectModal(null)}>
                  Cancel
                </button>
                <button className="verif-btn reject" type="submit">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Suspend Reason Popup Modal ── */}
      {suspendModal && (
        <div className="verif-modal-overlay">
          <div className="verif-modal-card" style={{ maxWidth: "450px" }}>
            <div className="verif-modal-header">
              <h2>Suspend Verification Badge</h2>
              <button className="btn-icon" onClick={() => setSuspendModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSuspendSubmit}>
              <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: 0 }}>
                Specify reason for suspending orange tick for <strong>{suspendModal.fullName || "user"}</strong>:
              </p>
              <textarea
                required
                rows="4"
                placeholder="Enter suspension reason (e.g. Impersonation complaint under investigation)..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div className="verif-modal-actions">
                <button className="verif-btn secondary" type="button" onClick={() => setSuspendModal(null)}>
                  Cancel
                </button>
                <button className="verif-btn suspend" type="submit">
                  Confirm Suspension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approve Redeem Modal ── */}
      {approveRedeemModal && (
        <div className="verif-modal-overlay">
          <div className="verif-modal-card" style={{ maxWidth: "480px" }}>
            <div className="verif-modal-header">
              <h2>Approve Coins Redeem Request</h2>
              <button className="btn-icon" onClick={() => setApproveRedeemModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApproveRedeemSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", padding: "12px", borderRadius: "10px", color: "#fcd34d", fontSize: "0.85rem" }}>
                <div><strong>Creator:</strong> {approveRedeemModal.creatorId?.name} ({approveRedeemModal.creatorId?.username})</div>
                <div><strong>Coins Requested:</strong> {approveRedeemModal.points} Coins</div>
                <div style={{ marginTop: "6px", color: "#cbd5e1" }}>
                  {approveRedeemModal.paymentDetails?.paymentMethod === "BANK_TRANSFER" ? (
                    <div>
                      <div><strong>🏦 Bank Transfer Details:</strong></div>
                      <div>Holder: {approveRedeemModal.paymentDetails.accountHolderName}</div>
                      <div>Acc: {approveRedeemModal.paymentDetails.accountNumber} | IFSC: {approveRedeemModal.paymentDetails.ifscCode}</div>
                    </div>
                  ) : (
                    <div><strong>⚡ UPI ID / Phone:</strong> <span style={{ color: "#38bdf8" }}>{approveRedeemModal.paymentDetails?.upiId || "N/A"}</span></div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 600 }}>
                  Enter Calculated Rupee Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={approveRupeesInput}
                  onChange={(e) => setApproveRupeesInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#10b981",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g. 50"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 600 }}>
                  Admin Remark / Payout Ref (Optional)
                </label>
                <input
                  type="text"
                  value={approveAdminRemark}
                  onChange={(e) => setApproveAdminRemark(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g. Paid via UPI Txn #123456"
                />
              </div>

              <div className="verif-modal-actions">
                <button className="verif-btn secondary" type="button" onClick={() => setApproveRedeemModal(null)}>
                  Cancel
                </button>
                <button className="verif-btn approve" type="submit">
                  <Check size={16} /> Confirm Payout Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Redeem Modal ── */}
      {rejectRedeemModal && (
        <div className="verif-modal-overlay">
          <div className="verif-modal-card" style={{ maxWidth: "450px" }}>
            <div className="verif-modal-header">
              <h2>Reject Coins Redeem Request</h2>
              <button className="btn-icon" onClick={() => setRejectRedeemModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRejectRedeemSubmit}>
              <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: 0 }}>
                Rejecting request for <strong>{rejectRedeemModal.points} coins</strong> submitted by <strong>{rejectRedeemModal.creatorId?.name}</strong>. Coins will be refunded to creator.
              </p>
              <textarea
                required
                rows="4"
                placeholder="Enter rejection reason (e.g. Invalid bank account details / suspected view manipulation)..."
                value={rejectRedeemReason}
                onChange={(e) => setRejectRedeemReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div className="verif-modal-actions">
                <button className="verif-btn secondary" type="button" onClick={() => setRejectRedeemModal(null)}>
                  Cancel
                </button>
                <button className="verif-btn reject" type="submit">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Image Preview Zoom Modal ── */}
      {imagePreview && (
        <div className="verif-modal-overlay" onClick={() => setImagePreview(null)}>
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <a
                href={imagePreview}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#38bdf8",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: "rgba(15,23,42,0.8)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Open Original File <ExternalLink size={14} />
              </a>
              <button
                className="btn-icon"
                onClick={() => setImagePreview(null)}
                title="Close Lightbox"
                style={{ background: "#dc2626", color: "#fff" }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={imagePreview}
              alt="Enlarged document"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "14px",
                objectFit: "contain",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
