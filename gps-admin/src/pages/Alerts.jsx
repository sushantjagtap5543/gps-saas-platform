import { useEffect, useState } from "react";
import api from "../api/axios";

const SCOLOR = { WARNING:"#f59e0b", CRITICAL:"#ef4444", INFO:"#3b82f6" };

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/alerts").then(r => setAlerts(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const TH = s => <th style={{ padding:"10px 14px", textAlign:"left", color:"#94a3b8", fontSize:"12px", fontWeight:600 }}>{s}</th>;

  return (
    <div style={{ padding:"24px", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9" }}>
      <h2 style={{ marginBottom:"20px" }}>All Alerts</h2>
      {loading ? <p style={{ color:"#64748b" }}>Loading…</p> : (
        <div style={{ background:"#1e293b", borderRadius:"12px", overflow:"hidden", border:"1px solid #334155" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead style={{ background:"#0f172a" }}>
              <tr>{["Severity","Type","Message","Device","Time"].map(TH)}</tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} style={{ borderTop:"1px solid #1e293b" }}>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ color: SCOLOR[a.severity]||"#94a3b8", fontWeight:700, fontSize:"12px" }}>{a.severity}</span>
                  </td>
                  <td style={{ padding:"12px 14px", fontSize:"13px" }}>{a.type}</td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"13px" }}>{a.message}</td>
                  <td style={{ padding:"12px 14px", fontSize:"13px" }}>{a.device?.vehicle_number || "–"}</td>
                  <td style={{ padding:"12px 14px", color:"#64748b", fontSize:"12px" }}>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!alerts.length && <tr><td colSpan={5} style={{ padding:"32px", textAlign:"center", color:"#475569" }}>No alerts</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
