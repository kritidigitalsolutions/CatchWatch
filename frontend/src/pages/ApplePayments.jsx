import { useState, useEffect } from "react";
import API from "../api/axios";
import {
  Apple,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Calendar,
  Eye,
  X,
  Zap,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  User,
  Smartphone,
  BadgeCheck,
} from "lucide-react";
import "./ApplePayments.css";

export default function ApplePayments() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    orangeTickCount: 0,
    subscriptionCount: 0,
    sandboxCount: 0,
    productionCount: 0,
    isConfigured: false,
  });
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [envFilter, setEnvFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Single Verifier Tool State
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState("");

  // Inspect Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [categoryFilter, envFilter, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/apple-payments/all", {
        params: {
          search,
          category: categoryFilter,
          environment: envFilter,
          status: statusFilter,
        },
      });

      if (res.data?.success) {
        setStats(res.data.stats || {});
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load Apple payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleVerifySingle = async (txIdOverride) => {
    const target = txIdOverride || verifyInput.trim();
    if (!target) return;

    setVerifying(true);
    setVerificationError("");
    setVerificationResult(null);

    try {
      const isJws = target.split(".").length === 3;
      const payload = isJws
        ? { signedPayload: target }
        : { transactionId: target };

      const res = await API.post("/admin/apple-payments/verify-single", payload);
      if (res.data?.success) {
        setVerificationResult(res.data);
      } else {
        setVerificationError(res.data?.message || "Verification failed");
      }
    } catch (err) {
      setVerificationError(
        err.response?.data?.message ||
          "Failed to verify Apple transaction. Please verify ID or JWS format."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="apple-pay-page">
      {/* ── Top Header ── */}
      <div className="apple-pay-header">
        <div className="apple-pay-title-box">
          <div className="apple-logo-badge">
            <Apple size={28} />
          </div>
          <div>
            <h1>Apple In-App Payments & StoreKit 2</h1>
            <p className="apple-subtitle">
              Real-time Apple App Store In-App Purchases, cryptographic StoreKit 2 validation, Orange Tick subscriptions, and revenue tracking.
            </p>
          </div>
        </div>

        <div className="apple-header-actions">
          <div className={`storekit-status-pill ${stats.isConfigured ? "configured" : "active"}`}>
            <span className="pulsing-dot" />
            {stats.isConfigured
              ? "App Store Connect API Connected"
              : "StoreKit 2 Cryptographic Validation Active"}
          </div>

          <button
            className="apple-refresh-btn"
            onClick={fetchPayments}
            disabled={loading}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Metric Stat Cards ── */}
      <div className="apple-stats-grid">
        <div className="apple-stat-card card-total">
          <div className="stat-icon-wrap icon-apple">
            <Apple size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Apple Transactions</span>
            <span className="stat-value">{stats.totalTransactions || 0}</span>
            <span className="stat-sub">
              {stats.productionCount || 0} Prod · {stats.sandboxCount || 0} Sandbox
            </span>
          </div>
        </div>

        <div className="apple-stat-card card-revenue">
          <div className="stat-icon-wrap icon-revenue">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Apple Revenue</span>
            <span className="stat-value">₹{(stats.totalRevenue || 0).toLocaleString()}</span>
            <span className="stat-sub">INR gross proceeds</span>
          </div>
        </div>

        <div className="apple-stat-card card-orangetick">
          <div className="stat-icon-wrap icon-orangetick">
            <BadgeCheck size={24} color="#f97316" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Orange Tick In-App Purchases</span>
            <span className="stat-value">{stats.orangeTickCount || 0}</span>
            <span className="stat-sub">Profile verification badges</span>
          </div>
        </div>

        <div className="apple-stat-card card-sub">
          <div className="stat-icon-wrap icon-sub">
            <Layers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Streaming Subscriptions</span>
            <span className="stat-value">{stats.subscriptionCount || 0}</span>
            <span className="stat-sub">VIP video access passes</span>
          </div>
        </div>
      </div>

      {/* ── Interactive StoreKit 2 Verifier Tool ── */}
      <div className="apple-verifier-box">
        <div className="verifier-header">
          <div className="verifier-title">
            <ShieldCheck size={22} className="shield-icon" />
            <div>
              <h3>Test & Verify Apple Transaction (StoreKit 2)</h3>
              <p>
                Enter any Apple Transaction ID, Original Transaction ID, or paste a raw StoreKit 2 JWS token to test live Apple verification.
              </p>
            </div>
          </div>
        </div>

        <div className="verifier-input-row">
          <div className="verifier-input-wrap">
            <input
              type="text"
              placeholder="e.g. 2000000858192039 or paste signed StoreKit 2 JWS token..."
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifySingle()}
            />
          </div>
          <button
            className="btn-verify-now"
            onClick={() => handleVerifySingle()}
            disabled={verifying || !verifyInput.trim()}
          >
            {verifying ? (
              <>
                <RefreshCw size={16} className="spin" /> Verifying...
              </>
            ) : (
              <>
                <Zap size={16} /> Verify with Apple
              </>
            )}
          </button>
        </div>

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="verifier-result-card success">
            <div className="result-header">
              <div className="result-title">
                <CheckCircle2 size={20} color="#10b981" />
                <span>Apple StoreKit 2 Cryptographic Verification: VALIDATED</span>
              </div>
              <span className={`env-tag ${verificationResult.environment?.toLowerCase()}`}>
                {verificationResult.environment || "Production"}
              </span>
            </div>

            <p className="result-msg">{verificationResult.message}</p>

            <div className="result-details-grid">
              <div className="result-item">
                <span className="item-label">StoreKit Protocol</span>
                <span className="item-val">{verificationResult.storeKitVersion || "StoreKit 2"}</span>
              </div>
              <div className="result-item">
                <span className="item-label">Cryptographic Algorithm</span>
                <span className="item-val">{verificationResult.cryptographicAlgorithm || "ES256 (Apple Root CA)"}</span>
              </div>
              <div className="result-item">
                <span className="item-label">Apple Product ID</span>
                <span className="item-val highlight">{verificationResult.productId || "—"}</span>
              </div>
              <div className="result-item">
                <span className="item-label">Transaction ID</span>
                <span className="item-val code">
                  {verificationResult.transactionId}
                  <button
                    className="copy-mini-btn"
                    onClick={() => handleCopy(verificationResult.transactionId, "verify-tx")}
                  >
                    {copiedKey === "verify-tx" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </span>
              </div>
              <div className="result-item">
                <span className="item-label">Original Transaction ID</span>
                <span className="item-val code">{verificationResult.originalTransactionId || "—"}</span>
              </div>
              <div className="result-item">
                <span className="item-label">In-App Ownership</span>
                <span className="item-val">{verificationResult.ownershipType || "PURCHASED"}</span>
              </div>
              <div className="result-item">
                <span className="item-label">Purchase Date</span>
                <span className="item-val">
                  {verificationResult.purchaseDate ? new Date(verificationResult.purchaseDate).toLocaleString() : "—"}
                </span>
              </div>
              <div className="result-item">
                <span className="item-label">Database Match</span>
                <span className="item-val">
                  {verificationResult.localRecord ? (
                    <span style={{ color: "#10b981" }}>
                      Matched User: {verificationResult.localRecord.user?.name || "Registered User"} (
                      {verificationResult.localRecord.user?.username || "@user"})
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Stand-alone Apple receipt</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {verificationError && (
          <div className="verifier-result-card error">
            <AlertCircle size={20} color="#ef4444" />
            <span>{verificationError}</span>
          </div>
        )}
      </div>

      {/* ── Filters & Search ── */}
      <div className="apple-table-controls">
        <form className="apple-search-form" onSubmit={handleSearchSubmit}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Transaction ID, Product ID, User name, @username, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search-submit">
            Search
          </button>
        </form>

        <div className="apple-filter-group">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="ORANGETICK">Orange Tick In-App</option>
            <option value="SUBSCRIPTION">Streaming VIP Subscriptions</option>
          </select>

          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
          >
            <option value="ALL">All Environments</option>
            <option value="PRODUCTION">Production</option>
            <option value="SANDBOX">Sandbox</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      <div className="apple-table-card">
        <div className="table-header-title">
          <h3>Apple StoreKit Transactions ({transactions.length})</h3>
        </div>

        <div className="apple-table-responsive">
          <table className="apple-table">
            <thead>
              <tr>
                <th>User / Applicant</th>
                <th>Category / Plan</th>
                <th>Apple Product ID</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Environment</th>
                <th>Purchase Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="table-loading">
                    <RefreshCw size={24} className="spin" />
                    <p>Loading Apple In-App Payments...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="table-empty">
                    <Apple size={36} color="#64748b" />
                    <h4>No Apple Transactions Found</h4>
                    <p>
                      Transactions made by users through Apple In-App Purchase (StoreKit 2) will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const user = tx.user;
                  return (
                    <tr key={tx._id || tx.transactionId}>
                      {/* User Cell */}
                      <td>
                        <div className="user-cell">
                          <img
                            src={user?.profileImage || "/avatar-placeholder.png"}
                            alt={user?.name || "User"}
                            className="user-avatar"
                            onError={(e) => (e.target.src = "/avatar-placeholder.png")}
                          />
                          <div>
                            <div className="user-name">
                              {user?.name || "Unknown User"}
                              {tx.isOrangeTick && (
                                <BadgeCheck size={14} color="#f97316" style={{ marginLeft: "4px" }} />
                              )}
                            </div>
                            <div className="user-username">
                              {user?.username || (user?.phone ? `+${user.phone}` : "No username")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category / Plan */}
                      <td>
                        {tx.isOrangeTick ? (
                          <span className="badge-category orange-tick">
                            <BadgeCheck size={13} color="#f97316" />
                            Orange Tick
                          </span>
                        ) : (
                          <span className="badge-category subscription">
                            <Layers size={13} />
                            VIP Subscription
                          </span>
                        )}
                        <div className="plan-name-sub">
                          {tx.plan?.name || "Standard In-App"}
                        </div>
                      </td>

                      {/* Apple Product ID */}
                      <td>
                        <span className="code-product-id">
                          {tx.appleProductId}
                        </span>
                      </td>

                      {/* Transaction ID */}
                      <td>
                        <div className="tx-id-cell">
                          <span className="code-tx-id">{tx.transactionId}</span>
                          <button
                            className="copy-mini-btn"
                            title="Copy Transaction ID"
                            onClick={() => handleCopy(tx.transactionId, `table-${tx.transactionId}`)}
                          >
                            {copiedKey === `table-${tx.transactionId}` ? (
                              <Check size={12} color="#10b981" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {tx.originalTransactionId && tx.originalTransactionId !== "—" && (
                          <div className="orig-tx-sub">
                            Orig: {tx.originalTransactionId}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td>
                        <span className="amount-val">
                          ₹{Number(tx.amount || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Environment */}
                      <td>
                        <span className={`env-badge ${tx.environment?.toLowerCase()}`}>
                          {tx.environment === "Sandbox" ? "🧪 Sandbox" : "🟢 Production"}
                        </span>
                      </td>

                      {/* Purchase Date */}
                      <td>
                        <span className="date-cell">
                          {tx.purchaseDate
                            ? new Date(tx.purchaseDate).toLocaleDateString()
                            : "—"}
                        </span>
                        <div className="time-sub">
                          {tx.purchaseDate
                            ? new Date(tx.purchaseDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill ${tx.status?.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn-action-icon"
                            title="Inspect Details"
                            onClick={() => setSelectedTx(tx)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn-action-icon verify"
                            title="Verify StoreKit 2 Signature"
                            onClick={() => {
                              setVerifyInput(tx.transactionId);
                              handleVerifySingle(tx.transactionId);
                              window.scrollTo({ top: 180, behavior: "smooth" });
                            }}
                          >
                            <ShieldCheck size={15} />
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
      </div>

      {/* ── Detailed Transaction Inspector Modal ── */}
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="inspect-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inspect-modal-header">
              <div className="header-left">
                <div className="modal-apple-badge">
                  <Apple size={24} />
                </div>
                <div>
                  <h2>Apple In-App Transaction Details</h2>
                  <p className="modal-sub">
                    StoreKit 2 verified transaction record & linked user account.
                  </p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedTx(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="inspect-modal-body">
              {/* User Section */}
              <div className="inspect-section">
                <h4>User Account</h4>
                <div className="inspect-user-row">
                  <img
                    src={selectedTx.user?.profileImage || "/avatar-placeholder.png"}
                    alt="User"
                    className="modal-avatar"
                  />
                  <div>
                    <h3 className="modal-user-name">
                      {selectedTx.user?.name || "Guest User"}
                      {selectedTx.isOrangeTick && <BadgeCheck size={18} color="#f97316" />}
                    </h3>
                    <div className="modal-user-meta">
                      <span>{selectedTx.user?.username || "—"}</span>
                      {selectedTx.user?.phone && <span>· +{selectedTx.user.phone}</span>}
                      {selectedTx.user?.email && <span>· {selectedTx.user.email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Apple StoreKit Details Grid */}
              <div className="inspect-section">
                <h4>Apple StoreKit 2 Details</h4>
                <div className="inspect-grid">
                  <div className="grid-field">
                    <span className="field-label">Transaction ID</span>
                    <span className="field-val code">
                      {selectedTx.transactionId}
                      <button
                        className="copy-mini-btn"
                        onClick={() => handleCopy(selectedTx.transactionId, "inspect-tx")}
                      >
                        {copiedKey === "inspect-tx" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Original Transaction ID</span>
                    <span className="field-val code">
                      {selectedTx.originalTransactionId || "—"}
                      <button
                        className="copy-mini-btn"
                        onClick={() => handleCopy(selectedTx.originalTransactionId, "inspect-orig")}
                      >
                        {copiedKey === "inspect-orig" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Apple Product ID</span>
                    <span className="field-val highlight">
                      {selectedTx.appleProductId}
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Environment</span>
                    <span className="field-val">
                      <span className={`env-badge ${selectedTx.environment?.toLowerCase()}`}>
                        {selectedTx.environment === "Sandbox" ? "🧪 Sandbox" : "🟢 Production"}
                      </span>
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Amount Paid</span>
                    <span className="field-val amount">
                      ₹{selectedTx.amount} {selectedTx.currency || "INR"}
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Category</span>
                    <span className="field-val">
                      {selectedTx.isOrangeTick ? "🟠 Orange Tick Verification" : "🟣 Streaming VIP"}
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Purchase Timestamp</span>
                    <span className="field-val">
                      {selectedTx.purchaseDate
                        ? new Date(selectedTx.purchaseDate).toLocaleString()
                        : "—"}
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Expiry Timestamp</span>
                    <span className="field-val">
                      {selectedTx.expiresDate
                        ? new Date(selectedTx.expiresDate).toLocaleString()
                        : "Auto-renew / Lifetime"}
                    </span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Payment Gateway</span>
                    <span className="field-val">Apple StoreKit (In-App Purchase)</span>
                  </div>

                  <div className="grid-field">
                    <span className="field-label">Record Status</span>
                    <span className="field-val status-badge active">{selectedTx.status}</span>
                  </div>
                </div>
              </div>

              {/* Actions in modal */}
              <div className="inspect-actions">
                <button
                  className="btn-inspect-verify"
                  onClick={() => {
                    setVerifyInput(selectedTx.transactionId);
                    handleVerifySingle(selectedTx.transactionId);
                    setSelectedTx(null);
                    window.scrollTo({ top: 180, behavior: "smooth" });
                  }}
                >
                  <ShieldCheck size={16} /> Run StoreKit 2 Verifier on this Transaction
                </button>
                <button className="btn-inspect-close" onClick={() => setSelectedTx(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
