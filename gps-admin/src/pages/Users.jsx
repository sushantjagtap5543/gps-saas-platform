import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/admin/users").then(r => setUsers(r.data)).catch(console.error); }, []);

  const toggle = async (id, is_active) => {
    await api.put("/admin/users/" + id + "/active", { is_active: !is_active });
    setUsers(prev => prev.map(u => u.id === id ? {...u, is_active: !is_active} : u));
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>User Management</h2>
      <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff", borderRadius:"12px", overflow:"hidden" }}>
        <thead><tr style={{ background:"#f1f5f9" }}>
          {["Name","Email","Role","Status","Action"].map(h => <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"13px", color:"#64748b" }}>{h}</th>)}
        </tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.id} style={{ borderTop:"1px solid #f1f5f9" }}>
            <td style={{ padding:"12px 16px" }}>{u.name}</td>
            <td style={{ padding:"12px 16px", fontSize:"13px" }}>{u.email}</td>
            <td style={{ padding:"12px 16px" }}><span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"12px", background:"#e0e7ff", color:"#3730a3" }}>{u.role}</span></td>
            <td style={{ padding:"12px 16px" }}><span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"12px", background:u.is_active?"#dcfce7":"#fee2e2", color:u.is_active?"#166534":"#991b1b" }}>{u.is_active?"Active":"Inactive"}</span></td>
            <td style={{ padding:"12px 16px" }}><button onClick={() => toggle(u.id, u.is_active)} style={{ padding:"5px 12px", background:u.is_active?"#ef4444":"#16a34a", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px" }}>{u.is_active?"Disable":"Enable"}</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
