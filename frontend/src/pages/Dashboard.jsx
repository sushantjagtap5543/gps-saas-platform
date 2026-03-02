import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const KPI = ({ label, value, icon, color, sub }) => (
  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px 24px", flex:"1", minWidth:"180px", borderTop:`3px solid ${color}` }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <p style={{ color:"#64748b", fontSize:"12px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>{label}</p>
        <p style={{ fontSize:"32px", fontWeight:700, color:"#1e293b", lineHeight:1 }}>{value}</p>
        {sub && <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"6px" }}>{sub}</p>}
      </div>
      <div style={{ fontSize:"28px", opacity:0.8 }}>{icon}</div>
    </div>
  </div>
);

const AlertBadge = ({ severity }) => {
  const map = { CRITICAL: ["#fef2f2","#dc2626"], WARNING: ["#fffbeb","#d97706"], INFO: ["#eff6ff","#3b82f6"] };
  const [bg, color] = map[severity] || map.INFO;
  return <span style={{ background:bg, color, padding:"2px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:600 }}>{severity}</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = ["ADMIN","SUPER_ADMIN","RESELLER"].includes(user?.role);
    Promise.all([
      isAdmin ? api.get("/admin/stats") : Promise.resolve({ data: null }),
      api.get("/devices?limit=10"),
      api.get("/alerts/events?limit=5")
    ]).then(([s, d, a]) => {
      setStats(s.data);
      setDevices(d.data.devices || d.data);
      setAlerts(a.data.alerts || a.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px", color:"#64748b" }}>Loading dashboard…</div>;

  const online  = devices.filter(d => d.status === "ONLINE").length;
  const offline = devices.filter(d => d.status !== "ONLINE").length;

  return (
    <div>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Fleet Dashboard</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>Real-time overview of your fleet</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"flex", gap:"16px", marginBottom:"28px", flexWrap:"wrap" }}>
        <KPI label="Total Vehicles" value={devices.length} icon="🚗" color="#3b82f6" />
        <KPI label="Online Now"     value={online}          icon="🟢" color="#22c55e" sub="Active & reporting" />
        <KPI label="Offline"        value={offline}         icon="🔴" color="#ef4444" sub="Check connectivity" />
        {stats && <>
          <KPI label="Total Clients"     value={stats.totalClients}    icon="👥" color="#8b5cf6" />
          <KPI label="Alerts Today"      value={stats.alertsToday}     icon="🔔" color="#f59e0b" />
          <KPI label="Expiring Soon"     value={stats.expiringSoon}    icon="⏰" color="#f97316" sub="in 7 days" />
        </>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
        {/* Device Table */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", fontWeight:600, color:"#1e293b", fontSize:"15px" }}>
            🚗 Fleet Status
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["Vehicle","IMEI","Status","Last Seen"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:"12px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.slice(0,8).map(d => (
                <tr key={d.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"10px 16px", fontSize:"14px", fontWeight:500 }}>{d.vehicle_number}</td>
                  <td style={{ padding:"10px 16px", fontFamily:"monospace", fontSize:"12px", color:"#64748b" }}>{d.imei}</td>
                  <td style={{ padding:"10px 16px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:700,
                      background: d.status==="ONLINE"?"#dcfce7": d.status==="OFFLINE"?"#fee2e2":"#fef9c3",
                      color:      d.status==="ONLINE"?"#15803d": d.status==="OFFLINE"?"#b91c1c":"#854d0e" }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding:"10px 16px", fontSize:"12px", color:"#94a3b8" }}>
                    {d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))}
              {!devices.length && <tr><td colSpan={4} style={{ padding:"32px", textAlign:"center", color:"#94a3b8" }}>No devices registered</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Recent Alerts */}
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", fontWeight:600, color:"#1e293b", fontSize:"15px" }}>
            🔔 Recent Alerts
          </div>
          <div style={{ padding:"8px 0" }}>
            {alerts.length === 0 && (
              <div style={{ padding:"32px", textAlign:"center", color:"#94a3b8" }}>No recent alerts 🎉</div>
            )}
            {alerts.map(a => (
              <div key={a.id} style={{ padding:"12px 20px", borderBottom:"1px solid #f8fafc", display:"flex", alignItems:"flex-start", gap:"12px" }}>
                <span style={{ fontSize:"20px" }}>
                  {a.severity === "CRITICAL" ? "🚨" : a.severity === "WARNING" ? "⚠️" : "ℹ️"}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"14px", fontWeight:600, color:"#1e293b" }}>{a.title || a.type}</span>
                    <AlertBadge severity={a.severity} />
                  </div>
                  <p style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>{a.message}</p>
                  <p style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
