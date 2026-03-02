import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Users() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState("");

  const load = () => api.get("/admin/users").then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggle = async (id, active) => {
    try {
      await api.put(`/admin/users/${id}/active`, { is_active: !active });
      setMsg("Updated"); load();
    } catch { setMsg("Failed to update user"); }
  };

  const TH = s => <th style={{ padding:"10px 14px", textAlign:"left", color:"#94a3b8", fontSize:"12px", fontWeight:600 }}>{s}</th>;

  return (
    <div style={{ padding:"24px", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9" }}>
      <h2 style={{ marginBottom:"20px" }}>Users</h2>
      {msg && <div style={{ background:"#1e3a5f", padding:"10px 14px", borderRadius:"8px", marginBottom:"16px", fontSize:"13px" }}>{msg}</div>}
      {loading ? <p style={{ color:"#64748b" }}>Loading…</p> : (
        <div style={{ background:"#1e293b", borderRadius:"12px", overflow:"hidden", border:"1px solid #334155" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead style={{ background:"#0f172a" }}>
              <tr>{["Name","Email","Role","Plan","Status","Action"].map(TH)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop:"1px solid #1e293b" }}>
                  <td style={{ padding:"12px 14px" }}>{u.name}</td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"13px" }}>{u.email}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:700,
                      background: u.role==="ADMIN"?"#7c3aed":"#0e4429",
                      color: u.role==="ADMIN"?"#e9d5ff":"#4ade80" }}>{u.role}</span>
                  </td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"13px" }}>
                    {u.subscriptions?.[0]?.Plan?.name || "None"}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:700,
                      background: u.is_active?"#0e4429":"#450a0a",
                      color: u.is_active?"#4ade80":"#f87171" }}>{u.is_active ? "Active" : "Disabled"}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    {u.role !== "ADMIN" && (
                      <button onClick={() => toggle(u.id, u.is_active)}
                        style={{ padding:"5px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"12px",
                          background: u.is_active?"#450a0a":"#0e4429",
                          color: u.is_active?"#fca5a5":"#4ade80" }}>
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={6} style={{ padding:"32px", textAlign:"center", color:"#475569" }}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
