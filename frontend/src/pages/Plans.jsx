import { useState, useEffect } from "react";
import { Pencil, Trash2, Eye, X, BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState("SUBSCRIPTION"); // 'SUBSCRIPTION' | 'BLUETICK'

  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    features: "",
    planType: "monthly",
    sortOrder: 0,
    isRecommended: false,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [editId, setEditId] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);

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
    setForm({
      name: "",
      price: "",
      duration: "",
      features: "",
      planType: "monthly",
      sortOrder: 0,
      isRecommended: false,
      isActive: true,
    });
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
        sortOrder: 0,
        isRecommended: false,
        isActive: true,
      });

      setEditId(null);
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
      sortOrder: plan.sortOrder || 0,
      isRecommended: plan.isRecommended || false,
      isActive: plan.isActive !== false,
    });
    setEditId(plan._id);
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">💳 Subscription & Verification Plans</h1>
        <p className="pg-sub">Configure user subscription tiers and Blue Tick profile verification plans.</p>
      </div>

      {/* ── Category Sub-page / Tab Switcher ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
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
          onClick={() => handleTabChange("BLUETICK")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: activeTab === "BLUETICK" ? "#3b82f6" : "rgba(255,255,255,0.05)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.95rem",
          }}
        >
          <BadgeCheck size={18} /> Blue Tick & Verification Plans
        </button>
      </div>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>
            {editId
              ? `Edit ${activeTab === "BLUETICK" ? "Blue Tick" : "Subscription"} Plan`
              : `Create New ${activeTab === "BLUETICK" ? "Blue Tick Verification" : "Subscription"} Plan`}
          </h3>

          <div className="form-2col">
            <input
              className="form-input-styled"
              name="name"
              placeholder={activeTab === "BLUETICK" ? "Plan Name (e.g. Monthly Blue Tick, Pro Verified)" : "Plan Name (e.g. Basic, VIP Premium)"}
              value={form.name}
              onChange={ch}
              required
            />

            <input
              className="form-input-styled"
              name="price"
              type="number"
              placeholder="Price (₹)"
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

            <input
              className="form-input-styled form-full"
              name="features"
              placeholder="Features list (comma separated, e.g. Official Blue Tick Badge, Higher Search Priority, Dedicated Support)"
              value={form.features}
              onChange={ch}
            />

            <select
              className="form-input-styled"
              name="planType"
              value={form.planType}
              onChange={ch}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>

            <input
              className="form-input-styled"
              name="sortOrder"
              type="number"
              placeholder="Sort Order (e.g. 1)"
              value={form.sortOrder}
              onChange={ch}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                name="isRecommended"
                checked={form.isRecommended}
                onChange={ch}
              />
              Recommended / Featured Badge
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={ch}
              />
              Active (Visible to users)
            </label>
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{
              marginTop: 16,
              background: activeTab === "BLUETICK" ? "#3b82f6" : undefined,
            }}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : editId
              ? "Update Plan"
              : `Create ${activeTab === "BLUETICK" ? "Blue Tick" : "Subscription"} Plan`}
          </button>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="content-box" style={{ marginTop: 24 }}>
        <h3>
          {activeTab === "BLUETICK" ? "✔️ All Blue Tick & Verification Plans" : "💳 All Standard Subscription Plans"}
        </h3>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Price</th>
                <th>Validity</th>
                <th>Type</th>
                <th>Status</th>
                <th>Recommended</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
                    No {activeTab === "BLUETICK" ? "Blue Tick" : "subscription"} plans created yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>
                      {p.name}{" "}
                      {p.category === "BLUETICK" && <BadgeCheck size={16} color="#3b82f6" style={{ verticalAlign: "middle" }} />}
                    </td>
                    <td>₹{p.price}</td>
                    <td>{p.duration} days</td>
                    <td style={{ textTransform: "capitalize" }}>{p.planType || "Monthly"}</td>
                    <td>
                      <span className={p.isActive !== false ? "status active" : "status expired"}>
                        {p.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{p.isRecommended ? "Yes" : "No"}</td>

                    <td className="actions">
                      <button
                        className="icon-btn view"
                        onClick={() => setViewPlan(p)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="icon-btn edit"
                        onClick={() => handleEdit(p)}
                        title="Edit Plan"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(p._id)}
                        title="Delete Plan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {viewPlan && (
        <div className="modal-overlay" onClick={() => setViewPlan(null)}>
          <div className="modal-box modal-box-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                {viewPlan.category === "BLUETICK" ? "✔️ Blue Tick Plan Details" : "💳 Subscription Plan Details"}
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
                    Price
                  </span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    ₹{viewPlan.price}
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

                <div className="p-detail-card" style={{ background: "var(--bg-card-soft)", padding: "16px", borderRadius: "8px", gridColumn: "1 / -1" }}>
                  <span className="p-detail-label" style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Included Features
                  </span>
                  <span className="p-detail-value" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {viewPlan.features && viewPlan.features.length > 0
                      ? viewPlan.features.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem" }}>
                            <span style={{ color: viewPlan.category === "BLUETICK" ? "#3b82f6" : "var(--primary-color)" }}>✓</span> {f}
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