import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaExternalLinkAlt, FaPlay, FaCrown, FaBell, FaCheckCircle, FaComments, FaPhone } from 'react-icons/fa';
import './NotificationDetailModal.css';

const TYPE_CONFIG = {
  CONTENT_ALERT: { label: "Content Premiere", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", icon: <FaPlay /> },
  NEW_MOVIE: { label: "New Movie", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", icon: <FaPlay /> },
  NEW_SERIES: { label: "New Series", color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)", icon: <FaPlay /> },
  NEW_TV_SHOW: { label: "TV Show Alert", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", icon: <FaPlay /> },
  NEW_SHORT_FILM: { label: "Short Film", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", icon: <FaPlay /> },
  SUBSCRIPTION: { label: "Subscription", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", icon: <FaCrown /> },
  ORANGETICK: { label: "Orange Tick Badge", color: "#FF7A1A", bg: "rgba(255, 122, 26, 0.15)", icon: <FaCheckCircle /> },
  BLUETICK: { label: "Orange Tick Badge", color: "#FF7A1A", bg: "rgba(255, 122, 26, 0.15)", icon: <FaCheckCircle /> },
  VERIFICATION: { label: "Verification", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", icon: <FaCheckCircle /> },
  PROMOTIONAL: { label: "Special Offer", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", icon: <FaBell /> },
  REEL: { label: "New Reel", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", icon: <FaPlay /> },
  CHAT: { label: "Chat Message", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", icon: <FaComments /> },
  CALL: { label: "Incoming Call", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", icon: <FaPhone /> },
  GENERAL: { label: "Announcement", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", icon: <FaBell /> },
  SYSTEM: { label: "System Update", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.15)", icon: <FaBell /> },
};

export default function NotificationDetailModal({ notification, onClose }) {
  const navigate = useNavigate();

  if (!notification) return null;

  const type = notification.type || "GENERAL";
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;
  const image = notification.imageUrl || notification.image || notification.metadata?.imageUrl || "";
  const actionUrl = notification.actionUrl || notification.link || "";

  const handleAction = () => {
    onClose();
    if (actionUrl) {
      if (actionUrl.startsWith("http")) {
        window.open(actionUrl, "_blank");
      } else {
        navigate(actionUrl);
      }
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "Just now";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine button text based on type/actionUrl
  const getActionBtnText = () => {
    if (actionUrl.includes("/watch/") || actionUrl.includes("/tv-shows/")) return "Watch Now";
    if (actionUrl.includes("/subscription")) return "View Subscription Plan";
    if (actionUrl.includes("/reels")) return "Watch Reel";
    if (actionUrl.includes("/chat")) return "Open Chat";
    if (actionUrl.includes("/profile")) return "View Profile";
    return "Open Link";
  };

  return (
    <div className="notif-center-modal-overlay" onClick={onClose}>
      <div className="notif-center-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notif-center-modal-header">
          <div
            className="notif-type-badge-pill"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.icon}
            <span>{cfg.label}</span>
          </div>

          <button
            onClick={onClose}
            className="notif-modal-close-btn"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Media Banner */}
        {image && (
          <div className="notif-center-img-wrap">
            <img
              src={image}
              alt={notification.title || "Notification"}
              className="notif-center-img"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="notif-center-body">
          <h2 className="notif-center-title">{notification.title || "Notification"}</h2>

          <p className="notif-center-time">{formatTime(notification.createdAt || notification.time)}</p>

          <p className="notif-center-message">
            {notification.message || notification.text || "No details provided."}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="notif-center-footer">
          {actionUrl && (
            <button
              onClick={handleAction}
              className="notif-action-btn primary"
            >
              {actionUrl.includes("/watch/") ? <FaPlay size={12} /> : <FaExternalLinkAlt size={12} />}
              <span>{getActionBtnText()}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="notif-action-btn secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
