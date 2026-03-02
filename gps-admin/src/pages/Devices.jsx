import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/devices").then(r => setDevices(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const TH = s => <th style={{ padding:"10px 14px", textAlign:"left", color:"#94a3b8", fontSize:"12px", fontWeight:600 }}>{s}</th>;

  return (
    <div style={{ padding:"24px", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9" }}>
      <h2 style={{ marginBottom:"20px" }}>All Devices</h2>
      {loading ? <p style={{ color:"#64748b" }}>Loading…</p> : (
        <div style={{ background:"#1e293b", borderRadius:"12px", overflow:"hidden", border:"1px solid #334155" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead style={{ background:"#0f172a" }}>
              <tr>{["Vehicle","IMEI","Status","Last Seen","Owner"].map(TH)}</tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} style={{ borderTop:"1px solid #1e293b" }}>
                  <td style={{ padding:"12px 14px" }}>{d.vehicle_number}</td>
                  <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:"13px", color:"#94a3b8" }}>{d.imei}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:700,
                      background: d.status==="online"?"#0e4429":"#450a0a",
                      color: d.status==="online"?"#4ade80":"#f87171" }}>{d.status}</span>
                  </td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"13px" }}>{d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}</td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"13px" }}>{d.owner?.email || d.tenant_id?.slice(0,8)+"…"}</td>
                </tr>
              ))}
              {!devices.length && <tr><td colSpan={5} style={{ padding:"32px", textAlign:"center", color:"#475569" }}>No devices</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
