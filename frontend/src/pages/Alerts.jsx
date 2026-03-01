import { useEffect, useState } from "react";
import api from "../api/axios";
import { socket } from "../socket/socket";

const severityColor = { INFO:"#dbeafe", WARNING:"#fef9c3", CRITICAL:"#fee2e2" };
const severityText  = { INFO:"#1e40af", WARNING:"#854d0e", CRITICAL:"#991b1b" };

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    api.get("/alerts").then(r => setAlerts(r.data)).catch(console.error);
    socket.connect();
    socket.on("alert", (a) => setAlerts(prev => [a, ...prev]));
    return () => { socket.off("alert"); socket.disconnect(); };
  }, []);

  const markRead = async (id) => {
    await api.put("/alerts/" + id + "/read");
    setAlerts(prev => prev.map(a => a.id === id ? {...a, is_read: true} : a));
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Alerts</h2>
      {alerts.length === 0 && <p style={{ color:"#94a3b8" }}>No alerts yet.</p>}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {alerts.map(a => (
          <div key={a.id} style={{ padding:"16px", borderRadius:"10px", background:"#fff", border:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", opacity:a.is_read?0.6:1 }}>
            <div>
              <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:600, background:severityColor[a.severity]||"#f1f5f9", color:severityText[a.severity]||"#1e293b", marginRight:"10px" }}>{a.severity}</span>
              <strong>{a.type}</strong> — {a.message}
              <p style={{ color:"#94a3b8", fontSize:"12px", marginTop:"4px" }}>{new Date(a.createdAt).toLocaleString()}</p>
            </div>
            {!a.is_read && <button onClick={() => markRead(a.id)} style={{ padding:"6px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"#fff", cursor:"pointer", fontSize:"12px" }}>Mark Read</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
