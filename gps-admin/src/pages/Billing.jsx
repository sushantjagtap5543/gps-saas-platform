import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Billing() {
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    Promise.all([api.get("/billing/plans")]).then(([p]) => setPlans(p.data)).catch(console.error);
  }, []);
  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Plans & Billing</h2>
      <div style={{ display:"flex", gap:"16px", flexWrap:"wrap" }}>
        {plans.map(p => (
          <div key={p.id} style={{ border:"1px solid #e2e8f0", borderRadius:"12px", padding:"20px", width:"200px", background:"#fff" }}>
            <h3>{p.name}</h3>
            <p style={{ fontSize:"24px", fontWeight:"bold", color:"#3b82f6" }}>₹{(p.price/100).toFixed(0)}</p>
            <p style={{ color:"#64748b", fontSize:"13px" }}>{p.duration_days} days / {p.max_devices} devices</p>
          </div>
        ))}
      </div>
    </div>
  );
}
