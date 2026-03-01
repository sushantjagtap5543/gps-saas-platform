import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/billing/plans"), api.get("/billing/subscription")])
      .then(([p, s]) => { setPlans(p.data); setSub(s.data); })
      .catch(console.error);
  }, []);

  const subscribe = async (plan_id) => {
    try {
      const { data } = await api.post("/billing/create-order", { plan_id });
      const options = {
        key: data.key, amount: data.amount, currency: data.currency, order_id: data.order_id,
        name: "GPS SaaS", description: data.plan_name,
        handler: () => { alert("Payment successful! Your subscription will activate in a few minutes."); window.location.reload(); },
        theme: { color: "#3b82f6" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch { alert("Failed to initiate payment. Please try again."); }
  };

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Billing & Subscription</h2>
      {sub?.status === "ACTIVE" && (
        <div style={{ background:"#dcfce7", border:"1px solid #86efac", padding:"16px", borderRadius:"10px", marginBottom:"24px" }}>
          <strong>✅ Active Subscription</strong> — {sub.Plan?.name} — Expires: {new Date(sub.end_date).toLocaleDateString()}
        </div>
      )}
      <h3 style={{ marginBottom:"16px" }}>Choose a Plan</h3>
      <div style={{ display:"flex", gap:"16px", flexWrap:"wrap" }}>
        {plans.map(p => (
          <div key={p.id} style={{ border:"1px solid #e2e8f0", borderRadius:"12px", padding:"24px", width:"220px", background:"#fff" }}>
            <h3 style={{ marginBottom:"8px" }}>{p.name}</h3>
            <p style={{ fontSize:"28px", fontWeight:"bold", color:"#3b82f6", marginBottom:"4px" }}>₹{(p.price/100).toFixed(0)}</p>
            <p style={{ color:"#64748b", marginBottom:"8px" }}>{p.duration_days} days</p>
            {p.max_devices && <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"20px" }}>Up to {p.max_devices} devices</p>}
            <button onClick={() => subscribe(p.id)} style={{ width:"100%", padding:"10px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer" }}>Subscribe</button>
          </div>
        ))}
      </div>    </div>
  );
}
