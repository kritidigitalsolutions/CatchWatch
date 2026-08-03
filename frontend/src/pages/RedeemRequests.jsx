import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Search,
  UserCheck,
} from "lucide-react";
import "./AdManagement.css";

export default function RedeemRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | PENDING | APPROVED | REJECTED
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Approve Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [adminRemark, setAdminRemark] = useState("");

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [copiedText, setCopiedText] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/admin/redeem?status=${activeTab}&page=${page}&limit=15`
      );
      if (res.data?.success) {
        setRequests(res.data.requests || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch Admin Redeem Requests Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, page]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const openApproveModal = (req) => {
    setSelectedReq(req);
    // Default conversion: 10 coins = ₹1 (or custom formula)
    const suggested = req.points ? Math.round(req.points * 0.1) : 0;
    setPayoutAmount(suggested);
    setTransactionId("");
    setAdminRemark("Approved & Payout Processed");
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      const res = await API.put(`/admin/redeem/${selectedReq._id}/approve`, {
        amount: Number(payoutAmount),
        transactionId: transactionId.trim(),
        adminRemark: adminRemark.trim(),
      });
      if (res.data?.success) {
        alert("Redeem Request APPROVED successfully!");
        setShowApproveModal(false);
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve redeem request");
    }
  };

  const openRejectModal = (req) => {
    setSelectedReq(req);
    setRejectionReason("Payment details invalid or verification requirements not met.");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      const res = await API.put(`/admin/redeem/${selectedReq._id}/reject`, {
        reason: rejectionReason.trim(),
        adminRemark: rejectionReason.trim(),
      });
      if (res.data?.success) {
        alert("Redeem Request REJECTED & Coins refunded to creator!");
        setShowRejectModal(false);
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject redeem request");
    }
  };

  // Stats calculation
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const totalApprovedAmount = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const name = r.creatorId?.name || "";
    const phone = r.creatorId?.phone || "";
    const upi = r.paymentDetails?.upiId || "";
    const acc = r.paymentDetails?.accountNumber || "";
    const term = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term) ||
      upi.toLowerCase().includes(term) ||
      acc.toLowerCase().includes(term)
    );
  });

  return (
    <div className="ad-management-container" style={{ padding: "28px", color: "#f8fafc" }}>
      {/* Page Title */}
      <div className="ad-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
            <DollarSign size={28} color="#f59e0b" /> Creator Coins Redeem Requests
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "4px" }}>
            Review creator coin cashout requests, copy payment account details, calculate conversion rupees & approve payouts
          </p>
        </div>
      </div>      {/* Metrics Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <div className="ad-metric-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid rgba(255,255,255,0.08)", padding: "22px", borderRadius: "16px", flex: 1 }}>
          <div className="card-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "12px", borderRadius: "12px", display: "inline-block", marginBottom: "8px" }}>
            <Clock size={22} />
          </div>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Pending Requests</div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#fff", marginTop: "4px" }}>{pendingCount}</div>
        </div>

        <div className="ad-metric-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid rgba(255,255,255,0.08)", padding: "22px", borderRadius: "16px", flex: 1 }}>
          <div className="card-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "12px", borderRadius: "12px", display: "inline-block", marginBottom: "8px" }}>
            <CheckCircle2 size={22} />
          </div>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Approved Requests</div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#fff", marginTop: "4px" }}>{approvedCount}</div>
        </div>

        <div className="ad-metric-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "1px solid rgba(255,255,255,0.08)", padding: "22px", borderRadius: "16px", flex: 1 }}>
          <div className="card-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", padding: "12px", borderRadius: "12px", display: "inline-block", marginBottom: "8px" }}>
            <DollarSign size={22} />
          </div>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Total Paid Amount (₹)</div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>₹{totalApprovedAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.85rem",
                border: "none",
                cursor: "pointer",
                background: activeTab === tab ? "#f59e0b" : "#1e293b",
                color: "#fff",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Search creator, phone, UPI..."
            style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: "10px", background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: "0.85rem" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.05)", color: "#94a3b8" }}>
              <th style={{ padding: "16px 20px" }}>Creator Details</th>
              <th style={{ padding: "16px 20px" }}>Requested Coins</th>
              <th style={{ padding: "16px 20px" }}>Payment Account Details</th>
              <th style={{ padding: "16px 20px" }}>Calculated Payout</th>
              <th style={{ padding: "16px 20px" }}>Status</th>
              <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Loading redeem requests...
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  No redeem requests found in {activeTab} view.
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => {
                const creator = r.creatorId || {};
                const details = r.paymentDetails || {};
                return (
                  <tr key={r._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    {/* Creator */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                          src={creator.profileImage || "/default-avatar.png"}
                          alt="Avatar"
                          style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f59e0b" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2364748b'/%3E%3Cpath d='M20 82 C20 62 35 55 50 55 C65 55 80 62 80 82 Z' fill='%2364748b'/%3E%3C/svg%3E";
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                            {creator.name || "Creator"}
                            {creator.isVerified && <UserCheck size={14} color="#3b82f6" title="Verified Creator" />}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {creator.phone || creator.email || "@creator"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Coins */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: "1rem" }}>
                        {(r.points || 0).toLocaleString()} Coins
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </td>

                    {/* Account Details */}
                    <td style={{ padding: "16px 20px" }}>
                      {details.paymentMethod === "UPI" ? (
                        <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)", display: "inline-block" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: 700 }}>UPI METHOD</div>
                          <div style={{ fontWeight: 700, color: "#fff", marginTop: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
                            {details.upiId || "N/A"}
                            {details.upiId && (
                              <button
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                onClick={() => handleCopy(details.upiId, `upi_${r._id}`)}
                                title="Copy UPI ID"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                          {copiedText === `upi_${r._id}` && <span style={{ fontSize: "0.68rem", color: "#10b981" }}>Copied!</span>}
                        </div>
                      ) : (
                        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", display: "inline-block" }}>
                          <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>BANK TRANSFER</div>
                          <div style={{ fontWeight: 700, color: "#fff", marginTop: "2px" }}>
                            {details.accountHolderName || "Holder Name"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                            Acc: {details.accountNumber} | IFSC: {details.ifscCode}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "16px 20px", fontWeight: 800, color: r.status === "APPROVED" ? "#10b981" : "#cbd5e1" }}>
                      {r.status === "APPROVED" ? `₹${r.amount?.toLocaleString()}` : `Est. ₹${Math.round((r.points || 0) * 0.1)}`}
                      {r.transactionId && (
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                          Ref: {r.transactionId}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background:
                            r.status === "APPROVED"
                              ? "rgba(16, 185, 129, 0.2)"
                              : r.status === "REJECTED"
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(245, 158, 11, 0.2)",
                          color:
                            r.status === "APPROVED"
                              ? "#10b981"
                              : r.status === "REJECTED"
                              ? "#ef4444"
                              : "#f59e0b",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      {r.status === "PENDING" ? (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => openApproveModal(r)}
                            style={{ padding: "6px 14px", borderRadius: "8px", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: "0.78rem", border: "none", cursor: "pointer" }}
                          >
                            Pay & Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(r)}
                            style={{ padding: "6px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 700, fontSize: "0.78rem", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* APPROVE PAYOUT MODAL */}
      {showApproveModal && selectedReq && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#1e293b", width: "100%", maxWidth: "520px", borderRadius: "20px", padding: "28px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "6px", color: "#fff" }}>
              Approve Payout & Process Payment
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "20px" }}>
              Creator requested cashout for <strong style={{ color: "#f59e0b" }}>{selectedReq.points} Coins</strong>
            </p>

            {/* Payment Details Box */}
            <div style={{ background: "#0f172a", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, marginBottom: "8px" }}>
                Target Payment Account Info ({selectedReq.paymentDetails?.paymentMethod})
              </div>

              {selectedReq.paymentDetails?.paymentMethod === "UPI" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>UPI Address / Phone:</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#3b82f6" }}>{selectedReq.paymentDetails?.upiId}</div>
                  </div>
                  <button
                    type="button"
                    style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => handleCopy(selectedReq.paymentDetails?.upiId, "modal_upi")}
                  >
                    <Copy size={14} /> {copiedText === "modal_upi" ? "Copied!" : "Copy UPI"}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{selectedReq.paymentDetails?.accountHolderName}</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Bank: {selectedReq.paymentDetails?.bankName} | Acc: <strong>{selectedReq.paymentDetails?.accountNumber}</strong> | IFSC: <strong>{selectedReq.paymentDetails?.ifscCode}</strong>
                  </div>
                  <button
                    type="button"
                    style={{ marginTop: "10px", background: "#10b981", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => handleCopy(`Name: ${selectedReq.paymentDetails?.accountHolderName}, Bank: ${selectedReq.paymentDetails?.bankName}, Acc: ${selectedReq.paymentDetails?.accountNumber}, IFSC: ${selectedReq.paymentDetails?.ifscCode}`, "modal_bank")}
                  >
                    <Copy size={14} /> {copiedText === "modal_bank" ? "Copied!" : "Copy Bank Details"}
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleApproveSubmit}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600, marginBottom: "6px" }}>
                  Converted Rupee Payout Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#10b981", fontWeight: 800, fontSize: "1.1rem" }}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600, marginBottom: "6px" }}>
                  Transaction / UTR Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or UPI987654"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.88rem" }}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600, marginBottom: "6px" }}>
                  Admin Remark / Note to Creator
                </label>
                <input
                  type="text"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.88rem" }}
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  style={{ padding: "10px 18px", borderRadius: "10px", background: "#334155", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "10px 22px", borderRadius: "10px", background: "#10b981", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}
                >
                  Confirm Payout Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedReq && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#1e293b", width: "100%", maxWidth: "480px", borderRadius: "20px", padding: "28px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "6px", color: "#ef4444" }}>
              Reject Redeem Request
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "16px" }}>
              Coins ({selectedReq.points}) will be refunded back to the creator's wallet.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 600, marginBottom: "6px" }}>
                  Rejection Reason (Visible to Creator)
                </label>
                <textarea
                  required
                  rows="3"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.88rem" }}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  style={{ padding: "10px 18px", borderRadius: "10px", background: "#334155", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "10px 22px", borderRadius: "10px", background: "#ef4444", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}
                >
                  Reject & Refund Coins
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
