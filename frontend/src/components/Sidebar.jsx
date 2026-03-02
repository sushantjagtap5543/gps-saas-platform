import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MENU = [
  { path: "/",            icon: "🏠", label: "Dashboard" },
  { path: "/tracking",    icon: "📡", label: "Live Tracking" },
  { path: "/devices",     icon: "📟", label: "Devices" },
  { path: "/trips",       icon: "🚗", label: "Trips" },
  { path: "/alerts",      icon: "🔔", label: "Alerts" },
  { path: "/geofences",   icon: "🗺️", label: "Geofences" },
  { path: "/driver-score",icon: "⭐", label: "Driver Scores" },
  { path: "/reports",     icon: "📊", label: "Reports" },
  { path: "/billing",     icon: "💳", label: "Billing" },
  { path: "/support",     icon: "🎫", label: "Support" },
  { path: "/settings",    icon: "⚙️", label: "Settings" },
];

const ADMIN_MENU = [
  { path: "/users",       icon: "👥", label: "Users" },
  { path: "/device-test", icon: "🧪", label: "Device Tester" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && ["ADMIN","SUPER_ADMIN","RESELLER"].includes(user.role);

  const style = {
    sidebar:  { width: "240px", minHeight: "100vh", background: "#1e293b", color: "#e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 },
    logo:     { padding: "20px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "10px" },
    logoText: { fontWeight: 700, fontSize: "18px", color: "#fff" },
    logoSub:  { fontSize: "11px", color: "#64748b" },
    nav:      { flex: 1, padding: "12px 0", overflowY: "auto" },
    section:  { padding: "8px 16px 4px", fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" },
    item:     { display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", textDecoration: "none", color: "#94a3b8", fontSize: "14px", transition: "all 0.15s", cursor: "pointer" },
    itemActive:{ background: "#3b82f6", color: "#fff", borderRadius: "0" },
    footer:   { padding: "16px", borderTop: "1px solid #334155" },
    avatar:   { width: "36px", height: "36px", background: "#3b82f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", color: "#fff" },
    userInfo: { flex: 1, marginLeft: "10px" },
    userName: { fontSize: "13px", fontWeight: 600, color: "#e2e8f0" },
    userRole: { fontSize: "11px", color: "#64748b" }
  };

  return (
    <div style={style.sidebar}>
      <div style={style.logo}>
        <div style={{ fontSize: "24px" }}>🛰️</div>
        <div>
          <div style={style.logoText}>GPS Tracker</div>
          <div style={style.logoSub}>Fleet Management</div>
        </div>
      </div>

      <nav style={style.nav}>
        <div style={style.section}>Main</div>
        {MENU.map(m => (
          <NavLink key={m.path} to={m.path} end={m.path === "/"}
            style={({ isActive }) => ({ ...style.item, ...(isActive ? style.itemActive : {}) })}>
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{ ...style.section, marginTop: "12px" }}>Admin</div>
            {ADMIN_MENU.map(m => (
              <NavLink key={m.path} to={m.path}
                style={({ isActive }) => ({ ...style.item, ...(isActive ? style.itemActive : {}) })}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div style={style.footer}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={style.avatar}>{user?.name?.[0]?.toUpperCase() || "U"}</div>
          <div style={style.userInfo}>
            <div style={style.userName}>{user?.name}</div>
            <div style={style.userRole}>{user?.role}</div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "18px", padding: "4px" }}
            title="Logout">⏻</button>
        </div>
      </div>
    </div>
  );
}
