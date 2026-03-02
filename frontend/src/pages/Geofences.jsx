import { useEffect, useState } from "react";
import api from "../api/axios";

const INPUT = { padding:"10px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", width:"100%", boxSizing:"border-box" };

export default function Geofences() {
  const [fences, setFences]   = useState([]);
  const [form, setForm]       = useState({ name:"", type:"circle", center_lat:"", center_lng:"", radius:"" });
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => api.get("/geofences").then(r => setFences(r.data)).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setMsg("");
    if (!form.name || !form.type) { setMsg("Name and type are required"); return; }
    try {
      await api.post("/geofences", form);
      setForm({ name:"", type:"circle", center_lat:"", center_lng:"", radius:"" });
      setMsg("✅ Geofence created");
      load();
    } catch (e) { setMsg("❌ " + (e.response?.data?.message || "Failed")); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this geofence?")) return;
    await api.delete(`/geofences/${id}`).catch(console.error);
    load();
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"24px" }}>Geofences</h2>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", marginBottom:"24px", maxWidth:"480px" }}>
        <h3 style={{ marginBottom:"16px" }}>Create Geofence</h3>
        {msg && <div style={{ padding:"10px", background: msg.startsWith("✅")?"#dcfce7":"#fee2e2", borderRadius:"6px", marginBottom:"12px", fontSize:"13px" }}>{msg}</div>}
        <input placeholder="Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} style={{ ...INPUT, marginBottom:"10px" }} />
        <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} style={{ ...INPUT, marginBottom:"10px" }}>
          <option value="circle">Circle</option>
          <option value="polygon">Polygon</option>
        </select>
        {form.type === "circle" && (<>
          <input placeholder="Center Latitude"  value={form.center_lat} onChange={e=>setForm(p=>({...p,center_lat:e.target.value}))} style={{ ...INPUT, marginBottom:"10px" }} />
          <input placeholder="Center Longitude" value={form.center_lng} onChange={e=>setForm(p=>({...p,center_lng:e.target.value}))} style={{ ...INPUT, marginBottom:"10px" }} />
          <input placeholder="Radius (meters)"  value={form.radius}     onChange={e=>setForm(p=>({...p,radius:e.target.value}))}     style={{ ...INPUT, marginBottom:"16px" }} />
        </>)}
        <button onClick={create} style={{ padding:"10px 20px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer" }}>Create</button>
      </div>

      <h3 style={{ marginBottom:"12px" }}>Existing Geofences ({fences.length})</h3>
      {loading ? <p>Loading…</p> : !fences.length ? <p style={{ color:"#94a3b8" }}>No geofences yet</p> : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {fences.map(f => (
            <div key={f.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontWeight:600 }}>{f.name}</span>
                <span style={{ color:"#64748b", fontSize:"13px", marginLeft:"10px" }}>{f.type}</span>
                {f.type==="circle" && <span style={{ color:"#94a3b8", fontSize:"12px", marginLeft:"8px" }}>r={f.radius}m @ ({f.center_lat}, {f.center_lng})</span>}
              </div>
              <button onClick={() => remove(f.id)} style={{ padding:"5px 12px", background:"#fee2e2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:"6px", cursor:"pointer", fontSize:"12px" }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
