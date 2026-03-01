import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Billing() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/users").then(r => {
      const allSubs = r.data.flatMap(u =>
        (u.subscriptions||[]).map(s => ({ ...s, user: u }))
      );
      setSubs(allSubs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const TH = s => <th style={{ padding:"10px 14px", textAlign:"left", color:"#94a3b8", fontSize:"12px", fontWeight:600 }}>{s}</th>;
  const STATUS = { ACTIVE:"#0e4429", EXPIRED:"#450a0a", CANCELLED:"#1e3a5f" };
  const SCOL   = { ACTIVE:"#4ade80", EXPIRED:"#f87171", CANCELLED:"#93c5fd" };

  return (
    <div style={{ padding:"24px", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9" }}>
      <h2 style={{ marginBottom:"20px" }}>Billing & Subscriptions</h2>
      {loading ? <p style={{ color:"#64748b" }}>Loading…</p> : (
        <div style={{ background:"#1e293b", borderRadius:"12px", overflow:"hidden", border:"1px solid #334155" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead style={{ background:"#0f172a" }}>
              <tr>{["User","Plan","Status","Start","End"].map(TH)}</tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} style={{ borderTop:"1px solid #1e293b" }}>
                  <td style={{ padding:"12px 14px", fontSize:"13px" }}>{s.user?.email}</td>
                  <td style={{ padding:"12px 14px" }}>{s.Plan?.name || "–"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:700,
                      background: STATUS[s.status]||"#1e293b", color: SCOL[s.status]||"#94a3b8" }}>{s.status}</span>
                  </td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"12px" }}>{new Date(s.start_date).toLocaleDateString()}</td>
                  <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"12px" }}>{new Date(s.end_date).toLocaleDateString()}</td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan={5} style={{ padding:"32px", textAlign:"center", color:"#475569" }}>No subscriptions</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
