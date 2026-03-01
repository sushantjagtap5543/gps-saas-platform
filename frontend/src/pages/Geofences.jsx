import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Geofences() {
  const [fences, setFences] = useState([]);
  const [form, setForm] = useState({ name:"", type:"circle", center_lat:"", center_lng:"", radius:"500" });
  const [msg, setMsg] = useState("");

  useEffect(() => { api.get("/geofences").then(r => setFences(r.data)).catch(console.error); }, []);

  const create = async () => {
    try {
      const { data } = await api.post("/geofences", { ...form, center_lat: +form.center_lat, center_lng: +form.center_lng, radius: +form.radius });
      setFences(prev => [...prev, data]);
      setMsg("Geofence created!");
      setForm({ name:"", type:"circle", center_lat:"", center_lng:"", radius:"500" });
    } catch { setMsg("Failed to create geofence."); }
  };

  const remove = async (id) => {
    await api.delete("/geofences/" + id);
    setFences(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Geofences</h2>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", marginBottom:"24px" }}>
        <h3 style={{ marginBottom:"16px" }}>Add Geofence</h3>
        {["name","center_lat","center_lng","radius"].map(f => (
          <input key={f} placeholder={f.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())} value={form[f]}
            onChange={e => setForm(p => ({...p,[f]:e.target.value}))}
            style={{ padding:"10px", marginRight:"8px", marginBottom:"8px", borderRadius:"6px", border:"1px solid #e2e8f0", width:"160px" }} />
        ))}
        <button onClick={create} style={{ padding:"10px 20px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer" }}>Add</button>
        {msg && <p style={{ color:"#16a34a", marginTop:"8px" }}>{msg}</p>}
      </div>
      {fences.map(f => (
        <div key={f.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", marginBottom:"8px" }}>
          <div><strong>{f.name}</strong> <span style={{ color:"#64748b", fontSize:"13px" }}>{f.type} — {f.type==="circle" ? f.radius+"m radius" : "polygon"}</span></div>
          <button onClick={() => remove(f.id)} style={{ padding:"6px 12px", background:"#ef4444", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"13px" }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
