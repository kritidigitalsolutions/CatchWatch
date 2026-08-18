import React, { useEffect } from "react";
import { X, Info, Sparkles, ArrowRight, Zap, CheckCircle2, Calculator, ShieldCheck } from "lucide-react";
import "./InfoModal.css";

/**
 * Reusable Info Trigger Button
 */
export function InfoButton({ onClick, title = "View Algorithm & Workflow Details", size = 16, className = "" }) {
  return (
    <button
      type="button"
      className={`info-trigger-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      title={title}
      aria-label={title}
    >
      <Info size={size} />
    </button>
  );
}

/**
 * Reusable Rich Info Modal / Overlay
 */
export default function InfoModal({ isOpen, onClose, data }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div
        className="info-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="info-modal-header">
          <div className="info-header-title-wrap">
            <div className="info-icon-badge">
              {data.icon || <Sparkles size={20} />}
            </div>
            <div>
              <div className="info-subtitle-tag">{data.category || "SYSTEM ALGORITHM & WORKFLOW"}</div>
              <h3 className="info-modal-title">{data.title}</h3>
            </div>
          </div>
          <button className="info-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="info-modal-body">
          {/* Overview Summary */}
          {data.overview && (
            <div className="info-overview-card">
              <p>{data.overview}</p>
            </div>
          )}

          {/* Workflow Steps */}
          {data.workflow && data.workflow.length > 0 && (
            <div className="info-section">
              <h4 className="info-section-title">
                <Zap size={16} className="info-section-icon text-pink" />
                Step-by-Step Execution Workflow
              </h4>
              <div className="info-workflow-timeline">
                {data.workflow.map((step, idx) => (
                  <div key={idx} className="info-workflow-step">
                    <div className="step-num-pill">{idx + 1}</div>
                    <div className="step-content">
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mathematical Formulas / Logic */}
          {data.formulas && data.formulas.length > 0 && (
            <div className="info-section">
              <h4 className="info-section-title">
                <Calculator size={16} className="info-section-icon text-blue" />
                Mathematical Formulas & Calculation Rules
              </h4>
              <div className="info-formulas-grid">
                {data.formulas.map((item, idx) => (
                  <div key={idx} className="info-formula-card">
                    <div className="formula-label">{item.label}</div>
                    <div className="formula-expression">
                      <code>{item.formula}</code>
                    </div>
                    {item.explanation && <div className="formula-explanation">{item.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Parameters / Points Breakdown */}
          {data.breakdown && data.breakdown.length > 0 && (
            <div className="info-section">
              <h4 className="info-section-title">
                <CheckCircle2 size={16} className="info-section-icon text-green" />
                Key Parameters & Business Logic
              </h4>
              <div className="info-breakdown-list">
                {data.breakdown.map((item, idx) => (
                  <div key={idx} className="info-breakdown-item">
                    <div className="breakdown-bullet" />
                    <div>
                      <span className="breakdown-name">{item.name}: </span>
                      <span className="breakdown-text">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fraud / Guard Rules */}
          {data.guards && data.guards.length > 0 && (
            <div className="info-section">
              <h4 className="info-section-title">
                <ShieldCheck size={16} className="info-section-icon text-amber" />
                Security, Anti-Fraud & Auto-Trigger Rules
              </h4>
              <div className="info-guards-grid">
                {data.guards.map((guard, idx) => (
                  <div key={idx} className="info-guard-card">
                    <div className="guard-title">{guard.rule}</div>
                    <div className="guard-desc">{guard.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="info-modal-footer">
          <div className="info-footer-hint">CatchWatch Internal Engine Architecture</div>
          <button className="info-footer-close-btn" onClick={onClose}>
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
}
