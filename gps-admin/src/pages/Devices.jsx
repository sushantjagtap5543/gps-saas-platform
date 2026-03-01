import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  useEffect(() => { api.get("/devices").then(r => setDevices(r.data)).catch(console.error); }, []);
  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>All Devices</h2>
      <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:"12px", overflow:"hidden" }}>
        <thead><tr style={{ background:"#f1f5f9" }}>
          {["Vehicle","IMEI","Status","Last Seen"].map(h => <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"13px", color:"#64748b" }}>{h}</th>)}
        </tr></thead>
        <tbody>{devices.map(d => (
          <tr key={d.id} style={{ borderTop:"1px solid #f1f5f9" }}>
            <td style={{ padding:"12px 16px" }}>{d.vehicle_number}</td>
            <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:"13px" }}>{d.imei}</td>
            <td style={{ padding:"12px 16px" }}><span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"12px", background:d.status==="online"?"#dcfce7":"#fee2e2", color:d.status==="online"?"#166534":"#991b1b" }}>{d.status}</span></td>
            <td style={{ padding:"12px 16px", color:"#64748b", fontSize:"13px" }}>{d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
