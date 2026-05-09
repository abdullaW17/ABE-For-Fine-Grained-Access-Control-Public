import { useState } from "react";
import { uploadDocument } from "../api";
import "./Upload.css";

const PRESET_POLICIES = [
  { label: "HR Level 3+", value: "((HR and LEVEL3) or ADMIN)" },
  { label: "Finance Level 3+", value: "((FINANCE and LEVEL3) or ADMIN)" },
  { label: "HR or Finance", value: "((HR or FINANCE) and LEVEL3) or ADMIN" },
  { label: "Admin Only", value: "ADMIN" },
];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [policy, setPolicy] = useState("");
  const [customPolicy, setCustomPolicy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !policy.trim()) return;
    setLoading(true);
    setStatus({ type: "", text: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadDocument(formData, policy.trim());
      setStatus({ type: "success", text: `"${res.data.document.filename}" encrypted and uploaded successfully.` });
      setFile(null);
      setPolicy("");
    } catch (err) {
      setStatus({ type: "error", text: err.response?.data?.error || "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h2>Upload Document</h2>
        <p>File will be encrypted under your chosen access policy using CP-ABE</p>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {status.text && (
          <div className={`alert alert-${status.type === "error" ? "error" : "success"}`}>
            {status.text}
          </div>
        )}

        {/* File Drop Zone */}
        <div
          className={`drop-zone ${drag ? "drag-over" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input").click()}
        >
          <input
            id="file-input"
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files[0])}
          />
          {file ? (
            <div className="file-selected">
              <span className="file-icon">📄</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              <button type="button" className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
            </div>
          ) : (
            <div className="drop-hint">
              <span className="drop-icon">⬆</span>
              <span>Drop file here or click to browse</span>
              <span className="drop-sub">Any file type supported</span>
            </div>
          )}
        </div>

        {/* Policy Selection */}
        <div className="policy-section">
          <div className="policy-header">
            <label>Access Policy</label>
            <button type="button" className="toggle-custom" onClick={() => setCustomPolicy(!customPolicy)}>
              {customPolicy ? "Use Preset" : "Custom Policy"}
            </button>
          </div>

          {customPolicy ? (
            <div className="form-group">
              <input
                type="text"
                placeholder="e.g. ((HR and LEVEL3) or ADMIN)"
                value={policy}
                onChange={e => setPolicy(e.target.value)}
              />
              <span className="policy-hint">Use AND, OR operators with attribute names (no underscores)</span>
            </div>
          ) : (
            <div className="preset-grid">
              {PRESET_POLICIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`preset-btn ${policy === p.value ? "selected" : ""}`}
                  onClick={() => setPolicy(p.value)}
                >
                  <span className="preset-label">{p.label}</span>
                  <code className="preset-policy">{p.value}</code>
                </button>
              ))}
            </div>
          )}
        </div>

        {policy && (
          <div className="policy-preview">
            <span className="preview-label">Active Policy:</span>
            <code>{policy}</code>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary upload-btn"
          disabled={!file || !policy.trim() || loading}
        >
          {loading ? "Encrypting & Uploading..." : "Encrypt & Upload →"}
        </button>
      </form>
    </div>
  );
}
