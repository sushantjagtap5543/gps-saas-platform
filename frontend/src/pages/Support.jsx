import { useEffect, useState } from "react";
import api from "../api/axios";

const priorityColors = { LOW: ["#f1f5f9","#64748b"], MEDIUM: ["#fef9c3","#854d0e"], HIGH: ["#fef2f2","#b91c1c"], CRITICAL: ["#fee2e2","#7f1d1d"] };
const statusColors   = { OPEN: ["#eff6ff","#1d4ed8"], IN_PROGRESS: ["#fef9c3","#854d0e"], RESOLVED: ["#dcfce7","#15803d"], CLOSED: ["#f1f5f9","#64748b"] };

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal]     = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ subject:"", description:"", category:"GENERAL", priority:"MEDIUM" });

  const load = () => api.get("/support/tickets").then(r => { setTickets(r.data.tickets || r.data); setTotal(r.data.total || 0); }).catch(console.error);
  useEffect(() => { load(); }, []);

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post("/support/tickets", form);
      setShowForm(false);
      setForm({ subject:"", description:"", category:"GENERAL", priority:"MEDIUM" });
      load();
    } catch (err) { alert(err.response?.data?.message || "Failed"); }
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <div>
          <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Support</h1>
          <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>{total} tickets</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background:"#3b82f6", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:600, fontSize:"14px" }}>
          + New Ticket
        </button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
        {tickets.map(t => {
          const [pbg, pc] = priorityColors[t.priority] || priorityColors.MEDIUM;
          const [sbg, sc] = statusColors[t.status] || statusColors.OPEN;
          return (
            <div key={t.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px 24px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:"15px", color:"#1e293b" }}>{t.subject}</div>
                  <div style={{ fontSize:"13px", color:"#64748b", marginTop:"4px" }}>{t.description?.slice(0,120)}…</div>
                </div>
                <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
                  <span style={{ background:pbg, color:pc, padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:700 }}>{t.priority}</span>
                  <span style={{ background:sbg, color:sc, padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:700 }}>{t.status}</span>
                </div>
              </div>
              <div style={{ marginTop:"12px", fontSize:"12px", color:"#94a3b8" }}>
                {t.category} · Created {new Date(t.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
        {!tickets.length && (
          <div style={{ textAlign:"center", padding:"60px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", color:"#94a3b8" }}>
            No tickets yet. We're here to help! 🎫
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <form onSubmit={createTicket} style={{ background:"#fff", borderRadius:"16px", padding:"32px", width:"500px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 24px", fontWeight:700, fontSize:"20px" }}>New Support Ticket</h2>
            {[{ label:"Subject", key:"subject" }].map(f => (
              <div key={f.key} style={{ marginBottom:"16px" }}>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})} required
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:"16px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} required rows={4}
                style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
              <div>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Category</label>
                <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
                  {["GENERAL","DEVICE","BILLING","TECHNICAL","ACCOUNT"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
                  {["LOW","MEDIUM","HIGH","CRITICAL"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:"12px" }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ flex:1, padding:"10px", border:"1px solid #e2e8f0", borderRadius:"8px", cursor:"pointer", background:"#f8fafc", fontWeight:600 }}>Cancel</button>
              <button type="submit"
                style={{ flex:1, padding:"10px", border:"none", borderRadius:"8px", cursor:"pointer", background:"#3b82f6", color:"#fff", fontWeight:600 }}>
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
