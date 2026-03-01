import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import api from "../api/axios";
import MapView from "../components/MapView";

export default function LiveTracking() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    api.get("/devices").then(r => {
      setVehicles(r.data.filter(d => d.GpsLive).map(d => ({ ...d.GpsLive, vehicle_number: d.vehicle_number, imei: d.imei, status: d.status, last_seen: d.last_seen })));
    }).catch(console.error);

    socket.connect();
    socket.on("location_update", (data) => {
      setVehicles(prev => [...prev.filter(v => v.device_id !== data.device_id), data]);
    });

    return () => { socket.off("location_update"); socket.disconnect(); };
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 56px)" }}>
      <div style={{ padding:"12px 24px", background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        <span style={{ fontWeight:600 }}>Live Tracking — </span>
        <span style={{ color:"#64748b" }}>{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} active</span>
      </div>
      <div style={{ flex:1 }}>
        <MapView vehicles={vehicles} />
      </div>
    </div>
  );
}
