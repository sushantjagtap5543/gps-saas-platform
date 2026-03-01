import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => { api.get("/alerts").then(r => setAlerts(r.data)).catch(console.error); }, []);
  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>All Alerts</h2>
      {alerts.map(a => (
        <div key={a.id} style={{ padding:"14px 20px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", marginBottom:"8px" }}>
          <strong>{a.type}</strong> — {a.message} <span style={{ color:"#94a3b8", fontSize:"12px" }}>({new Date(a.createdAt).toLocaleString()})</span>
        </div>
      ))}
      {!alerts.length && <p style={{ color:"#94a3b8" }}>No alerts.</p>}
    </div>
  );
}
