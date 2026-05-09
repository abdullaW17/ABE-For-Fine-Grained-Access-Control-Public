import { useState, useEffect } from "react";
import { getMe } from "./api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPage("dashboard");
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text2)" }}>
      Initializing ABE Vault...
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} currentPage={page} setCurrentPage={setPage} />
      <main>
        {page === "dashboard" && <Dashboard user={user} />}
        {page === "upload" && <Upload />}
        {page === "admin" && user.is_admin && <Admin />}
      </main>
    </div>
  );
}
