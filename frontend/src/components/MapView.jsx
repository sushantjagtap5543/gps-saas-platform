import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView({ vehicles = [], center = [19.076, 72.877], zoom = 11 }) {
  const c = vehicles.length > 0 ? [vehicles[0].latitude, vehicles[0].longitude] : center;
  return (
    <MapContainer center={c} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {vehicles.map(v => v.latitude && v.longitude && (
        <Marker key={v.device_id || v.id} position={[v.latitude, v.longitude]}>
          <Popup>
            <strong>{v.vehicle_number || v.imei}</strong><br/>
            Speed: {v.speed || 0} km/h<br/>
            {v.last_seen && <>Last seen: {new Date(v.last_seen).toLocaleTimeString()}</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
