export default function DeviceTable({ devices }) {
  return (
    <table border="1">
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
  );
}