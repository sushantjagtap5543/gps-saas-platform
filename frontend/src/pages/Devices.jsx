import { useEffect, useState } from "react";
import api from "../api/axios";

const Badge = ({ status }) => {
  const map = { ONLINE: ["#dcfce7","#15803d"], OFFLINE: ["#fee2e2","#b91c1c"], INACTIVE: ["#f1f5f9","#64748b"], SUSPENDED: ["#fef9c3","#854d0e"] };
  const [bg, color] = map[status] || map.OFFLINE;
  return <span style={{ background:bg, color, padding:"2px 8px", borderRadius:"20px", fontSize:"11px", fontWeight:700 }}>{status}</span>;
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ imei:"", vehicle_number:"", vehicle_type:"CAR", notes:"" });
  const [models, setModels]   = useState([]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20, ...(search && {search}), ...(status && {status}) });
    api.get("/devices?" + params).then(r => {
      setDevices(r.data.devices || r.data);
      setTotal(r.data.total || 0);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status]);
  useEffect(() => { api.get("/devices/models").then(r => setModels(r.data)).catch(() => {}); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/devices", form);
      setShowForm(false);
      setForm({ imei:"", vehicle_number:"", vehicle_type:"CAR", notes:"" });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create device");
    }
  };

  const handleDelete = async (id, vehicle) => {
    if (!window.confirm(`Delete device ${vehicle}? This cannot be undone.`)) return;
    await api.delete("/devices/" + id);
    load();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <div>
          <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Devices</h1>
          <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>{total} devices registered</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background:"#3b82f6", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:600, fontSize:"14px" }}>
          + Add Device
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"12px", marginBottom:"20px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IMEI or vehicle…"
          style={{ flex:1, padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none" }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
          <option value="">All Status</option>
          <option>ONLINE</option><option>OFFLINE</option><option>INACTIVE</option><option>SUSPENDED</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Vehicle","IMEI","Type","Status","Speed","Last Seen","Actions"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"12px", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>Loading…</td></tr>}
            {!loading && devices.map(d => (
              <tr key={d.id} style={{ borderTop:"1px solid #f1f5f9" }}>
                <td style={{ padding:"12px 16px", fontWeight:500 }}>{d.vehicle_number}</td>
                <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:"13px", color:"#64748b" }}>{d.imei}</td>
                <td style={{ padding:"12px 16px", color:"#64748b", fontSize:"13px" }}>{d.vehicle_type}</td>
                <td style={{ padding:"12px 16px" }}><Badge status={d.status} /></td>
                <td style={{ padding:"12px 16px", fontSize:"13px" }}>
                  {d.liveData?.speed != null ? <span style={{ fontWeight:600, color: d.liveData.speed > 0 ? "#3b82f6" : "#64748b" }}>{d.liveData.speed} km/h</span> : "—"}
                </td>
                <td style={{ padding:"12px 16px", fontSize:"12px", color:"#94a3b8" }}>
                  {d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <button onClick={() => handleDelete(d.id, d.vehicle_number)}
                    style={{ background:"#fee2e2", color:"#b91c1c", border:"none", padding:"4px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:600 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !devices.length && <tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>No devices found</td></tr>}
          </tbody>
        </table>
        {total > 20 && (
          <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #f1f5f9", fontSize:"13px", color:"#64748b" }}>
            <span>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
            <div style={{ display:"flex", gap:"8px" }}>
              <button disabled={page===1} onClick={() => setPage(p => p-1)} style={{ padding:"4px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", cursor:"pointer", background:page===1?"#f8fafc":"#fff" }}>Prev</button>
              <button disabled={page*20>=total} onClick={() => setPage(p => p+1)} style={{ padding:"4px 12px", border:"1px solid #e2e8f0", borderRadius:"6px", cursor:"pointer", background:page*20>=total?"#f8fafc":"#fff" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <form onSubmit={handleCreate} style={{ background:"#fff", borderRadius:"16px", padding:"32px", width:"440px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 24px", fontWeight:700, fontSize:"20px" }}>Add New Device</h2>
            {[
              { label:"IMEI (15 digits)", key:"imei", placeholder:"123456789012345" },
              { label:"Vehicle Number", key:"vehicle_number", placeholder:"MH-01-AB-1234" }
            ].map(f => (
              <div key={f.key} style={{ marginBottom:"16px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})}
                  placeholder={f.placeholder} required
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:"16px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type:e.target.value})}
                style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
                {["CAR","TRUCK","BIKE","BUS","TRACTOR","EXCAVATOR","BOAT","OTHER"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {models.length > 0 && (
              <div style={{ marginBottom:"16px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Device Model</label>
                <select value={form.model_id || ""} onChange={e => setForm({...form, model_id:e.target.value})}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
                  <option value="">Select model…</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.brand} {m.name} ({m.protocol})</option>)}
                </select>
              </div>
            )}
            <div style={{ display:"flex", gap:"12px", marginTop:"24px" }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ flex:1, padding:"10px", border:"1px solid #e2e8f0", borderRadius:"8px", cursor:"pointer", background:"#f8fafc", fontWeight:600 }}>Cancel</button>
              <button type="submit"
                style={{ flex:1, padding:"10px", border:"none", borderRadius:"8px", cursor:"pointer", background:"#3b82f6", color:"#fff", fontWeight:600 }}>
                Add Device
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
