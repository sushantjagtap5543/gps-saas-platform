import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("7");
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    api.get("/devices?limit=100").then(r => setDevices(r.data.devices || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/analytics/fleet-summary?days=" + days)
      .then(r => setSummary(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const t = summary?.totals;

  const exportCSV = () => {
    if (!summary?.daily) return;
    const rows = summary.daily.map(d => [d.date, d.trip_count, d.trip_distance?.toFixed(1), d.idle_time, d.max_speed, d.avg_speed, d.harsh_brake_count, d.harsh_acceleration_count, d.overspeed_count, d.driver_score?.toFixed(0)]);
    const csv = [["Date","Trips","Distance(km)","Idle(sec)","MaxSpeed","AvgSpeed","HarshBrakes","HarshAccel","Overspeed","DriverScore"], ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fleet-report-${days}days.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <div>
          <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Fleet Reports</h1>
          <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>Analytics & exportable reports</p>
        </div>
        <div style={{ display:"flex", gap:"12px" }}>
          <select value={days} onChange={e => setDays(e.target.value)}
            style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={exportCSV}
            style={{ background:"#22c55e", color:"#fff", border:"none", padding:"9px 18px", borderRadius:"8px", cursor:"pointer", fontWeight:600, fontSize:"14px" }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8" }}>Loading…</div> : (
        <>
          {/* Summary Cards */}
          {t && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"16px", marginBottom:"28px" }}>
              {[
                { label:"Total Distance", value:`${t.distance?.toFixed(1)} km`, icon:"📏", color:"#3b82f6" },
                { label:"Total Trips",    value:t.trips,                          icon:"🚗", color:"#8b5cf6" },
                { label:"Total Idle",     value:`${Math.round(t.idle/3600)}h`,   icon:"⏱️", color:"#f59e0b" },
                { label:"Fuel Consumed",  value:`${t.fuel?.toFixed(1) || 0} L`,  icon:"⛽", color:"#22c55e" },
                { label:"Harsh Brakes",   value:t.harshBrakes,                   icon:"🛑", color:"#ef4444" },
                { label:"Harsh Accel",    value:t.harshAccel,                    icon:"🚀", color:"#f97316" }
              ].map(c => (
                <div key={c.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", borderTop:`3px solid ${c.color}` }}>
                  <div style={{ fontSize:"24px", marginBottom:"8px" }}>{c.icon}</div>
                  <div style={{ fontSize:"24px", fontWeight:700, color:"#1e293b" }}>{c.value}</div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"4px" }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Daily Table */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", fontWeight:600, fontSize:"15px" }}>Daily Breakdown</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Date","Trips","Distance","Idle","Max Speed","Harsh Brakes","Harsh Accel","Driver Score"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:"11px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(summary?.daily || []).map(d => (
                  <tr key={d.date} style={{ borderTop:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"10px 16px", fontWeight:500 }}>{d.date}</td>
                    <td style={{ padding:"10px 16px" }}>{d.trip_count}</td>
                    <td style={{ padding:"10px 16px" }}>{d.trip_distance?.toFixed(1)} km</td>
                    <td style={{ padding:"10px 16px", color:"#64748b" }}>{Math.round((d.idle_time||0)/60)} min</td>
                    <td style={{ padding:"10px 16px", color: d.max_speed > 100 ? "#b91c1c" : "#1e293b", fontWeight:600 }}>{d.max_speed?.toFixed(0)} km/h</td>
                    <td style={{ padding:"10px 16px", color: d.harsh_brake_count > 5 ? "#b91c1c" : "#1e293b" }}>{d.harsh_brake_count}</td>
                    <td style={{ padding:"10px 16px", color: d.harsh_acceleration_count > 5 ? "#d97706" : "#1e293b" }}>{d.harsh_acceleration_count}</td>
                    <td style={{ padding:"10px 16px" }}>
                      {d.driver_score != null ? (
                        <span style={{ fontWeight:700, color: d.driver_score>=80?"#15803d":d.driver_score>=60?"#d97706":"#b91c1c" }}>
                          {d.driver_score?.toFixed(0)}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {(!summary?.daily?.length) && <tr><td colSpan={8} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No data for this period</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
