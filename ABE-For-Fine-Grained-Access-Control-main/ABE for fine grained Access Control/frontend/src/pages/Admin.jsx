import { useState, useEffect } from "react";
import { getUsers, createUser, updateAttributes, deleteUser, getStats } from "../api";
import "./Admin.css";

const AVAILABLE_ATTRS = ["HR", "FINANCE", "IT", "LEGAL", "MANAGEMENT", "LEVEL1", "LEVEL2", "LEVEL3", "NUCES", "ADMIN"];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", attributes: [] });
  const [msg, setMsg] = useState({ type: "", text: "" });

  const fetchData = async () => {
    const [u, s] = await Promise.all([getUsers(), getStats()]);
    setUsers(u.data);
    setStats(s.data);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleAttr = (attr, current, setter) => {
    setter(prev => ({
      ...prev,
      attributes: prev.attributes.includes(attr)
        ? prev.attributes.filter(a => a !== attr)
        : [...prev.attributes, attr]
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    try {
      await createUser(form);
      setMsg({ type: "success", text: `User "${form.username}" created successfully.` });
      setForm({ username: "", password: "", attributes: [] });
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to create user" });
    }
  };

  const handleUpdateAttrs = async (userId, attributes) => {
    try {
      await updateAttributes(userId, { attributes });
      setMsg({ type: "success", text: "Attributes updated and new ABE key issued." });
      setEditUser(null);
      fetchData();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed" });
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p>Manage users and attribute-based keys</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New User"}
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{stats.total_users || 0}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.total_documents || 0}</span>
          <span className="stat-label">Documents</span>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === "error" ? "error" : "success"}`}>
          {msg.text}
        </div>
      )}

      {showCreate && (
        <div className="card create-form">
          <h3>Create New User</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label>Attributes (select all that apply)</label>
              <div className="attr-picker">
                {AVAILABLE_ATTRS.map(a => (
                  <button
                    key={a} type="button"
                    className={`attr-btn ${form.attributes.includes(a) ? "selected" : ""}`}
                    onClick={() => setForm(prev => ({
                      ...prev,
                      attributes: prev.attributes.includes(a)
                        ? prev.attributes.filter(x => x !== a)
                        : [...prev.attributes, a]
                    }))}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create User & Issue Key</button>
          </form>
        </div>
      )}

      <div className="users-table card">
        <div className="table-head">
          <span>Username</span>
          <span>Attributes</span>
          <span>Role</span>
          <span>Actions</span>
        </div>
        {users.map(u => (
          <div key={u.id} className="table-row">
            <div className="user-col">{u.username}</div>
            <div className="attrs-col">
              {editUser?.id === u.id ? (
                <div className="attr-picker small">
                  {AVAILABLE_ATTRS.map(a => (
                    <button
                      key={a} type="button"
                      className={`attr-btn ${editUser.attributes.includes(a) ? "selected" : ""}`}
                      onClick={() => setEditUser(prev => ({
                        ...prev,
                        attributes: prev.attributes.includes(a)
                          ? prev.attributes.filter(x => x !== a)
                          : [...prev.attributes, a]
                      }))}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tag-row">
                  {u.attributes.map(a => <span key={a} className="tag">{a}</span>)}
                </div>
              )}
            </div>
            <div>
              <span className={`tag ${u.is_admin ? "tag-success" : ""}`}>
                {u.is_admin ? "Admin" : "User"}
              </span>
            </div>
            <div className="action-col">
              {editUser?.id === u.id ? (
                <>
                  <button className="btn btn-sm btn-primary" onClick={() => handleUpdateAttrs(u.id, editUser.attributes)}>Save</button>
                  <button className="btn btn-sm" onClick={() => setEditUser(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn-sm" onClick={() => setEditUser({ ...u })}>Edit</button>
                  {!u.is_admin && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
