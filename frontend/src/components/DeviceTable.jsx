import { useEffect, useState } from "react";
import api from "../api/axios";
import DeviceTable from "../components/DeviceTable";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    api.get("/devices").then(res => setDevices(res.data));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <DeviceTable devices={devices} />
    </div>
  );
}