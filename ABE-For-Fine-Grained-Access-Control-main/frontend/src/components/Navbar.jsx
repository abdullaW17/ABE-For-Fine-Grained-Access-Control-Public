import { useState } from "react";
import { changePassword } from "../api";
import "./Navbar.css";

export default function Navbar({ user, onLogout, currentPage, setCurrentPage }) {
  const [showModal, setShowModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    if (pwForm.new_password !== pwForm.confirm) {
      return setPwMsg({ type: "error", text: "Passwords do not match" });
    }
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwMsg({ type: "success", text: "Password changed successfully" });
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.error || "Failed" });
    }
  };

  const navItems = [
    { id: "dashboard", label: "Documents" },
    { id: "upload", label: "Upload" },
    ...(user?.is_admin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>ABE Vault</span>
        </div>

        <div className="nav-links">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-link ${currentPage === item.id ? "active" : ""}`}
              onClick={() => setCurrentPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-user" onClick={() => setShowModal(true)}>
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.is_admin ? "Admin" : "User"}</span>
            </div>
          </div>
          <button className="btn btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="user-attrs">
              <p className="attrs-label">Your Attributes</p>
              <div className="attrs-list">
                {user?.attributes?.map(a => <span key={a} className="tag">{a}</span>)}
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="pw-form">
              {pwMsg.text && (
                <div className={`alert alert-${pwMsg.type === "error" ? "error" : "success"}`}>
                  {pwMsg.text}
                </div>
              )}
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={pwForm.current_password}
                  onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={pwForm.new_password}
                  onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary">Update Password</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
