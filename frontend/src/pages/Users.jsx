import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const roleBadge = { SUPER_ADMIN: ["#ede9fe","#7c3aed"], ADMIN: ["#dbeafe","#1d4ed8"], RESELLER: ["#d1fae5","#065f46"], CLIENT: ["#f1f5f9","#475569"], DRIVER: ["#fef3c7","#92400e"], TECHNICIAN: ["#fee2e2","#991b1b"], SUPPORT: ["#f0fdf4","#15803d"] };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [role, setRole]     = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit:20, ...(role&&{role}), ...(search&&{search}) });
    api.get("/admin/users?" + p).then(r => {
      setUsers(r.data.users); setTotal(r.data.total);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, role, search]);

  const toggle = async (id, name, active) => {
    if (!window.confirm(`${active ? "Suspend" : "Activate"} ${name}?`)) return;
    await api.put("/admin/users/" + id + "/toggle");
    load();
  };

  return (
    <div>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>User Management</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>{total} users in system</p>
      </div>

      <div style={{ display:"flex", gap:"12px", marginBottom:"20px" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email…"
          style={{ flex:1, padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none" }} />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
          <option value="">All Roles</option>
          {["SUPER_ADMIN","ADMIN","RESELLER","SUPPORT","TECHNICIAN","CLIENT","DRIVER"].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Name","Email","Role","Status","Last Login","Actions"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"12px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>Loading…</td></tr>}
            {!loading && users.map(u => {
              const [bg, color] = roleBadge[u.role] || ["#f1f5f9","#475569"];
              return (
                <tr key={u.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"12px 16px", fontWeight:500 }}>{u.name}</td>
                  <td style={{ padding:"12px 16px", color:"#64748b", fontSize:"13px" }}>{u.email}</td>
                  <td style={{ padding:"12px 16px" }}><span style={{ background:bg, color, padding:"2px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:700 }}>{u.role}</span></td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ background: u.is_active?"#dcfce7":"#fee2e2", color: u.is_active?"#15803d":"#b91c1c", padding:"2px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:700 }}>
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:"12px", color:"#94a3b8" }}>{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    {u.id !== me?.id && (
                      <button onClick={() => toggle(u.id, u.name, u.is_active)}
                        style={{ background: u.is_active?"#fee2e2":"#dcfce7", color: u.is_active?"#b91c1c":"#15803d", border:"none", padding:"4px 12px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>
                        {u.is_active ? "Suspend" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !users.length && <tr><td colSpan={6} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
