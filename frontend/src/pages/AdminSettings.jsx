import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Settings,
  Save,
  Sliders,
  Shield,
  Megaphone,
  Award,
  RefreshCw,
} from "lucide-react";
import "./AdManagement.css";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/settings");
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error("Fetch Settings Error:", err);
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await API.put("/admin/settings", settings);
      if (res.data.success) {
        showToast("System settings updated successfully!");
        setSettings(res.data.settings);
      }
    } catch (err) {
      showToast("Failed to update settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="ad-management-container"><div className="loading-state">Loading settings...</div></div>;
  }

  return (
    <div className="ad-management-container">
      {/* Header */}
      <div className="ad-header">
        <div>
          <h2>System Engine & Rules Settings</h2>
          <p>Configure scoring weights, engagement point matrix, ad placement intervals & fraud rules</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchSettings}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="create-ad-btn" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Section 1: Quality Score Formula Weights */}
        <div className="table-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "#ec4899", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sliders size={20} /> Creator Quality Score Formula Weights (Total: 100%)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Qualified Watch Time (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.qualifiedWatchTime || 35}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, qualifiedWatchTime: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Completion Rate (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.completionRate || 20}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, completionRate: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Shares (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.shares || 15}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, shares: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Saves (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.saves || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, saves: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Comments (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.comments || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, comments: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Likes (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.likes || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, likes: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>New Followers (%)</label>
              <input
                type="number"
                value={settings.qualityScoreWeights?.newFollowers || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, newFollowers: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Engagement Points Matrix */}
        <div className="table-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={20} /> Engagement Point Matrix (Action Points)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Like Points</label>
              <input
                type="number"
                value={settings.engagementPoints?.like || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, like: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Comment Points</label>
              <input
                type="number"
                value={settings.engagementPoints?.comment || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, comment: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Share Points</label>
              <input
                type="number"
                value={settings.engagementPoints?.share || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, share: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Save Points</label>
              <input
                type="number"
                value={settings.engagementPoints?.save || 4}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, save: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Follow Points</label>
              <input
                type="number"
                value={settings.engagementPoints?.follow || 8}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, follow: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Ad Placement & Frequency */}
        <div className="table-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
            <Megaphone size={20} /> Ad Placement & Frequency Capping
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Show Ad Every N Reels</label>
              <select
                value={settings.adSettings?.adFrequency || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, adFrequency: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              >
                <option value={2}>Every 2 Reels</option>
                <option value={3}>Every 3 Reels</option>
                <option value={5}>Every 5 Reels</option>
                <option value={7}>Every 7 Reels</option>
                <option value={10}>Every 10 Reels</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Max Impressions / User / Day / Campaign</label>
              <input
                type="number"
                value={settings.adSettings?.frequencyCapPerUserPerDay || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, frequencyCapPerUserPerDay: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Minimum Watch Time for Qualified View (sec)</label>
              <input
                type="number"
                value={settings.adSettings?.minWatchTimeSeconds || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, minWatchTimeSeconds: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Anti-Fraud Rules */}
        <div className="table-card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={20} /> Fraud & Security Rules
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Rapid Refresh Cooldown (sec)</label>
              <input
                type="number"
                value={settings.fraudRules?.cooldownSeconds || 60}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fraudRules: { ...settings.fraudRules, cooldownSeconds: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Max Views Per IP Per Minute</label>
              <input
                type="number"
                value={settings.fraudRules?.maxViewsPerIPPerMinute || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fraudRules: { ...settings.fraudRules, maxViewsPerIPPerMinute: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Max Views Per Device Per Minute</label>
              <input
                type="number"
                value={settings.fraudRules?.maxViewsPerDevicePerMinute || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fraudRules: { ...settings.fraudRules, maxViewsPerDevicePerMinute: Number(e.target.value) },
                  })
                }
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
