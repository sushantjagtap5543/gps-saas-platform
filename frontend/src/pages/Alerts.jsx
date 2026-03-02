import { useEffect, useState } from "react";
import api from "../api/axios";

const SCOLOR = { WARNING:"#f59e0b", CRITICAL:"#dc2626", INFO:"#3b82f6" };

export default function Alerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/alerts").then(r => setAlerts(r.data)).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.put(`/alerts/${id}/read`).catch(console.error);
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Alerts</h2>
      {loading ? <p>Loading…</p> : !alerts.length ? (
        <p style={{ color:"#94a3b8" }}>No alerts</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background: a.is_read?"#f8fafc":"#fff", border:"1px solid #e2e8f0", borderLeft:`4px solid ${SCOLOR[a.severity]||"#94a3b8"}`, borderRadius:"8px", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px" }}>
                  <span style={{ fontWeight:700, color:SCOLOR[a.severity]||"#64748b", fontSize:"12px" }}>{a.severity}</span>
                  <span style={{ fontWeight:600, fontSize:"14px" }}>{a.type}</span>
                  {a.device && <span style={{ color:"#64748b", fontSize:"12px" }}>— {a.device.vehicle_number}</span>}
                </div>
                <p style={{ color:"#475569", fontSize:"13px", margin:0 }}>{a.message}</p>
                <p style={{ color:"#94a3b8", fontSize:"11px", margin:"4px 0 0" }}>{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              {!a.is_read && (
                <button onClick={() => markRead(a.id)} style={{ padding:"5px 12px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" }}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
