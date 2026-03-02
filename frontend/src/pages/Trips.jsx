import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Trips() {
  const [trips, setTrips]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");

  useEffect(() => {
    api.get("/devices?limit=100").then(r => setDevices(r.data.devices || r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit:20, ...(deviceId&&{device_id:deviceId}), ...(from&&{from}), ...(to&&{to}) });
    api.get("/analytics/trips?" + params).then(r => {
      setTrips(r.data.trips || r.data);
      setTotal(r.data.total || 0);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, deviceId, from, to]);

  const fmt = (sec) => {
    if (!sec) return "—";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const scoreColor = (s) => s >= 80 ? "#15803d" : s >= 60 ? "#d97706" : "#b91c1c";

  return (
    <div>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Trips</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>{total} trips recorded</p>
      </div>

      <div style={{ display:"flex", gap:"12px", marginBottom:"20px", flexWrap:"wrap" }}>
        <select value={deviceId} onChange={e => { setDeviceId(e.target.value); setPage(1); }}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer", minWidth:"200px" }}>
          <option value="">All Vehicles</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.vehicle_number}</option>)}
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px" }} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px" }} />
      </div>

      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Start","End","Distance","Duration","Max Speed","Avg Speed","Driver Score","Harsh Events"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"12px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>Loading…</td></tr>}
            {!loading && trips.map(t => (
              <tr key={t.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                <td style={{ padding:"12px 16px", fontSize:"13px" }}>{new Date(t.start_time).toLocaleString()}</td>
                <td style={{ padding:"12px 16px", fontSize:"13px", color:"#64748b" }}>{t.end_time ? new Date(t.end_time).toLocaleString() : <span style={{ color:"#3b82f6" }}>In Progress</span>}</td>
                <td style={{ padding:"12px 16px", fontWeight:600 }}>{t.distance_km?.toFixed(1)} km</td>
                <td style={{ padding:"12px 16px" }}>{fmt(t.duration_sec)}</td>
                <td style={{ padding:"12px 16px", color: t.max_speed > 100 ? "#b91c1c" : "#1e293b", fontWeight:600 }}>{t.max_speed?.toFixed(0)} km/h</td>
                <td style={{ padding:"12px 16px", color:"#64748b" }}>{t.avg_speed?.toFixed(0)} km/h</td>
                <td style={{ padding:"12px 16px" }}>
                  {t.driver_score != null ? (
                    <span style={{ fontWeight:700, color:scoreColor(t.driver_score), fontSize:"15px" }}>{t.driver_score?.toFixed(0)}</span>
                  ) : "—"}
                </td>
                <td style={{ padding:"12px 16px", fontSize:"13px" }}>
                  {t.harsh_brakes > 0 && <span style={{ background:"#fee2e2", color:"#b91c1c", padding:"2px 6px", borderRadius:"4px", fontSize:"11px", marginRight:"4px" }}>⚡ {t.harsh_brakes} brakes</span>}
                  {t.harsh_accel > 0 && <span style={{ background:"#fef9c3", color:"#854d0e", padding:"2px 6px", borderRadius:"4px", fontSize:"11px" }}>🚀 {t.harsh_accel} accel</span>}
                  {!t.harsh_brakes && !t.harsh_accel && <span style={{ color:"#94a3b8" }}>—</span>}
                </td>
              </tr>
            ))}
            {!loading && !trips.length && <tr><td colSpan={8} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No trips found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
