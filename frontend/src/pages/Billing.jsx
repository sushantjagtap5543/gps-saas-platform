import { useEffect, useState } from "react";
import api from "../api/axios";

const CARD = { border:"1px solid #e2e8f0", borderRadius:"12px", padding:"24px", width:"220px", background:"#fff" };

export default function Billing() {
  const [plans, setPlans]   = useState([]);
  const [sub,   setSub]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]       = useState("");

  useEffect(() => {
    Promise.all([api.get("/billing/plans"), api.get("/billing/subscription")])
      .then(([p, s]) => { setPlans(p.data); setSub(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const subscribe = async (plan_id) => {
    setMsg("");
    try {
      const { data } = await api.post("/billing/create-order", { plan_id });

      if (!window.Razorpay) {
        setMsg("Payment SDK not loaded. Please refresh the page.");
        return;
      }

      const options = {
        key:         data.key,
        amount:      data.amount,
        currency:    data.currency,
        order_id:    data.order_id,
        name:        "GPS SaaS",
        description: data.plan_name,
        handler: () => {
          setMsg("✅ Payment successful! Your subscription will activate in a few minutes.");
          setTimeout(() => window.location.reload(), 3000);
        },
        modal: {
          ondismiss: () => setMsg("Payment cancelled.")
        },
        theme: { color: "#3b82f6" }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setMsg("❌ Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to initiate payment.";
      setMsg("❌ " + errMsg);
    }
  };

  if (loading) return <div style={{ padding:"24px" }}>Loading billing info...</div>;

  return (
    <div style={{ padding:"24px" }}>
      <h2 style={{ marginBottom:"20px" }}>Billing & Subscription</h2>

      {sub?.status === "ACTIVE" && (
        <div style={{ background:"#dcfce7", border:"1px solid #86efac", padding:"16px", borderRadius:"10px", marginBottom:"24px" }}>
          ✅ <strong>Active Plan:</strong> {sub.Plan?.name} — Expires: {new Date(sub.end_date).toLocaleDateString()}
        </div>
      )}

      {msg && (
        <div style={{ background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${msg.startsWith("✅") ? "#86efac" : "#fca5a5"}`,
          padding:"12px", borderRadius:"8px", marginBottom:"20px" }}>
          {msg}
        </div>
      )}

      <h3 style={{ marginBottom:"16px" }}>Choose a Plan</h3>
      <div style={{ display:"flex", gap:"16px", flexWrap:"wrap" }}>
        {plans.map(p => (
          <div key={p.id} style={CARD}>
            <h3 style={{ marginBottom:"8px" }}>{p.name}</h3>
            <p style={{ fontSize:"28px", fontWeight:"bold", color:"#3b82f6", marginBottom:"4px" }}>
              ₹{(p.price / 100).toFixed(0)}
            </p>
            <p style={{ color:"#64748b", marginBottom:"4px" }}>{p.duration_days} days</p>
            {p.max_devices && (
              <p style={{ color:"#64748b", fontSize:"13px", marginBottom:"20px" }}>
                Up to {p.max_devices} devices
              </p>
            )}
            {p.description && (
              <p style={{ color:"#64748b", fontSize:"12px", marginBottom:"16px" }}>{p.description}</p>
            )}
            <button
              onClick={() => subscribe(p.id)}
              style={{ width:"100%", padding:"10px", background:"#3b82f6", color:"#fff",
                       border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:600 }}>
              Subscribe
            </button>
          </div>
        ))}
<<<<<<< Updated upstream
        {!plans.length && <p style={{ color:"#94a3b8" }}>No plans available.</p>}
      </div>
    </div>
=======
      </div>    </div>
>>>>>>> Stashed changes
  );
}
