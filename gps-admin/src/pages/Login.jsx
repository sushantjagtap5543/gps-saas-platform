import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../api/auth/AuthContext";

export default function Login() {
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handle = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      if (res.data.user?.role !== "ADMIN") {
        setError("Access denied. Admin accounts only.");
        return;
      }
      login(res.data);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.message || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <div style={{ background:"#1e293b", padding:"40px", borderRadius:"12px", width:"360px", boxShadow:"0 20px 40px rgba(0,0,0,0.4)" }}>
        <h1 style={{ color:"#fff", textAlign:"center", marginBottom:"4px", fontSize:"22px" }}>⚙️ GPS Admin</h1>
        <p  style={{ color:"#64748b", textAlign:"center", marginBottom:"32px", fontSize:"14px" }}>Administrator sign-in</p>

        {error && (
          <div style={{ background:"#450a0a", border:"1px solid #dc2626", color:"#fca5a5", padding:"10px 14px", borderRadius:"6px", marginBottom:"16px", fontSize:"13px" }}>
            {error}
          </div>
        )}

        {["email","password"].map(f => (
          <input
            key={f}
            type={f}
            placeholder={f === "email" ? "Admin email" : "Password"}
            value={form[f]}
            onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{
              display:"block", width:"100%", padding:"11px 14px", marginBottom:"12px",
              borderRadius:"8px", border:"1px solid #334155",
              background:"#0f172a", color:"#f1f5f9", fontSize:"14px",
              outline:"none", boxSizing:"border-box"
            }}
          />
        ))}

        <button
          onClick={handle}
          disabled={loading}
          style={{
            width:"100%", padding:"12px", background: loading ? "#1d4ed8" : "#3b82f6",
            color:"#fff", border:"none", borderRadius:"8px", cursor: loading ? "not-allowed" : "pointer",
            fontSize:"15px", fontWeight:600, transition:"background 0.2s"
          }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
