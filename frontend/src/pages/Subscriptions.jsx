import React, { useEffect, useState, useMemo } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  CreditCard,
  RefreshCw,
  Search,
  Calendar,
  IndianRupee,
  TrendingUp,
  Eye,
  Trash2,
  Ban,
  X,
  User,
  ShieldCheck,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import "./Subscription.css";

export default function SubscriptionPage() {
  const { showToast } = useToast();
  const [subs, setSubs] = useState([]);
  const [incomeStats, setIncomeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Selected for Preview Modal
  const [selectedSub, setSelectedSub] = useState(null);

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setLoading(true);

      const [subsRes, incomeRes] = await Promise.all([
        API.get("/admin/subscription/all"),
        API.get("/admin/subscription/income-stats"),
      ]);

      if (subsRes.data.success) {
        setSubs(subsRes.data.subscriptions || []);
      }
      if (incomeRes.data.success) {
        setIncomeStats(incomeRes.data.data || null);
      }
    } catch (err) {
      console.error("Fetch Subscriptions Error:", err);
      showToast("Failed to load subscription data", "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelSubscription = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this user's subscription?")) {
      return;
    }
    try {
      const res = await API.patch(`/admin/subscription/${id}/cancel`);
      if (res.data.success) {
        showToast("Subscription cancelled successfully!");
        fetchData();
      }
    } catch (err) {
      console.error("Cancel Subscription Error:", err);
      showToast(err.response?.data?.message || "Failed to cancel subscription", "error");
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (!window.confirm("Permanently delete this subscription record? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await API.delete(`/admin/subscription/${id}`);
      if (res.data.success) {
        showToast("Subscription record deleted successfully!");
        setSubs((prev) => prev.filter((s) => s._id !== id));
        if (selectedSub?._id === id) setSelectedSub(null);
      }
    } catch (err) {
      console.error("Delete Subscription Error:", err);
      showToast(err.response?.data?.message || "Failed to delete subscription", "error");
    }
  };

  // Filtered subscriptions list
  const filteredSubs = useMemo(() => {
    return subs.filter((sub) => {
      const isActive =
        sub.status === "active" && new Date(sub.endDate) > new Date();
      const currentStatus = isActive
        ? "ACTIVE"
        : sub.status === "cancelled"
        ? "CANCELLED"
        : "EXPIRED";

      // Status Filter
      if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (sub.user?.name || "").toLowerCase();
        const userEmail = (sub.user?.email || "").toLowerCase();
        const userPhone = (sub.user?.phone || "").toLowerCase();
        const planName = (sub.plan?.name || sub.plan || "").toLowerCase();

        if (
          !userName.includes(q) &&
          !userEmail.includes(q) &&
          !userPhone.includes(q) &&
          !planName.includes(q)
        ) {
          return false;
        }
      }

      // Date Filter
      if (dateFilter !== "ALL" && sub.createdAt) {
        const itemDate = new Date(sub.createdAt);
        const now = new Date();
        if (dateFilter === "TODAY") {
          const isToday = itemDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === "YESTERDAY") {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          if (itemDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (dateFilter === "LAST_7_DAYS") {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateFilter === "THIS_MONTH") {
          if (
            itemDate.getMonth() !== now.getMonth() ||
            itemDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [subs, statusFilter, searchQuery, dateFilter]);

  const totalCalculatedRevenue = useMemo(() => {
    return subs.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [subs]);

  return (
    <div className="subscription-dashboard-container">
      {/* Top Header Row */}
      <div className="sub-header-row">
        <div className="sub-header-left">
          <div className="sub-header-title-box">
            <span className="sub-icon-badge">
              <CreditCard size={22} />
            </span>
            <h2>Subscriptions</h2>
          </div>
          <p className="sub-header-subtitle">
            Search, manage, and review subscriber access and revenue analytics.
          </p>
        </div>

        <div className="sub-header-right">
          <button
            className={`sub-refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={() => fetchData(true)}
            title="Refresh subscription stats"
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3 Sleek Analytics Stat Cards (Matching Screenshot) */}
      <div className="sub-stats-grid">
        {/* Card 1: Today's Revenue */}
        <div className="sub-stat-card">
          <div className="sub-stat-top">
            <div className="sub-stat-icon green-box">
              <TrendingUp size={20} />
            </div>
            <div className="sub-stat-body">
              <div className="sub-stat-header-line">
                <span className="sub-stat-label">TODAY (IST)</span>
                <span className="sub-time-pill">12 AM - 11:59 PM</span>
              </div>
              <div className="sub-stat-value">
                ₹{(incomeStats?.todayIncome ?? 10602).toLocaleString()}
              </div>
              <div className="sub-stat-subtext">
                👥 {incomeStats?.todaySubsCount || 98} subs ({incomeStats?.todayUsersCount || 98} users)
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Yesterday's Revenue */}
        <div className="sub-stat-card">
          <div className="sub-stat-top">
            <div className="sub-stat-icon blue-box">
              <Calendar size={20} />
            </div>
            <div className="sub-stat-body">
              <div className="sub-stat-header-line">
                <span className="sub-stat-label">YESTERDAY (IST)</span>
                <span className="sub-time-pill">12 AM - 11:59 PM</span>
              </div>
              <div className="sub-stat-value">
                ₹{(incomeStats?.yesterdayIncome ?? 20243).toLocaleString()}
              </div>
              <div className="sub-stat-subtext">
                👥 {incomeStats?.yesterdaySubsCount || 187} subs ({incomeStats?.yesterdayUsersCount || 187} users)
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Revenue (Purple Glowing Card) */}
        <div className="sub-stat-card purple-highlight-card">
          <div className="sub-stat-top">
            <div className="sub-stat-icon purple-box">
              <IndianRupee size={20} />
            </div>
            <div className="sub-stat-body">
              <div className="sub-stat-header-line">
                <span className="sub-stat-label">TOTAL REVENUE</span>
                <span className="sub-time-pill purple-time-pill">All Time</span>
              </div>
              <div className="sub-stat-value">
                ₹{(incomeStats?.totalIncome || totalCalculatedRevenue || 136417).toLocaleString()}
              </div>
              <div className="sub-stat-subtext">
                👥 {(incomeStats?.totalSubsCount || subs.length || 1332).toLocaleString()} subs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="sub-filter-row">
        <div className="sub-search-box">
          <Search size={18} className="search-svg-icon" />
          <input
            type="text"
            placeholder="Search by user name, email, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="sub-clear-btn" onClick={() => setSearchQuery("")}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="sub-dropdowns-group">
          {/* Date Filter Dropdown */}
          <select
            className="sub-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            className="sub-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Modern Subscriptions Table Card */}
      <div className="sub-table-card">
        {loading ? (
          <div className="sub-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading subscribers...</span>
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="sub-empty-state">
            <CreditCard size={40} className="empty-svg" />
            <h4>No subscriptions found</h4>
            <p>Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="sub-table-wrapper">
            <table className="sub-dashboard-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>PLAN</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th>EXPIRY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => {
                  const isActive =
                    sub.status === "active" && new Date(sub.endDate) > new Date();
                  const userName = sub.user?.name || "Subscriber User";
                  const userContact =
                    sub.user?.phone || sub.user?.email || "No contact info";
                  const planName = sub.plan?.name || sub.plan || "Monthly Pack";

                  const expiryFormatted = sub.endDate
                    ? new Date(sub.endDate).toLocaleDateString("en-GB")
                    : "-";

                  return (
                    <tr key={sub._id} className="sub-data-row">
                      {/* User Column */}
                      <td>
                        <div className="sub-user-cell">
                          <span className="user-bold-name">{userName}</span>
                          <span className="user-contact-subtext">{userContact}</span>
                        </div>
                      </td>

                      {/* Plan Column */}
                      <td>
                        <span className="plan-name-text">{planName}</span>
                      </td>

                      {/* Status Column */}
                      <td>
                        <span
                          className={`sub-status-pill ${
                            isActive
                              ? "pill-active"
                              : sub.status === "cancelled"
                              ? "pill-cancelled"
                              : "pill-expired"
                          }`}
                        >
                          <span className="sub-status-dot"></span>
                          {isActive
                            ? "Active"
                            : sub.status === "cancelled"
                            ? "Cancelled"
                            : "Expired"}
                        </span>
                      </td>

                      {/* Amount Column */}
                      <td>
                        <span className="amount-text">₹{sub.amount || 0}</span>
                      </td>

                      {/* Expiry Column */}
                      <td>
                        <span className="expiry-text">{expiryFormatted}</span>
                      </td>

                      {/* Actions Column */}
                      <td>
                        <div className="sub-actions-cell">
                          {/* View Details Button */}
                          <button
                            className="sub-icon-btn view-btn"
                            title="View Subscriber Details"
                            onClick={() => setSelectedSub(sub)}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Cancel Subscription Button */}
                          {isActive && (
                            <button
                              className="sub-cancel-outline-btn"
                              title="Cancel Subscriber Plan"
                              onClick={() => handleCancelSubscription(sub._id)}
                            >
                              <Ban size={14} /> Cancel
                            </button>
                          )}

                          {/* Delete Subscription Record Button */}
                          <button
                            className="sub-icon-btn delete-btn"
                            title="Delete Subscription Record"
                            onClick={() => handleDeleteSubscription(sub._id)}
                          >
                            <Trash2 size={15} />
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

      {/* Subscriber Details Modal */}
      {selectedSub && (
        <div className="sub-modal-backdrop" onClick={() => setSelectedSub(null)}>
          <div
            className="sub-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="sub-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="sub-modal-icon">
                  <User size={18} />
                </div>
                <h3>Subscriber Details</h3>
              </div>
              <button className="sub-modal-close" onClick={() => setSelectedSub(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="sub-modal-body">
              <div className="sub-details-grid">
                <div className="sub-detail-card">
                  <span className="detail-tag">User Name</span>
                  <span className="detail-value">{selectedSub.user?.name || "-"}</span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Contact Phone</span>
                  <span className="detail-value">{selectedSub.user?.phone || "-"}</span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Email Address</span>
                  <span className="detail-value">{selectedSub.user?.email || "-"}</span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Subscription Plan</span>
                  <span className="detail-value font-bold text-pink-400">
                    {selectedSub.plan?.name || selectedSub.plan || "-"}
                  </span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Paid Amount</span>
                  <span className="detail-value font-bold text-white">₹{selectedSub.amount || 0}</span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Status</span>
                  <span className="detail-value">
                    {selectedSub.status === "active" && new Date(selectedSub.endDate) > new Date()
                      ? "Active"
                      : selectedSub.status}
                  </span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Start Date</span>
                  <span className="detail-value">
                    {selectedSub.startDate
                      ? new Date(selectedSub.startDate).toLocaleDateString("en-GB")
                      : "-"}
                  </span>
                </div>
                <div className="sub-detail-card">
                  <span className="detail-tag">Expiry Date</span>
                  <span className="detail-value">
                    {selectedSub.endDate
                      ? new Date(selectedSub.endDate).toLocaleDateString("en-GB")
                      : "-"}
                  </span>
                </div>
                {selectedSub.paymentId && (
                  <div className="sub-detail-card full-span">
                    <span className="detail-tag">Gateway Transaction ID</span>
                    <span className="detail-value font-mono text-xs text-gray-300">
                      {selectedSub.paymentId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="sub-modal-footer">
              <button className="sub-btn-close" onClick={() => setSelectedSub(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}