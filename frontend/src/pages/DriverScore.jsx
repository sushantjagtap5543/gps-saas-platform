import { useEffect, useState } from "react";
import api from "../api/axios";

const ScoreCircle = ({ score, label, size = 80 }) => {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:`conic-gradient(${color} ${score*3.6}deg, #e2e8f0 0deg)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:size-12, height:size-12, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size>60?20:14, color }}>
          {Math.round(score)}
        </div>
      </div>
      <span style={{ fontSize:"11px", color:"#64748b", textAlign:"center" }}>{label}</span>
    </div>
  );
};

export default function DriverScore() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    setLoading(true);
    api.get("/analytics/driver-scores?days=" + days)
      .then(r => setScores(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const grouped = scores.reduce((acc, s) => {
    const key = s.driver_id;
    if (!acc[key]) acc[key] = { driver_id: s.driver_id, trips: 0, distance: 0, scores: [] };
    acc[key].trips += s.trips_count || 0;
    acc[key].distance += s.distance_km || 0;
    acc[key].scores.push(s.overall_score || 100);
    return acc;
  }, {});

  const drivers = Object.values(grouped).map(d => ({
    ...d,
    avg: Math.round(d.scores.reduce((a,b)=>a+b,0) / d.scores.length)
  })).sort((a,b) => b.avg - a.avg);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <div>
          <h1 style={{ fontSize:"24px", fontWeight:700, color:"#1e293b", margin:0 }}>Driver Scoring</h1>
          <p style={{ color:"#64748b", fontSize:"14px", marginTop:"4px" }}>AI-powered, rule-based scoring — 100% free</p>
        </div>
        <select value={days} onChange={e => setDays(e.target.value)}
          style={{ padding:"9px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"14px", cursor:"pointer" }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Score Legend */}
      <div style={{ display:"flex", gap:"16px", marginBottom:"24px", flexWrap:"wrap" }}>
        {[["🟢 Excellent","80–100","#22c55e"],["🟡 Good","60–79","#f59e0b"],["🔴 Needs Improvement","0–59","#ef4444"]].map(([l,r,c]) => (
          <div key={l} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"12px 20px", display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"18px" }}>{l.split(" ")[0]}</span>
            <div>
              <div style={{ fontWeight:600, color:"#1e293b", fontSize:"13px" }}>{l.slice(3)}</div>
              <div style={{ fontSize:"12px", color }}>Score {r}</div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:"60px", color:"#94a3b8" }}>Loading scores…</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"16px" }}>
        {drivers.map((d, i) => (
          <div key={d.driver_id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"20px" }}>
              <div style={{ width:44, height:44, background:"#f1f5f9", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"16px" }}>
                #{i+1}
              </div>
              <div>
                <div style={{ fontWeight:600, color:"#1e293b" }}>{d.driver_id?.slice(0,8)}…</div>
                <div style={{ fontSize:"12px", color:"#64748b" }}>{d.trips} trips · {d.distance.toFixed(0)} km</div>
              </div>
              <div style={{ marginLeft:"auto" }}>
                <ScoreCircle score={d.avg} label="Overall" />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-around" }}>
              {scores.filter(s => s.driver_id === d.driver_id).slice(-1).map(latest => (
                <>
                  <ScoreCircle key="sp" score={latest.speed_score || 100} label="Speed" size={56} />
                  <ScoreCircle key="br" score={latest.brake_score || 100} label="Braking" size={56} />
                  <ScoreCircle key="ac" score={latest.accel_score || 100} label="Accel" size={56} />
                  <ScoreCircle key="id" score={latest.idle_score || 100} label="Idle" size={56} />
                </>
              ))}
            </div>
          </div>
        ))}
        {!loading && !drivers.length && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px", color:"#94a3b8" }}>
            No driver scores yet. Trips with drivers will be scored automatically.
          </div>
        )}
      </div>
    </div>
  );
}
