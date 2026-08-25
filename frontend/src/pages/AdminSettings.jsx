import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Save,
  Sliders,
  Shield,
  Megaphone,
  Award,
  RefreshCw,
  SlidersHorizontal,
  Settings as SettingsIcon,
  CheckCircle2
} from "lucide-react";
import "./AdminSettings.css";
import InfoModal, { InfoButton } from "../components/InfoModal";
import { INFO_CONTENT } from "../data/infoModalContent";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeInfoKey, setActiveInfoKey] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/settings");
      if (res.data?.success) {
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
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await API.put("/admin/settings", settings);
      if (res.data?.success) {
        showToast("System engine settings updated successfully!");
        setSettings(res.data.settings);
      }
    } catch (err) {
      showToast("Failed to update settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="settings-container">
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          Loading engine settings...
        </div>
      </div>
    );
  }

  // Calculate sum of Quality Score weights
  const totalWeight =
    (settings.qualityScoreWeights?.qualifiedWatchTime || 0) +
    (settings.qualityScoreWeights?.completionRate || 0) +
    (settings.qualityScoreWeights?.shares || 0) +
    (settings.qualityScoreWeights?.saves || 0) +
    (settings.qualityScoreWeights?.comments || 0) +
    (settings.qualityScoreWeights?.likes || 0) +
    (settings.qualityScoreWeights?.newFollowers || 0);

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <div className="settings-icon-box">
            <SettingsIcon size={24} />
          </div>
          <div className="settings-titles">
            <h2>
              <span>System Engine & Rules Settings</span>
              <InfoButton
                onClick={() => setActiveInfoKey("system-settings-engine")}
                title="Overview of Platform Configuration Engine"
              />
            </h2>
            <p>Configure scoring weights, engagement point matrix, ad placement intervals & fraud rules</p>
          </div>
        </div>

        <div className="settings-header-actions">
          <button type="button" className="btn-reset-settings" onClick={fetchSettings} disabled={saving}>
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>
          <button type="button" className="btn-save-settings" onClick={handleSave} disabled={saving}>
            <Save size={18} />
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Section 1: Quality Score Formula Weights */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h3 className="settings-section-title" style={{ color: "#ec4899" }}>
              <Sliders size={20} />
              <span>Creator Quality Score Formula Weights</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  background: totalWeight === 100 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: totalWeight === 100 ? "#34d399" : "#f87171",
                  border: `1px solid ${totalWeight === 100 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  fontWeight: 800,
                }}
              >
                Total: {totalWeight}% {totalWeight === 100 ? "✔ Valid" : "⚠ Must equal 100%"}
              </span>
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("quality-score-weights")}
              title="Formula Breakdown, Normalization & Weight Distribution"
              className="btn-amber"
            />
          </div>

          <div className="settings-grid">
            <div className="settings-field-group">
              <label className="settings-label">Qualified Watch Time (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.qualifiedWatchTime || 35}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, qualifiedWatchTime: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Completion Rate (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.completionRate || 20}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, completionRate: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Shares (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.shares || 15}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, shares: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Saves (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.saves || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, saves: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Comments (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.comments || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, comments: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Likes (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.likes || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, likes: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">New Followers (%)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.qualityScoreWeights?.newFollowers || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, newFollowers: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 2: Engagement Points Matrix */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h3 className="settings-section-title" style={{ color: "#3b82f6" }}>
              <Award size={20} />
              <span>Engagement Point Matrix (Action Points)</span>
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("engagement-matrix")}
              title="Points Conversion, Wallet Credit & Anti-Spam Guards"
              className="btn-blue"
            />
          </div>

          <div className="settings-grid">
            <div className="settings-field-group">
              <label className="settings-label">Like Points</label>
              <input
                type="number"
                className="settings-input"
                value={settings.engagementPoints?.like || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, like: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Comment Points</label>
              <input
                type="number"
                className="settings-input"
                value={settings.engagementPoints?.comment || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, comment: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Share Points</label>
              <input
                type="number"
                className="settings-input"
                value={settings.engagementPoints?.share || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, share: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Save Points</label>
              <input
                type="number"
                className="settings-input"
                value={settings.engagementPoints?.save || 4}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, save: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Follow Points</label>
              <input
                type="number"
                className="settings-input"
                value={settings.engagementPoints?.follow || 8}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, follow: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 3: Ad Placement & Frequency */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h3 className="settings-section-title" style={{ color: "#10b981" }}>
              <Megaphone size={20} />
              <span>Ad Placement & Frequency Capping</span>
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("ad-placement-rules")}
              title="Feed Placement Rules & Frequency Thresholds"
              className="btn-emerald"
            />
          </div>

          <div className="settings-grid">
            <div className="settings-field-group">
              <label className="settings-label">Show Ad Every N Reels</label>
              <select
                className="settings-select"
                value={settings.adSettings?.adFrequency || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, adFrequency: Number(e.target.value) },
                  })
                }
              >
                <option value={2}>Every 2 Reels</option>
                <option value={3}>Every 3 Reels</option>
                <option value={5}>Every 5 Reels</option>
                <option value={7}>Every 7 Reels</option>
                <option value={10}>Every 10 Reels</option>
              </select>
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Max Impressions / User / Day / Campaign</label>
              <input
                type="number"
                className="settings-input"
                value={settings.adSettings?.frequencyCapPerUserPerDay || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, frequencyCapPerUserPerDay: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="settings-field-group">
              <label className="settings-label">Minimum Watch Time for Qualified View (sec)</label>
              <input
                type="number"
                className="settings-input"
                value={settings.adSettings?.minWatchTimeSeconds || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, minWatchTimeSeconds: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Section 4: Bottom Save Actions */}
        <div className="settings-footer-actions">
          <button type="submit" className="btn-save-settings" disabled={saving}>
            <Save size={18} />
            <span>{saving ? "Saving Changes..." : "Save All Settings"}</span>
          </button>
        </div>
      </form>

      {/* Reusable Info Modal Overlay */}
      <InfoModal
        isOpen={!!activeInfoKey}
        onClose={() => setActiveInfoKey(null)}
        data={activeInfoKey ? INFO_CONTENT[activeInfoKey] : null}
      />
    </div>
  );
}
