import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      login(res.data);
      navigate("/");
    } catch (e) { setError(e.response?.data?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <div style={{ background:"#1e293b", padding:"40px", borderRadius:"12px", width:"360px" }}>
        <h1 style={{ color:"#fff", textAlign:"center", marginBottom:"4px" }}>🛰️ GPS SaaS</h1>
        <p style={{ color:"#64748b", textAlign:"center", marginBottom:"32px" }}>Sign in to your account</p>
        {error && <div style={{ background:"#ef4444", color:"#fff", padding:"10px", borderRadius:"6px", marginBottom:"16px", fontSize:"14px" }}>{error}</div>}
        {["email","password"].map(f => (
          <input key={f} type={f} placeholder={f.charAt(0).toUpperCase()+f.slice(1)} value={form[f]}
            onChange={e => setForm(p => ({...p, [f]:e.target.value}))}
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{ width:"100%", padding:"12px", marginBottom:"12px", borderRadius:"8px", border:"1px solid #334155", background:"#0f172a", color:"#fff", fontSize:"14px" }} />
        ))}
        <button onClick={handle} disabled={loading}
          style={{ width:"100%", padding:"12px", background:"#3b82f6", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"16px", opacity:loading?0.7:1 }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}
