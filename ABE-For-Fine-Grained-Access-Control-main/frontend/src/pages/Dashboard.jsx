import { useState, useEffect } from "react";
import { getDocuments, downloadDocument, deleteDocument } from "../api";
import "./Dashboard.css";

export default function Dashboard({ user }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ id: null, type: "", text: "" });

  const fetchDocs = async () => {
    try {
      const res = await getDocuments();
      setDocs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleDownload = async (doc) => {
    setMsg({ id: doc.id, type: "loading", text: "Decrypting..." });
    try {
      const res = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      setMsg({ id: doc.id, type: "success", text: "Downloaded!" });
    } catch (err) {
      const text = err.response?.data?.error || "Access denied";
      setMsg({ id: doc.id, type: "error", text });
    }
    setTimeout(() => setMsg({ id: null, type: "", text: "" }), 3000);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocs(docs.filter(d => d.id !== doc.id));
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>Documents</h2>
          <p>{docs.length} encrypted file{docs.length !== 1 ? "s" : ""} in vault</p>
        </div>
        <div className="attr-badges">
          {user?.attributes?.map(a => <span key={a} className="tag">{a}</span>)}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading vault...</div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p>No documents yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="doc-table">
          <div className="table-head">
            <span>File</span>
            <span>Policy</span>
            <span>Uploaded By</span>
            <span>Size</span>
            <span>Actions</span>
          </div>
          {docs.map(doc => (
            <div key={doc.id} className="table-row">
              <div className="doc-name">
                <span className="doc-icon">📄</span>
                <span>{doc.filename}</span>
              </div>
              <div className="doc-policy">
                <code>{doc.policy}</code>
              </div>
              <div className="doc-uploader">{doc.uploaded_by}</div>
              <div className="doc-size">{formatSize(doc.size)}</div>
              <div className="doc-actions">
                {msg.id === doc.id ? (
                  <span className={`action-msg ${msg.type}`}>{msg.text}</span>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => handleDownload(doc)}>
                      Download
                    </button>
                    {(user?.is_admin || doc.uploaded_by === user?.username) && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(doc)}>
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
