import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import MapView from "../components/MapView";

export default function LiveTracking() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    socket.emit("join", "USER_ID");

    socket.on("location_update", (data) => {
      setVehicles(prev => [...prev.filter(v => v.device_id !== data.device_id), data]);
    });
  }, []);

  return <MapView vehicles={vehicles} />;
}