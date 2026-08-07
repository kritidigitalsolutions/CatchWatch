import { useEffect, useState } from "react";
import API from "../api/axios";
import { FileText, Eye, Edit2, X, Save, Plus, Trash2, Layers, Globe, AlignLeft } from "lucide-react";
import "./Dashboard.css";

export default function LegalPage() {
  const [legal, setLegal] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [editorTab, setEditorTab] = useState("sections"); // "sections" | "raw"

  useEffect(() => {
    fetchLegal();
  }, []);

  const fetchLegal = async () => {
    try {
      const res = await API.get("/admin/legal");
      setLegal(res.data.documents || []);
    } catch (err) {
      console.error("Fetch legal documents error:", err);
      setLegal([]);
    }
  };

  const handleOpenCreate = () => {
    setSelected({
      title: "",
      type: "",
      isPublished: true,
      order: legal.length + 1,
      content: "",
      sections: [
        {
          heading: "1. Overview & General Info",
          paragraphs: ["Enter paragraph content here..."]
        }
      ],
      isNew: true
    });
    setMode("create");
    setEditorTab("sections");
  };

  const handleOpenEdit = (doc) => {
    const existingSections = doc.sections && doc.sections.length > 0
      ? doc.sections
      : [
          {
            heading: "Section 1",
            paragraphs: [doc.content || ""]
          }
        ];

    setSelected({
      ...doc,
      sections: existingSections,
      isNew: false
    });
    setMode("edit");
    setEditorTab(doc.sections && doc.sections.length > 0 ? "sections" : "raw");
  };

  const handleOpenView = (doc) => {
    setSelected(doc);
    setMode("view");
  };

  const handleSave = async () => {
    if (!selected.title.trim()) {
      alert("Document Title is required.");
      return;
    }

    const slug = (selected.type || selected.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

    if (!slug) {
      alert("Document Slug / Type is required.");
      return;
    }

    // Build markdown fallback content from sections if sections exist
    let compiledContent = selected.content || "";
    if (selected.sections && selected.sections.length > 0) {
      compiledContent = selected.sections
        .map(sec => `## ${sec.heading}\n\n${(sec.paragraphs || []).join("\n\n")}`)
        .join("\n\n");
    }

    const payload = {
      title: selected.title,
      type: slug,
      content: compiledContent,
      sections: selected.sections || [],
      isPublished: selected.isPublished !== undefined ? selected.isPublished : true,
      order: Number(selected.order) || 0
    };

    try {
      if (selected.isNew) {
        await API.post("/admin/legal", payload);
      } else {
        await API.put(`/admin/legal/${slug}`, payload);
      }
      setSelected(null);
      fetchLegal();
    } catch (err) {
      console.error("Save Document Error:", err);
      alert(err.response?.data?.message || "Failed to save document");
    }
  };

  const handleDelete = async (slug) => {
    if (!slug) return;
    if (!window.confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) return;

    try {
      await API.delete(`/admin/legal/${slug}`);
      if (selected?.type === slug) setSelected(null);
      fetchLegal();
    } catch (err) {
      console.error("Delete Document Error:", err);
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  const handleTogglePublish = async (slug) => {
    try {
      await API.patch(`/admin/legal/${slug}/toggle`);
      fetchLegal();
    } catch (err) {
      console.error("Toggle publish error:", err);
    }
  };

  // Section Builder Helpers
  const handleAddSection = () => {
    if (!selected) return;
    const nextSections = [
      ...(selected.sections || []),
      {
        heading: `${(selected.sections || []).length + 1}. Section Title`,
        paragraphs: [""]
      }
    ];
    setSelected({ ...selected, sections: nextSections });
  };

  const handleRemoveSection = (sIdx) => {
    if (!selected) return;
    const nextSections = selected.sections.filter((_, i) => i !== sIdx);
    setSelected({ ...selected, sections: nextSections });
  };

  const handleSectionHeadingChange = (sIdx, value) => {
    if (!selected) return;
    const nextSections = [...selected.sections];
    nextSections[sIdx] = { ...nextSections[sIdx], heading: value };
    setSelected({ ...selected, sections: nextSections });
  };

  const handleAddParagraph = (sIdx) => {
    if (!selected) return;
    const nextSections = [...selected.sections];
    const currentParagraphs = nextSections[sIdx].paragraphs || [];
    nextSections[sIdx] = {
      ...nextSections[sIdx],
      paragraphs: [...currentParagraphs, ""]
    };
    setSelected({ ...selected, sections: nextSections });
  };

  const handleRemoveParagraph = (sIdx, pIdx) => {
    if (!selected) return;
    const nextSections = [...selected.sections];
    const currentParagraphs = nextSections[sIdx].paragraphs.filter((_, i) => i !== pIdx);
    nextSections[sIdx] = { ...nextSections[sIdx], paragraphs: currentParagraphs };
    setSelected({ ...selected, sections: nextSections });
  };

  const handleParagraphChange = (sIdx, pIdx, value) => {
    if (!selected) return;
    const nextSections = [...selected.sections];
    const nextParagraphs = [...nextSections[sIdx].paragraphs];
    nextParagraphs[pIdx] = value;
    nextSections[sIdx] = { ...nextSections[sIdx], paragraphs: nextParagraphs };
    setSelected({ ...selected, sections: nextSections });
  };

  const formatContentToHtml = (doc) => {
    if (!doc) return "";

    if (doc.sections && doc.sections.length > 0) {
      return doc.sections
        .map((sec) => {
          const headingHtml = sec.heading
            ? `<h2 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">${sec.heading}</h2>`
            : "";
          const pArr = sec.paragraphs || [];
          const paragraphsHtml = pArr
            .map((p) => `<p style="margin-bottom: 0.85rem; color: #475569; line-height: 1.65; font-weight: 500; white-space: pre-wrap;">${p}</p>`)
            .join("");
          return headingHtml + paragraphsHtml;
        })
        .join("");
    }

    const content = doc.content || "";
    if (/<[a-z][\s\S]*>/i.test(content)) return content;

    return content
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block;
        if (!trimmed.trim()) return "";

        if (trimmed.startsWith("### ")) {
          return `<h3 style="font-size: 1.05rem; font-weight: 700; color: #111827; margin-top: 1.25rem; margin-bottom: 0.5rem;">${trimmed.replace(/^###\s*/, "")}</h3>`;
        }
        if (trimmed.startsWith("## ")) {
          return `<h2 style="font-size: 1.2rem; font-weight: 800; color: #111827; margin-top: 1.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem;">${trimmed.replace(/^##\s*/, "")}</h2>`;
        }
        if (trimmed.startsWith("# ")) {
          return `<h1 style="font-size: 1.4rem; font-weight: 900; color: #111827; margin-top: 2.25rem; margin-bottom: 1rem;">${trimmed.replace(/^#\s*/, "")}</h1>`;
        }

        return `<p style="margin-bottom: 0.85rem; color: #4b5563; line-height: 1.65; font-weight: 500; white-space: pre-wrap;">${trimmed}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  };

  return (
    <div className="page-section">
      <div className="pg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="pg-title">
            <FileText size={28} style={{ display: "inline-block", marginRight: 8, color: "#f97316" }} />
            Legal & Document Pages
          </h1>
          <p className="pg-sub">Create, structure, and publish multi-heading dynamic legal pages for the website</p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={18} />
          Create New Document Page
        </button>
      </div>

      {legal.length === 0 ? (
        <div className="content-box">
          <div className="empty-state">
            <FileText size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No legal documents found.</p>
            <button className="btn btn-primary" onClick={handleOpenCreate} style={{ marginTop: 12 }}>
              <Plus size={16} /> Create First Document
            </button>
          </div>
        </div>
      ) : (
        <div className="doc-grid">
          {legal.map((doc, i) => (
            <div key={doc._id || i} className="doc-card">
              <div className="doc-card-head">
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{doc.title}</h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                    /{doc.type}
                  </span>
                </div>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => handleOpenView(doc)} title="View Document">
                    <Eye size={16} />
                  </button>
                  <button className="icon-btn edit" onClick={() => handleOpenEdit(doc)} title="Edit Document">
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-btn edit"
                    onClick={() => handleDelete(doc.type)}
                    title="Delete Document"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span
                  onClick={() => handleTogglePublish(doc.type)}
                  className={`badge ${doc.isPublished ? "badge-pub" : "badge-draft"}`}
                  style={{ cursor: "pointer" }}
                  title="Click to toggle publish status"
                >
                  {doc.isPublished ? "✓ Published" : "Draft"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>
                  {doc.sections && doc.sections.length > 0 ? `${doc.sections.length} Sections` : "Text Content"}
                </span>
              </div>

              <p className="doc-excerpt" style={{ marginTop: 8, fontSize: "0.82rem", color: "#64748b" }}>
                {doc.sections && doc.sections.length > 0
                  ? doc.sections.map((s) => s.heading).filter(Boolean).join(" • ")
                  : doc.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDITOR / VIEWER */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-head">
              <h3>
                {mode === "view" ? (
                  <>
                    <Eye size={20} style={{ display: "inline-block", marginRight: 6 }} /> View Document
                  </>
                ) : mode === "create" ? (
                  <>
                    <Plus size={20} style={{ display: "inline-block", marginRight: 6 }} /> Create Document Page
                  </>
                ) : (
                  <>
                    <Edit2 size={20} style={{ display: "inline-block", marginRight: 6 }} /> Edit Document Page
                  </>
                )}
              </h3>
              <button className="modal-close" onClick={() => setSelected(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: "auto", flex: 1, paddingRight: 6 }}>
              {/* Document Meta Information */}
              <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="form-label">Document Title *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Privacy Regulations"
                    value={selected.title || ""}
                    disabled={mode === "view"}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const autoSlug = selected.isNew ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") : selected.type;
                      setSelected({ ...selected, title: newTitle, type: autoSlug });
                    }}
                  />
                </div>

                <div>
                  <label className="form-label">URL Slug / Type *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. privacy-policy or community-rules"
                    value={selected.type || ""}
                    disabled={mode === "view" || !selected.isNew}
                    onChange={(e) => setSelected({ ...selected, type: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "") })}
                  />
                </div>
              </div>

              {mode !== "view" && (
                <div style={{ display: "flex", itemsCenter: "center", justifyContent: "space-between", margin: "12px 0 16px 0", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selected.isPublished !== false}
                      onChange={(e) => setSelected({ ...selected, isPublished: e.target.checked })}
                    />
                    <span>Publish Immediately on Website</span>
                  </label>

                  {/* Mode Switcher */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setEditorTab("sections")}
                      className={`btn ${editorTab === "sections" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    >
                      <Layers size={13} style={{ marginRight: 4 }} /> Section Builder
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("raw")}
                      className={`btn ${editorTab === "raw" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    >
                      <AlignLeft size={13} style={{ marginRight: 4 }} /> Raw Markdown
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW MODE */}
              {mode === "view" ? (
                <div
                  className="form-input"
                  style={{
                    maxHeight: "450px",
                    overflowY: "auto",
                    background: "#f8fafc",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    textAlign: "left"
                  }}
                  dangerouslySetInnerHTML={{ __html: formatContentToHtml(selected) }}
                />
              ) : editorTab === "sections" ? (
                /* SECTION BUILDER MODE */
                <div className="section-builder-container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Document Sections ({selected.sections?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.8rem", color: "#f97316", border: "1px border #fdba74" }}
                    >
                      <Plus size={14} style={{ marginRight: 4 }} /> Add Section Heading
                    </button>
                  </div>

                  {(!selected.sections || selected.sections.length === 0) ? (
                    <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>No sections defined yet.</p>
                      <button type="button" className="btn btn-primary" onClick={handleAddSection} style={{ marginTop: 10, fontSize: "0.8rem" }}>
                        <Plus size={14} /> Add First Section
                      </button>
                    </div>
                  ) : (
                    selected.sections.map((section, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 14,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                        }}
                      >
                        {/* Section Header Input */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, color: "#475569" }}>
                            #{sIdx + 1}
                          </span>
                          <input
                            className="form-input"
                            style={{ fontWeight: 800, fontSize: "0.95rem" }}
                            placeholder="Section Heading Title (e.g. 1. Information Collection)"
                            value={section.heading || ""}
                            onChange={(e) => handleSectionHeadingChange(sIdx, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sIdx)}
                            style={{ background: "#fee2e2", border: "none", color: "#ef4444", padding: "8px", borderRadius: 8, cursor: "pointer" }}
                            title="Remove Section"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Paragraphs under Section */}
                        <div style={{ paddingLeft: 12, borderLeft: "2px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", justifyBetween: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8" }}>
                              Paragraphs ({section.paragraphs?.length || 0})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddParagraph(sIdx)}
                              style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Plus size={12} /> Add Paragraph Block
                            </button>
                          </div>

                          {(section.paragraphs || []).map((paragraph, pIdx) => (
                            <div key={pIdx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <textarea
                                className="form-input"
                                rows={2}
                                style={{ fontSize: "0.85rem", lineHeight: 1.5, resize: "vertical", whiteSpace: "pre-wrap" }}
                                placeholder={`Paragraph #${pIdx + 1} text content...`}
                                value={paragraph}
                                onChange={(e) => handleParagraphChange(sIdx, pIdx, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveParagraph(sIdx, pIdx)}
                                style={{ background: "none", border: "none", color: "#94a3b8", padding: "4px", cursor: "pointer", marginTop: 4 }}
                                title="Remove Paragraph"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* RAW MARKDOWN / TEXT MODE */
                <div className="form-row">
                  <label className="form-label">Raw Text / Markdown Content</label>
                  <textarea
                    className="form-input"
                    rows={14}
                    value={selected.content || ""}
                    style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem", lineHeight: 1.7 }}
                    onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                    placeholder="Enter document raw markdown content..."
                  />
                </div>
              )}
            </div>

            {mode !== "view" && (
              <div className="modal-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {!selected.isNew ? (
                  <button type="button" className="btn" style={{ color: "#ef4444", background: "#fee2e2" }} onClick={() => handleDelete(selected.type)}>
                    <Trash2 size={16} style={{ display: "inline-block", marginRight: 4 }} /> Delete Document
                  </button>
                ) : <div />}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={16} style={{ display: "inline-block", marginRight: 6 }} /> Save Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}