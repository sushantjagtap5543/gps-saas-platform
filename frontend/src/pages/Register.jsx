import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const imeiFromQR = params.get("imei") || "";
  
  const [step, setStep] = useState(imeiFromQR ? 2 : 1);
  const [form, setForm] = useState({
    imei: imeiFromQR,
    name: "", email: "", password: "", phone: "",
    company: "", vehicle_number: "", vehicle_type: "CAR"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const S = {
    page:   { minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e3a5f)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" },
    box:    { background:"#fff", borderRadius:"16px", padding:"40px", width:"100%", maxWidth:"480px", boxShadow:"0 20px 60px rgba(0,0,0,.3)" },
    logo:   { textAlign:"center", marginBottom:"28px" },
    title:  { fontSize:"24px", fontWeight:800, color:"#0f172a", marginBottom:"6px" },
    sub:    { fontSize:"14px", color:"#64748b" },
    label:  { display:"block", fontSize:"12px", fontWeight:700, color:"#475569", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.5px" },
    input:  { width:"100%", padding:"11px 13px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none", boxSizing:"border-box", marginBottom:"16px" },
    btn:    { width:"100%", padding:"13px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"10px", fontSize:"15px", fontWeight:700, cursor:"pointer", marginTop:"8px" },
    error:  { background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:"8px", padding:"12px", fontSize:"13px", color:"#dc2626", marginBottom:"16px" },
    steps:  { display:"flex", gap:"6px", justifyContent:"center", marginBottom:"28px" },
    step:   (a) => ({ width:"32px", height:"32px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, background: a?"#3b82f6":"#f1f5f9", color: a?"#fff":"#94a3b8" }),
  };

  const update = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/auth/register", form);
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  if (done) return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={{textAlign:"center",padding:"20px"}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>🎉</div>
          <h2 style={{fontWeight:800,color:"#0f172a"}}>Registration Complete!</h2>
          <p style={{color:"#64748b",marginTop:"8px"}}>Your account has been created. Login to start tracking.</p>
          <button style={{...S.btn,marginTop:"24px"}} onClick={()=>navigate("/login")}>Go to Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>
          <div style={{fontSize:"40px"}}>🛰️</div>
          <div style={S.title}>GPS Tracker</div>
          <div style={S.sub}>{imeiFromQR ? "Complete your device registration" : "Create your account"}</div>
        </div>

        <div style={S.steps}>
          {[1,2,3].map(s=><div key={s} style={S.step(step>=s)}>{s}</div>)}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {step === 1 && (
          <>
            <label style={S.label}>Device IMEI (15 digits)</label>
            <input style={S.input} placeholder="123456789012345" value={form.imei} onChange={e=>update("imei",e.target.value)} maxLength={15} />
            <p style={{fontSize:"12px",color:"#64748b",marginTop:"-12px",marginBottom:"16px"}}>Find IMEI on your device box or printed label</p>
            <button style={{...S.btn,background: form.imei.length===15?"#3b82f6":"#cbd5e1",cursor:form.imei.length===15?"pointer":"not-allowed"}}
              onClick={()=>form.imei.length===15&&setStep(2)}>Next →</button>
          </>
        )}

        {step === 2 && (
          <>
            <label style={S.label}>Your Full Name</label>
            <input style={S.input} placeholder="John Smith" value={form.name} onChange={e=>update("name",e.target.value)} />
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="john@company.com" value={form.email} onChange={e=>update("email",e.target.value)} />
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="Min 8 characters" value={form.password} onChange={e=>update("password",e.target.value)} />
            <label style={S.label}>Phone Number</label>
            <input style={S.input} placeholder="+91 9876543210" value={form.phone} onChange={e=>update("phone",e.target.value)} />
            <div style={{display:"flex",gap:"8px"}}>
              <button style={{...S.btn,background:"#f1f5f9",color:"#475569"}} onClick={()=>setStep(1)}>← Back</button>
              <button style={S.btn} onClick={()=>setStep(3)}>Next →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label style={S.label}>Company Name (optional)</label>
            <input style={S.input} placeholder="ABC Transport" value={form.company} onChange={e=>update("company",e.target.value)} />
            <label style={S.label}>Vehicle Number</label>
            <input style={S.input} placeholder="MH-01-AB-1234" value={form.vehicle_number} onChange={e=>update("vehicle_number",e.target.value)} />
            <label style={S.label}>Vehicle Type</label>
            <select style={{...S.input,cursor:"pointer"}} value={form.vehicle_type} onChange={e=>update("vehicle_type",e.target.value)}>
              {["CAR","TRUCK","BIKE","BUS","VAN","OTHER"].map(t=><option key={t}>{t}</option>)}
            </select>
            <div style={{display:"flex",gap:"8px"}}>
              <button style={{...S.btn,background:"#f1f5f9",color:"#475569"}} onClick={()=>setStep(2)}>← Back</button>
              <button style={S.btn} onClick={submit} disabled={loading}>{loading?"Registering...":"✅ Complete Registration"}</button>
            </div>
          </>
        )}

        <p style={{textAlign:"center",marginTop:"20px",fontSize:"13px",color:"#64748b"}}>
          Already have an account? <a href="/login" style={{color:"#3b82f6"}}>Login</a>
        </p>
      </div>
    </div>
  );
}
