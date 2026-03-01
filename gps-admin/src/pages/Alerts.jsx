import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Alerts() {

  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.get("/alerts").then(res => setAlerts(res.data));
  }, []);

  return (
    <div>
      <h2>Alerts</h2>
      <ul>
        {alerts.map(a => (
          <li key={a.id}>
            {a.type} - {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}