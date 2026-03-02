import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Navbar() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get("/alerts/unread-count").then(r => setUnread(r.data.count)).catch(() => {});
    const interval = setInterval(() => {
      api.get("/alerts/unread-count").then(r => setUnread(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: "14px", color: "#64748b" }}>
        <span style={{ color: "#1e293b", fontWeight: 600 }}>GPS Tracking Platform</span>
        <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
        <span>Welcome, {user?.name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: "20px", cursor: "pointer" }}>🔔</span>
          {unread > 0 && (
            <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        <div style={{ fontSize: "13px", background: "#f1f5f9", padding: "4px 12px", borderRadius: "20px", color: "#475569" }}>
          {user?.role}
        </div>
      </div>
    </header>
  );
}
