import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Devices() {

  const [devices, setDevices] = useState([]);

  useEffect(() => {
    api.get("/devices").then(res => setDevices(res.data));
  }, []);

  return (
    <div>
      <h2>Devices</h2>
      <table>
        <thead>
          <tr>
            <th>IMEI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => (
            <tr key={d.id}>
              <td>{d.imei}</td>
              <td>{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}