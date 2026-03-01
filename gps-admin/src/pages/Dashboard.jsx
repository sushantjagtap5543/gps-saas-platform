import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const Stat = ({ label, value, color, to }) => (
  <Link to={to} style={{ textDecoration:"none" }}>
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"12px", padding:"24px", cursor:"pointer" }}>
      <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"8px" }}>{label}</p>
      <p style={{ fontSize:"36px", fontWeight:"bold", color }}>{value ?? "–"}</p>
    </div>
  </Link>
);

export default function Dashboard() {
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding:"24px", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9" }}>
      <h2 style={{ marginBottom:"24px", fontSize:"20px" }}>Admin Dashboard</h2>
      {loading ? (
        <p style={{ color:"#64748b" }}>Loading stats…</p>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"16px" }}>
          <Stat label="Total Users"       value={stats.users}      color="#60a5fa" to="/users" />
          <Stat label="Total Devices"     value={stats.devices}    color="#34d399" to="/devices" />
          <Stat label="Active Subscriptions" value={stats.activeSubs} color="#a78bfa" to="/billing" />
        </div>
      )}
    </div>
  );
}
