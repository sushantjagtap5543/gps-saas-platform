import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/",          label: "Dashboard" },
  { to: "/tracking",  label: "Live Tracking" },
  { to: "/alerts",    label: "Alerts" },
  { to: "/geofences", label: "Geofences" },
  { to: "/billing",   label: "Billing" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 24px", height:"56px", background:"#0f172a", color:"#fff", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", gap:"24px", alignItems:"center" }}>
        <span style={{ fontWeight:"bold", fontSize:"16px" }}>🛰️ GPS SaaS</span>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{ color: location.pathname === l.to ? "#60a5fa" : "#94a3b8", textDecoration:"none", fontSize:"14px" }}>{l.label}</Link>
        ))}
      </div>
      <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
        <span style={{ color:"#64748b", fontSize:"13px" }}>{user?.email || user?.name}</span>
        <button onClick={() => { logout(); navigate("/login"); }} style={{ padding:"6px 14px", background:"#ef4444", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"13px" }}>Logout</button>
      </div>
    </nav>
  );
}
