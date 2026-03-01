import { useEffect, useState } from "react";
import api from "../api/axios";

const Card = ({ label, value, color }) => (
  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", flex:1 }}>
    <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"8px" }}>{label}</p>
    <p style={{ fontSize:"32px", fontWeight:"bold", color }}>{value}</p>
  </div>
);

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/devices").then(r => setDevices(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const online  = devices.filter(d => d.status === "online").length;
  const offline = devices.filter(d => d.status !== "online").length;

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Fleet Dashboard</h2>
      <div style={{ display:"flex", gap:"16px", marginBottom:"28px", flexWrap:"wrap" }}>
        <Card label="Total Devices" value={devices.length} color="#1e293b" />
        <Card label="Online"        value={online}          color="#16a34a" />
        <Card label="Offline"       value={offline}         color="#dc2626" />
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:"12px", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <thead>
            <tr style={{ background:"#f1f5f9" }}>
              {["Vehicle","IMEI","Status","Last Seen"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"13px", color:"#64748b", fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                <td style={{ padding:"12px 16px" }}>{d.vehicle_number}</td>
                <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:"13px" }}>{d.imei}</td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:600, background:d.status==="online"?"#dcfce7":"#fee2e2", color:d.status==="online"?"#166534":"#991b1b" }}>{d.status}</span>
                </td>
                <td style={{ padding:"12px 16px", color:"#64748b", fontSize:"13px" }}>{d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}</td>
              </tr>
            ))}
            {!devices.length && <tr><td colSpan={4} style={{ padding:"32px", textAlign:"center", color:"#94a3b8" }}>No devices registered yet</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
