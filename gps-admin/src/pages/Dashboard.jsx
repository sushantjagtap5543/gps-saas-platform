import { useEffect, useState } from "react";
import api from "../api/axios";
import MapView from "../components/MapView";
import socket from "../socket";

export default function Dashboard() {
  const [stats, setStats] = useState({ users:0, devices:0, activeSubs:0 });
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(console.error);
    api.get("/devices").then(r => {
      setVehicles(r.data.filter(d => d.GpsLive).map(d => ({ ...d.GpsLive, vehicle_number: d.vehicle_number, imei: d.imei })));
    }).catch(console.error);
    socket.connect();
    socket.on("location_update", data => setVehicles(prev => [...prev.filter(v => v.device_id !== data.device_id), data]));
    return () => { socket.off("location_update"); socket.disconnect(); };
  }, []);

  const cards = [["Total Users", stats.users, "#3b82f6"], ["Total Devices", stats.devices, "#8b5cf6"], ["Active Subs", stats.activeSubs, "#16a34a"]];

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Admin Dashboard</h2>
      <div style={{ display:"flex", gap:"16px", marginBottom:"24px" }}>
        {cards.map(([l, v, c]) => (
          <div key={l} style={{ flex:1, background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px" }}>
            <p style={{ color:"#64748b", fontSize:"13px" }}>{l}</p>
            <p style={{ fontSize:"32px", fontWeight:"bold", color:c }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ height:"500px", borderRadius:"12px", overflow:"hidden", border:"1px solid #e2e8f0" }}>
        <MapView vehicles={vehicles} />
      </div>
    </div>
  );
}
