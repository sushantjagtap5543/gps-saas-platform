import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import socket from "../socket";

export default function MapView() {

  const [devices, setDevices] = useState([]);

  useEffect(() => {
    socket.on("location_update", (data) => {
      setDevices((prev) => {
        const filtered = prev.filter(d => d.device_id !== data.device_id);
        return [...filtered, data];
      });
    });
  }, []);

  return (
    <MapContainer center={[19.0760, 72.8777]} zoom={10} style={{ height: "600px" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices.map(d => (
        <Marker key={d.device_id} position={[d.latitude, d.longitude]}>
          <Popup>Speed: {d.speed}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}