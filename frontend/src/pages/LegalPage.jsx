import { useEffect, useState } from "react";
import API from "../api/axios";
import { FileText, Eye, Edit2, X, Save } from "lucide-react";
import "./Dashboard.css";

export default function LegalPage() {
  const [legal, setLegal] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");

  useEffect(() => { fetchLegal(); }, []);

  const fetchLegal = async () => {
    try {
      const res = await API.get("/admin/legal");
      setLegal(res.data.documents || []);
    } catch { setLegal([]); }
  };

  const handleSave = async () => {
    try {
      await API.put(`/admin/legal/${selected.type}`, {
        title: selected.title, content: selected.content, type: selected.type,
      });
      setSelected(null);
      fetchLegal();
    } catch { alert("Update failed"); }
  };

  const formatContentToHtml = (content) => {
    if (!content) return "";
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    
    return content
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        
        if (trimmed.startsWith("### ")) {
          return `<h3 style="font-size: 1.05rem; font-weight: 700; color: #111827; margin-top: 1.25rem; margin-bottom: 0.5rem;">${trimmed.replace(/^###\s*/, "")}</h3>`;
        }
        if (trimmed.startsWith("## ")) {
          return `<h2 style="font-size: 1.2rem; font-weight: 800; color: #111827; margin-top: 1.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem;">${trimmed.replace(/^##\s*/, "")}</h2>`;
        }
        if (trimmed.startsWith("# ")) {
          return `<h1 style="font-size: 1.4rem; font-weight: 900; color: #111827; margin-top: 2.25rem; margin-bottom: 1rem;">${trimmed.replace(/^#\s*/, "")}</h1>`;
        }
        
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return `<h2 style="font-size: 1.2rem; font-weight: 800; color: #111827; margin-top: 1.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem;">${trimmed.replace(/\*\*/g, "")}</h2>`;
        }
        
        const lines = trimmed
          .split("\n")
          .map(line => line.trim())
          .filter(Boolean)
          .join("<br />");
          
        return `<p style="margin-bottom: 0.85rem; color: #4b5563; line-height: 1.65; font-weight: 500;">${lines}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  };

  const open = (doc, m) => { setSelected(doc); setMode(m); };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><FileText size={28} style={{ display: "inline-block", marginRight: 8 }} /> Legal & Compliance</h1>
          <p className="pg-sub">Manage your platform's legal documents</p>
        </div>
      </div>

      {legal.length === 0 ? (
        <div className="content-box">
          <div className="empty-state"><p>No legal documents found.</p></div>
        </div>
      ) : (
        <div className="doc-grid">
          {legal.map((doc, i) => (
            <div key={doc._id || i} className="doc-card">
              <div className="doc-card-head">
                <h3>{doc.title}</h3>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => open(doc, "view")} title="View"><Eye size={16} /></button>
                  <button className="icon-btn edit" onClick={() => open(doc, "edit")} title="Edit"><Edit2 size={16} /></button>
                </div>
              </div>
              <span className={`badge ${doc.isPublished ? "badge-pub" : "badge-draft"}`}>
                {doc.isPublished ? "Published" : "Draft"}
              </span>
              <p className="doc-excerpt">{doc.content}</p>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h3>{mode === "view" ? <><FileText size={20} style={{ display: "inline-block", marginRight: 6 }} /> View Document</> : <><Edit2 size={20} style={{ display: "inline-block", marginRight: 6 }} /> Edit Document</>}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title</label>
                <input className="form-input" value={selected.title} disabled={mode === "view"}
                  onChange={e => setSelected({ ...selected, title: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Content</label>
                {mode === "view" ? (
                  <div 
                    className="form-input" 
                    style={{ 
                      maxHeight: "350px", 
                      overflowY: "auto", 
                      background: "#f9fafb", 
                      padding: "16px", 
                      borderRadius: "8px", 
                      border: "1px solid #e5e7eb",
                      textAlign: "left"
                    }}
                    dangerouslySetInnerHTML={{ __html: formatContentToHtml(selected.content) }}
                  />
                ) : (
                  <textarea className="form-input" rows={12} value={selected.content}
                    style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem", lineHeight: 1.7 }}
                    onChange={e => setSelected({ ...selected, content: e.target.value })} />
                )}
              </div>
            </div>
            {mode === "edit" && (
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}><Save size={16} style={{ display: "inline-block", marginRight: 6 }} /> Save Changes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}