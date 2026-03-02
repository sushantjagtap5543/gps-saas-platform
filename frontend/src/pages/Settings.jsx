import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Section = ({ title, children }) => (
  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", overflow:"hidden", marginBottom:"20px" }}>
    <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9", fontWeight:600, fontSize:"16px", color:"#1e293b" }}>{title}</div>
    <div style={{ padding:"24px" }}>{children}</div>
  </div>
);

const Input = ({ label, value, onChange, type="text", disabled }) => (
  <div style={{ marginBottom:"16px" }}>
    <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>{label}</label>
    <input type={type} value={value} onChange={onChange} disabled={disabled}
      style={{ width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", outline:"none", background: disabled ? "#f8fafc" : "#fff", boxSizing:"border-box" }} />
  </div>
);

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name:"", phone:"", address:"", city:"", state:"", country:"India", timezone:"Asia/Kolkata" });
  const [passwords, setPasswords] = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [branding, setBranding]   = useState({ company_name:"", primary_color:"#2563EB", support_email:"", support_phone:"" });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (user) setProfile(p => ({ ...p, name: user.name, phone: user.phone || "", address: user.address || "", city: user.city || "", state: user.state || "" }));
    api.get("/branding").then(r => { if (r.data) setBranding(r.data); }).catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    try {
      await api.put("/auth/profile", profile);
      setSaved("Profile saved ✓");
      setTimeout(() => setSaved(""), 3000);
    } catch (err) { alert(err.response?.data?.message || "Failed"); }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) return alert("Passwords don't match");
    try {
      await api.put("/auth/change-password", { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword:"", newPassword:"", confirmPassword:"" });
      setSaved("Password changed ✓");
      setTimeout(() => setSaved(""), 3000);
    } catch (err) { alert(err.response?.data?.message || "Failed"); }
  };

  const saveBranding = async () => {
    try {
      await api.put("/branding", branding);
      setSaved("Branding saved ✓");
      setTimeout(() => setSaved(""), 3000);
    } catch (err) { alert(err.response?.data?.message || "Failed"); }
  };

  const isAdmin = ["ADMIN","SUPER_ADMIN","RESELLER"].includes(user?.role);

  return (
    <div>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Settings</h1>
        {saved && <div style={{ marginTop:"8px", background:"#dcfce7", color:"#15803d", padding:"8px 16px", borderRadius:"8px", fontSize:"14px", display:"inline-block" }}>{saved}</div>}
      </div>

      <Section title="👤 Profile">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
          <Input label="Full Name"  value={profile.name}  onChange={e => setProfile({...profile,name:e.target.value})} />
          <Input label="Email"      value={user?.email||""} disabled />
          <Input label="Phone"      value={profile.phone} onChange={e => setProfile({...profile,phone:e.target.value})} />
          <Input label="City"       value={profile.city}  onChange={e => setProfile({...profile,city:e.target.value})} />
          <Input label="State"      value={profile.state} onChange={e => setProfile({...profile,state:e.target.value})} />
          <Input label="Country"    value={profile.country} onChange={e => setProfile({...profile,country:e.target.value})} />
        </div>
        <Input label="Address" value={profile.address} onChange={e => setProfile({...profile,address:e.target.value})} />
        <button onClick={saveProfile}
          style={{ background:"#3b82f6", color:"#fff", border:"none", padding:"10px 24px", borderRadius:"8px", cursor:"pointer", fontWeight:600 }}>
          Save Profile
        </button>
      </Section>

      <Section title="🔒 Change Password">
        <div style={{ maxWidth:"400px" }}>
          <Input label="Current Password" value={passwords.currentPassword} onChange={e => setPasswords({...passwords,currentPassword:e.target.value})} type="password" />
          <Input label="New Password"     value={passwords.newPassword}     onChange={e => setPasswords({...passwords,newPassword:e.target.value})}     type="password" />
          <Input label="Confirm Password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords,confirmPassword:e.target.value})} type="password" />
          <button onClick={changePassword}
            style={{ background:"#3b82f6", color:"#fff", border:"none", padding:"10px 24px", borderRadius:"8px", cursor:"pointer", fontWeight:600 }}>
            Change Password
          </button>
        </div>
      </Section>

      {isAdmin && (
        <Section title="🎨 White-label Branding">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
            <Input label="Company Name"   value={branding.company_name || ""}  onChange={e => setBranding({...branding,company_name:e.target.value})} />
            <Input label="Support Email"  value={branding.support_email || ""} onChange={e => setBranding({...branding,support_email:e.target.value})} />
            <Input label="Support Phone"  value={branding.support_phone || ""} onChange={e => setBranding({...branding,support_phone:e.target.value})} />
            <div style={{ marginBottom:"16px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" }}>Primary Color</label>
              <input type="color" value={branding.primary_color || "#2563EB"} onChange={e => setBranding({...branding,primary_color:e.target.value})}
                style={{ width:"100%", height:"40px", border:"1px solid #e2e8f0", borderRadius:"8px", cursor:"pointer", padding:"2px" }} />
            </div>
          </div>
          <button onClick={saveBranding}
            style={{ background:"#3b82f6", color:"#fff", border:"none", padding:"10px 24px", borderRadius:"8px", cursor:"pointer", fontWeight:600 }}>
            Save Branding
          </button>
        </Section>
      )}
    </div>
  );
}
