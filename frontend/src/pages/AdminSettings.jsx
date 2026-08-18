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
} from "lucide-react";
import "./AdManagement.css";
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
          <div style={{ display: "flex", alignItems: "center" }}>
            <h2>System Engine & Rules Settings</h2>
            <InfoButton
              onClick={() => setActiveInfoKey("system-settings-engine")}
              title="Overview of Platform Configuration Engine"
            />
          </div>
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
          <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#ec4899", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sliders size={20} /> Creator Quality Score Formula Weights (Total: 100%)
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("quality-score-weights")}
              title="Formula Breakdown, Normalization & Weight Distribution"
              className="btn-amber"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Qualified Watch Time (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.qualifiedWatchTime || 35}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, qualifiedWatchTime: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Completion Rate (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.completionRate || 20}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, completionRate: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Shares (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.shares || 15}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, shares: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Saves (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.saves || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, saves: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Comments (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.comments || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, comments: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Likes (%)</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.qualityScoreWeights?.likes || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    qualityScoreWeights: { ...settings.qualityScoreWeights, likes: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">New Followers (%)</label>
              <input
                type="number"
                className="form-control-input"
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
        <div className="table-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#3b82f6", display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={20} /> Engagement Point Matrix (Action Points)
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("engagement-matrix")}
              title="Points Conversion, Wallet Credit & Anti-Spam Guards"
              className="btn-blue"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Like Points</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.engagementPoints?.like || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, like: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Comment Points</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.engagementPoints?.comment || 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, comment: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Share Points</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.engagementPoints?.share || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, share: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Save Points</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.engagementPoints?.save || 4}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    engagementPoints: { ...settings.engagementPoints, save: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Follow Points</label>
              <input
                type="number"
                className="form-control-input"
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
        <div className="table-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
              <Megaphone size={20} /> Ad Placement & Frequency Capping
            </h3>
            <InfoButton
              onClick={() => setActiveInfoKey("ad-placement-rules")}
              title="Feed Placement Rules & Frequency Thresholds"
              className="btn-emerald"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Show Ad Every N Reels</label>
              <select
                className="form-control-input"
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

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Max Impressions / User / Day / Campaign</label>
              <input
                type="number"
                className="form-control-input"
                value={settings.adSettings?.frequencyCapPerUserPerDay || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adSettings: { ...settings.adSettings, frequencyCapPerUserPerDay: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Minimum Watch Time for Qualified View (sec)</label>
              <input
                type="number"
                className="form-control-input"
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
