import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Eye,
  X,
  BadgeCheck,
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState("SUBSCRIPTION"); // 'SUBSCRIPTION' | 'ORANGETICK'

  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    features: "",
    planType: "monthly",
    appleProductId: "",
    sortOrder: 0,
    isRecommended: false,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [isAppleApiConfigured, setIsAppleApiConfigured] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);

  // Apple IAP Scan in Form state
  const [scanningApple, setScanningApple] = useState(false);
  const [formAppleScan, setFormAppleScan] = useState(null);

  // Apple Pricing Management Modal state
  const [appleModalPlan, setAppleModalPlan] = useState(null);
  const [appleModalScan, setAppleModalScan] = useState(null);
  const [appleModalLoading, setAppleModalLoading] = useState(false);
  const [selectedPricePoint, setSelectedPricePoint] = useState("");
  const [selectedNewPrice, setSelectedNewPrice] = useState("");
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [preserveExisting, setPreserveExisting] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  // =========================
  // 🧠 INPUT CHANGE
  // =========================
  const ch = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  // =========================
  // 📥 FETCH PLANS
  // =========================
  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plan", {
        params: { category: activeTab },
      });
      setPlans(res.data.plans || []);
      setIsAppleApiConfigured(!!res.data.isAppleApiConfigured);
    } catch (err) {
      console.error(err);
      setPlans([]);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [activeTab]);

  // Reset form on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditId(null);
    setFormAppleScan(null);
    setForm({
      name: "",
      price: "",
      duration: "",
      features: "",
      planType: "monthly",
      appleProductId: "",
      sortOrder: 0,
      isRecommended: false,
      isActive: true,
    });
  };

  // ==========================================
  // 🔍 SCAN APPLE IAP IN FORM (CREATE/EDIT)
  // ==========================================
  const handleScanAppleInForm = async () => {
    const pId = (form.appleProductId || "").trim();
    if (!pId) {
      alert("Please enter an Apple Product ID first (e.g. com.app.catchWatch.sub.creator.orangetick)");
      return;
    }

    setScanningApple(true);
    try {
      const res = await API.post("/admin/plan/apple/scan", {
        productId: pId,
        planId: editId || undefined,
      });

      if (res.data?.success && res.data.scanResult) {
        setFormAppleScan(res.data.scanResult);
      } else {
        alert(res.data?.message || "Failed to scan Apple Product.");
      }
    } catch (err) {
      console.error("Apple Scan Error:", err);
      alert(err.response?.data?.message || "Failed to scan Apple Product ID.");
    } finally {
      setScanningApple(false);
    }
  };

  // Auto-fill form price from scanned Apple live price
  const handleApplyScannedPrice = () => {
    if (formAppleScan && formAppleScan.currentPrice) {
      setForm({ ...form, price: formAppleScan.currentPrice });
    }
  };

  // =========================
  // ➕ CREATE / ✏️ UPDATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        planType: form.planType,
        appleProductId: (form.appleProductId || "").trim(),
        appleSubscriptionId: formAppleScan?.appleSubscriptionId || undefined,
        appleCurrentPrice: formAppleScan?.currentPrice ? Number(formAppleScan.currentPrice) : undefined,
        sortOrder: Number(form.sortOrder),
        isRecommended: form.isRecommended,
        isActive: form.isActive,
        category: activeTab,
      };

      if (editId) {
        await API.patch(`/admin/plan/${editId}`, payload);
        alert("Plan updated successfully.");
      } else {
        await API.post("/admin/plan", payload);
        alert("Plan created successfully.");
      }

      setForm({
        name: "",
        price: "",
        duration: "",
        features: "",
        planType: "monthly",
        appleProductId: "",
        sortOrder: 0,
        isRecommended: false,
        isActive: true,
      });

      setEditId(null);
      setFormAppleScan(null);
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "An error occurred. Please try again.");
    }

    setLoading(false);
  };

  // =========================
  // ❌ DELETE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await API.delete(`/admin/plan/${id}`);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // ✏️ EDIT
  // =========================
  const handleEdit = (plan) => {
    setForm({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features ? plan.features.join(", ") : "",
      planType: plan.planType || "monthly",
      appleProductId: plan.appleProductId || "",
      sortOrder: plan.sortOrder || 0,
      isRecommended: plan.isRecommended || false,
      isActive: plan.isActive !== false,
    });
    setEditId(plan._id);
    setFormAppleScan(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==========================================
  // 🍎 OPEN APPLE PRICING MODAL
  // ==========================================
  const handleOpenAppleModal = async (plan) => {
    setAppleModalPlan(plan);
    setAppleModalScan(null);
    setSelectedPricePoint("");
    setSelectedNewPrice("");
    setScheduleStartDate("");
    setPreserveExisting(true);
    setAppleModalLoading(true);

    if (plan.appleProductId) {
      try {
        const res = await API.post("/admin/plan/apple/scan", {
          productId: plan.appleProductId,
          planId: plan._id,
        });

        if (res.data?.success && res.data.scanResult) {
          setAppleModalScan(res.data.scanResult);
          // Default selection to next higher price point if available
          const points = res.data.scanResult.pricePoints || [];
          if (points.length > 0) {
            const currentP = res.data.scanResult.currentPrice || plan.price;
            const nextPoint = points.find((p) => Number(p.customerPrice) > currentP) || points[0];
            setSelectedPricePoint(nextPoint.id);
            setSelectedNewPrice(nextPoint.customerPrice);
          }
        }
      } catch (err) {
        console.error("Modal Scan Error:", err);
      }
    }

    setAppleModalLoading(false);
  };

  // 1-Click Sync Backend Price with Apple Live Price
  const handleSyncPriceFromApple = async (planId) => {
    try {
      const res = await API.post(`/admin/plan/${planId}/sync-price-from-apple`);
      alert(res.data?.message || "Plan price successfully synchronized with Apple live price!");
      fetchPlans();
      if (appleModalPlan && appleModalPlan._id === planId) {
        setAppleModalPlan(res.data.plan);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to sync price from Apple.");
    }
  };

  // Submit Schedule Price Change to Apple API
  const handleScheduleApplePrice = async (e) => {
    e.preventDefault();
    if (!appleModalPlan) return;

    if (!selectedPricePoint || !selectedNewPrice) {
      alert("Please select a target Apple Price Point.");
      return;
    }

    const confirmMsg = `Are you sure you want to schedule price change on Apple for '${appleModalPlan.name}' to ₹${selectedNewPrice}/month (Effective: ${scheduleStartDate || "Immediate"})?`;
    if (!window.confirm(confirmMsg)) return;

    setIsScheduling(true);
    try {
      const res = await API.post(`/admin/plan/${appleModalPlan._id}/apple-price/schedule`, {
        pricePointId: selectedPricePoint,
        customerPrice: selectedNewPrice,
        startDate: scheduleStartDate || null,
        preserveCurrentSubscribers: preserveExisting,
      });

      alert(res.data?.message || "Price change scheduled successfully on Apple App Store Connect!");
      setAppleModalPlan(res.data.plan);
      fetchPlans();
    } catch (err) {
      console.error("Schedule error:", err);
      alert(err.response?.data?.message || "Failed to schedule price change on Apple.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Cancel Scheduled Price Change
  const handleCancelScheduledPrice = async (planId) => {
    if (!window.confirm("Cancel this scheduled price change on Apple App Store Connect?")) return;

    try {
      const res = await API.delete(`/admin/plan/${planId}/apple-price/cancel`);
      alert(res.data?.message || "Scheduled price change cancelled.");
      setAppleModalPlan(res.data.plan);
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to cancel scheduled price change.");
    }
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">💳 Subscription & Verification Plans</h1>
        <p className="pg-sub">
          Manage user subscriptions, Creator Orange Tick verification badges, and Apple In-App Purchase pricing.
        </p>
      </div>

      {/* ── Category Sub-page / Tab Switcher ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => handleTabChange("SUBSCRIPTION")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "SUBSCRIPTION" ? "#ec4899" : "rgba(255,255,255,0.05)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.95rem",
          }}
        >
          <CreditCard size={18} /> Standard Subscription Plans
        </button>

        <button
          onClick={() => handleTabChange("ORANGETICK")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "ORANGETICK" ? "#f97316" : "rgba(255,255,255,0.05)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.95rem",
          }}
        >
          <BadgeCheck size={18} color={activeTab === "ORANGETICK" ? "#fff" : "#f97316"} /> Orange Tick & Verification Plans
        </button>
      </div>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h3>
              {editId
                ? `Edit ${activeTab === "ORANGETICK" ? "Orange Tick" : "Subscription"} Plan`
                : `Create New ${activeTab === "ORANGETICK" ? "Orange Tick Verification" : "Subscription"} Plan`}
            </h3>

            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setFormAppleScan(null);
                  setForm({
                    name: "",
                    price: "",
                    duration: "",
                    features: "",
                    planType: "monthly",
                    appleProductId: "",
                    sortOrder: 0,
                    isRecommended: false,
                    isActive: true,
                  });
                }}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="form-2col">
            <input
              className="form-input-styled"
              name="name"
              placeholder={
                activeTab === "ORANGETICK"
                  ? "Plan Name (e.g. Monthly Orange Tick, ₹299 Creator Badge)"
                  : "Plan Name (e.g. Basic, VIP Premium)"
              }
              value={form.name}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled"
              name="price"
              type="number"
              placeholder="Backend Price (₹)"
              value={form.price}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled"
              name="duration"
              type="number"
              placeholder="Validity Duration in Days (e.g. 30, 90, 365)"
              value={form.duration}
              onChange={ch}
              required
            />

            <select className="form-input-styled" name="planType" value={form.planType} onChange={ch}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (3 Month)</option>
              <option value="yearly">Yearly</option>
            </select>

            {/* Apple Product ID with Scan & Match Button */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="form-input-styled"
                style={{ flex: 1, minWidth: "260px" }}
                name="appleProductId"
                placeholder={
                  activeTab === "ORANGETICK"
                    ? "Apple Product ID (e.g. com.app.catchWatch.sub.creator.orangetick)"
                    : "Apple Product ID (e.g. com.app.catchWatch.sub.premium.monthly)"
                }
                value={form.appleProductId}
                onChange={ch}
              />

              <button
                type="button"
                onClick={handleScanAppleInForm}
                disabled={scanningApple || !form.appleProductId}
                style={{
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: scanningApple || !form.appleProductId ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: !form.appleProductId ? 0.6 : 1,
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                }}
              >
                {scanningApple ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Scanning Apple...
                  </>
                ) : (
                  <>
                    <Search size={16} /> Scan Apple IAP
                  </>
                )}
              </button>
            </div>

            {/* Scanned Apple IAP Match Box */}
            {formAppleScan && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "rgba(30, 41, 59, 0.7)",
                  border: "1px solid #38bdf8",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={20} color="#38bdf8" />
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                      Apple StoreKit In-App Purchase Match Found
                    </span>
                  </div>

                  <span
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    ID: {formAppleScan.appleSubscriptionId}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Apple Live Price (IND)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#4ade80", marginTop: 2 }}>
                      ₹{formAppleScan.currentPrice}
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Form Price (Current)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: form.price == formAppleScan.currentPrice ? "#4ade80" : "#fbbf24", marginTop: 2 }}>
                      ₹{form.price || 0}
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Match Status</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: 4, color: form.price == formAppleScan.currentPrice ? "#4ade80" : "#fbbf24" }}>
                      {form.price == formAppleScan.currentPrice ? "✅ Perfectly Matched" : "⚠️ Price Mismatch"}
                    </div>
                  </div>
                </div>

                {form.price != formAppleScan.currentPrice && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{ fontSize: "0.85rem", color: "#f87171" }}>
                      Backend price (₹{form.price || 0}) does not match Apple StoreKit customer price (₹{formAppleScan.currentPrice}).
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyScannedPrice}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#22c55e",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      🔄 Auto-fill Form Price to ₹{formAppleScan.currentPrice}
                    </button>
                  </div>
                )}
              </div>
            )}

            <input
              className="form-input-styled form-full"
              name="features"
              placeholder="Features list (comma separated, e.g. Official Orange Tick Badge, Higher Search Priority)"
              value={form.features}
              onChange={ch}
            />

            <input
              className="form-input-styled"
              name="sortOrder"
              type="number"
              placeholder="Sort Order (e.g. 1)"
              value={form.sortOrder}
              onChange={ch}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" name="isRecommended" checked={form.isRecommended} onChange={ch} />
              Recommended / Featured Badge
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={ch} />
              Active (Visible to users)
            </label>
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{
              marginTop: 16,
              background: activeTab === "ORANGETICK" ? "#f97316" : undefined,
            }}
            disabled={loading}
          >
            {loading ? "Processing..." : editId ? "Update Plan" : `Create ${activeTab === "ORANGETICK" ? "Orange Tick" : "Subscription"} Plan`}
          </button>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="content-box" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            {activeTab === "ORANGETICK" ? "✔️ All Orange Tick & Verification Plans" : "💳 All Standard Subscription Plans"}
          </h3>

          <span
            style={{
              fontSize: "0.85rem",
              padding: "6px 12px",
              borderRadius: "20px",
              background: isAppleApiConfigured ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
              color: isAppleApiConfigured ? "#4ade80" : "#facc15",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isAppleApiConfigured ? "#22c55e" : "#eab308",
              }}
            />
            {isAppleApiConfigured ? "Apple App Store Connect API: Connected" : "StoreKit Catalog Mode"}
          </span>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Apple Product ID</th>
                <th>Backend Price</th>
                <th>Apple Live Price</th>
                <th>Pricing Match</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
                    No {activeTab === "ORANGETICK" ? "Orange Tick" : "subscription"} plans created yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                plans.map((p) => {
                  const hasAppleId = !!p.appleProductId;
                  const isPriceMatched = p.appleCurrentPrice && Number(p.price) === Number(p.appleCurrentPrice);
                  const isScheduled = !!p.appleScheduledPrice;

                  return (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>
                        {p.name}{" "}
                        {(p.category === "ORANGETICK" || p.category === "BLUETICK") && (
                          <BadgeCheck size={16} color="#f97316" style={{ verticalAlign: "middle" }} />
                        )}
                      </td>

                      <td style={{ fontSize: "0.85rem", color: hasAppleId ? "#38bdf8" : "#94a3b8", fontFamily: "monospace" }}>
                        {p.appleProductId || "-"}
                      </td>

                      <td style={{ fontWeight: 700 }}>₹{p.price}</td>

                      <td style={{ fontWeight: 700, color: p.appleCurrentPrice ? "#4ade80" : "#94a3b8" }}>
                        {p.appleCurrentPrice ? `₹${p.appleCurrentPrice}` : "-"}
                      </td>

                      <td>
                        {isScheduled ? (
                          <span
                            style={{
                              background: "rgba(249,115,22,0.15)",
                              color: "#f97316",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Clock size={12} /> ₹{p.appleScheduledPrice} ({p.appleScheduledDate || "Immediate"})
                          </span>
                        ) : !hasAppleId ? (
                          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>No Apple ID</span>
                        ) : isPriceMatched ? (
                          <span
                            style={{
                              background: "rgba(34,197,94,0.15)",
                              color: "#4ade80",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            ✓ Matched
                          </span>
                        ) : p.appleCurrentPrice ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                color: "#f87171",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              Mismatch
                            </span>
                            <button
                              onClick={() => handleSyncPriceFromApple(p._id)}
                              title="Sync backend price to match Apple live price"
                              style={{
                                background: "transparent",
                                border: "1px solid #38bdf8",
                                color: "#38bdf8",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                              }}
                            >
                              Sync
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Unverified</span>
                        )}
                      </td>

                      <td>{p.duration} days</td>

                      <td>
                        <span className={p.isActive !== false ? "status active" : "status expired"}>
                          {p.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="actions">
                        {/* Apple IAP Pricing Management Button */}
                        {p.appleProductId && (
                          <button
                            className="icon-btn"
                            style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}
                            onClick={() => handleOpenAppleModal(p)}
                            title="Manage Apple In-App Purchase Price"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}

                        <button className="icon-btn view" onClick={() => setViewPlan(p)} title="View Details">
                          <Eye size={16} />
                        </button>

                        <button className="icon-btn edit" onClick={() => handleEdit(p)} title="Edit Plan">
                          <Pencil size={16} />
                        </button>

                        <button className="icon-btn delete" onClick={() => handleDelete(p._id)} title="Delete Plan">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🍎 APPLE IN-APP PURCHASE PRICING MODAL (STEPS 4 - 8 OF PDF) */}
      {/* ========================================================= */}
      {appleModalPlan && (
        <div className="modal-overlay" onClick={() => setAppleModalPlan(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: "680px", width: "95%", background: "#0f172a", border: "1px solid #1e293b" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  🍎 Manage Apple In-App Purchase Pricing
                </h3>
                <div style={{ fontSize: "0.85rem", color: "#38bdf8", marginTop: 4, fontFamily: "monospace" }}>
                  {appleModalPlan.appleProductId}
                </div>
              </div>

              <button className="modal-close" onClick={() => setAppleModalPlan(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "20px 0" }}>
              {appleModalLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  <RefreshCw size={28} className="spin" style={{ margin: "0 auto 12px" }} />
                  <div>Querying Apple App Store Connect API...</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Notice banner if credentials are simulation vs live */}
                  <div
                    style={{
                      background: isAppleApiConfigured ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                      border: `1px solid ${isAppleApiConfigured ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: isAppleApiConfigured ? "#86efac" : "#fef08a",
                    }}
                  >
                    {isAppleApiConfigured
                      ? "✓ Live Connection to Apple App Store Connect API (ES256 Authenticated)."
                      : "ℹ️ StoreKit Catalog Mode: Live JWT credentials not yet in .env. Price points are loaded from India Tier catalog."}
                  </div>

                  {/* Pricing Overview Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div style={{ background: "rgba(30,41,59,0.8)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Backend Plan Price</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
                        ₹{appleModalPlan.price}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>Razorpay / Web</div>
                    </div>

                    <div style={{ background: "rgba(30,41,59,0.8)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Apple Live Price</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#4ade80", marginTop: 4 }}>
                        ₹{appleModalScan?.currentPrice || appleModalPlan.appleCurrentPrice || "—"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>iOS StoreKit</div>
                    </div>

                    <div style={{ background: "rgba(30,41,59,0.8)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Territory</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: 4 }}>India (IND)</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>INR Currency</div>
                    </div>
                  </div>

                  {/* 1-Click Sync Price button if mismatch */}
                  {appleModalScan?.currentPrice && Number(appleModalPlan.price) !== Number(appleModalScan.currentPrice) && (
                    <div
                      style={{
                        background: "rgba(56, 189, 248, 0.1)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "#e0f2fe" }}>
                        Sync backend plan price (₹{appleModalPlan.price}) to match Apple live customer price (₹{appleModalScan.currentPrice}).
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncPriceFromApple(appleModalPlan._id)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#0284c7",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        🔄 1-Click Sync to ₹{appleModalScan.currentPrice}
                      </button>
                    </div>
                  )}

                  {/* Scheduled Price Changes (Step 8 of PDF) */}
                  {appleModalPlan.appleScheduledPrice && (
                    <div
                      style={{
                        background: "rgba(249, 115, 22, 0.1)",
                        border: "1px solid rgba(249, 115, 22, 0.4)",
                        borderRadius: "10px",
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f97316", fontWeight: 700, fontSize: "0.95rem" }}>
                          <Clock size={16} /> Scheduled Price Change on Apple
                        </div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginTop: 4 }}>
                          ₹{appleModalPlan.appleScheduledPrice} / month
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: 2 }}>
                          Effective Date: {appleModalPlan.appleScheduledDate || "Immediate"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelScheduledPrice(appleModalPlan._id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "6px",
                          border: "1px solid #ef4444",
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel Scheduled Change
                      </button>
                    </div>
                  )}

                  {/* Schedule New Price Change Form (Steps 6 & 7 of PDF) */}
                  <form
                    onSubmit={handleScheduleApplePrice}
                    style={{
                      background: "rgba(30, 41, 59, 0.5)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <Calendar size={18} color="#38bdf8" /> Schedule New Price Change on Apple
                    </h4>

                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: 6 }}>
                        Select Target Price Point (India Tier)
                      </label>
                      <select
                        className="form-input-styled"
                        style={{ width: "100%", background: "#1e293b", color: "#fff" }}
                        value={selectedPricePoint}
                        onChange={(e) => {
                          setSelectedPricePoint(e.target.value);
                          const point = (appleModalScan?.pricePoints || []).find((p) => p.id === e.target.value);
                          if (point) setSelectedNewPrice(point.customerPrice);
                        }}
                        required
                      >
                        <option value="">-- Choose Apple India Price Point --</option>
                        {(appleModalScan?.pricePoints || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            ₹{p.customerPrice} / month (Developer proceeds: ₹{p.proceeds})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: 6 }}>
                        Effective Start Date (Leave blank for Immediate)
                      </label>
                      <input
                        type="date"
                        className="form-input-styled"
                        style={{ width: "100%", background: "#1e293b", color: "#fff" }}
                        value={scheduleStartDate}
                        onChange={(e) => setScheduleStartDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4, display: "block" }}>
                        Note: Leave empty if you want Apple to apply the change immediately (startDate: null).
                      </span>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#cbd5e1" }}>
                      <input
                        type="checkbox"
                        checked={preserveExisting}
                        onChange={(e) => setPreserveExisting(e.target.checked)}
                      />
                      Preserve current price for existing subscribers (Grandfathering - Apple Recommended)
                    </label>

                    {/* Confirmation Summary Preview (Step 6 of PDF) */}
                    {selectedNewPrice && (
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.8)",
                          padding: "14px",
                          borderRadius: "8px",
                          border: "1px dashed rgba(255,255,255,0.2)",
                        }}
                      >
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Confirmation Review:</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontWeight: 700, fontSize: "1.05rem" }}>
                          <span>Current: ₹{appleModalScan?.currentPrice || appleModalPlan.appleCurrentPrice || appleModalPlan.price}</span>
                          <ArrowRight size={16} color="#38bdf8" />
                          <span style={{ color: "#4ade80" }}>New: ₹{selectedNewPrice}</span>
                          <span style={{ fontSize: "0.85rem", color: Number(selectedNewPrice) >= (appleModalScan?.currentPrice || appleModalPlan.price) ? "#4ade80" : "#f87171" }}>
                            ({Number(selectedNewPrice) >= (appleModalScan?.currentPrice || appleModalPlan.price) ? `+₹${Number(selectedNewPrice) - (appleModalScan?.currentPrice || appleModalPlan.price)}` : `-₹${(appleModalScan?.currentPrice || appleModalPlan.price) - Number(selectedNewPrice)}`})
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isScheduling || !selectedPricePoint}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        cursor: isScheduling || !selectedPricePoint ? "not-allowed" : "pointer",
                        opacity: !selectedPricePoint ? 0.6 : 1,
                      }}
                    >
                      {isScheduling ? "Submitting to Apple API..." : "🚀 Confirm & Schedule Price Change on Apple"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW MODAL ================= */}
      {viewPlan && (
        <div className="modal-overlay" onClick={() => setViewPlan(null)}>
          <div className="modal-box modal-box-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                {viewPlan.category === "ORANGETICK" || viewPlan.category === "BLUETICK"
                  ? "✔️ Orange Tick Plan Details"
                  : "💳 Subscription Plan Details"}
              </h3>
              <button className="modal-close" onClick={() => setViewPlan(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body p-0">
              <div className="profile-details-grid" style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Plan Name
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    {viewPlan.name}
                  </span>
                </div>

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Backend Price
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    ₹{viewPlan.price}
                  </span>
                </div>

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Apple Live Price (StoreKit)
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#4ade80" }}>
                    {viewPlan.appleCurrentPrice ? `₹${viewPlan.appleCurrentPrice}` : "Not synced"}
                  </span>
                </div>

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Validity Duration
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    {viewPlan.duration} days
                  </span>
                </div>

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Category
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    {viewPlan.category || "SUBSCRIPTION"}
                  </span>
                </div>

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Apple Product ID (StoreKit)
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "0.95rem", color: "#38bdf8", fontFamily: "monospace" }}>
                    {viewPlan.appleProductId || "None"}
                  </span>
                </div>

                {viewPlan.appleScheduledPrice && (
                  <div className="p-detail-card" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid #f97316", padding: "16px", borderRadius: "8px", gridColumn: "1 / -1" }}>
                    <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "#f97316", marginBottom: "4px", fontWeight: 700 }}>
                      🕒 Apple Scheduled Price Change
                    </span>
                    <span className="p-detail-value" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>
                      ₹{viewPlan.appleScheduledPrice} (Effective: {viewPlan.appleScheduledDate || "Immediate"})
                    </span>
                  </div>
                )}

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px", gridColumn: "1 / -1" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Included Features
                  </span>
                  <span className="p-detail-value" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {viewPlan.features && viewPlan.features.length > 0
                      ? viewPlan.features.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem" }}>
                            <span style={{ color: viewPlan.category === "ORANGETICK" || viewPlan.category === "BLUETICK" ? "#f97316" : "var(--primary-color)" }}>✓</span> {f}
                          </div>
                        ))
                      : "No features specified"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}