import { useState, useEffect, useRef } from "react";
import api from "../api/axios";

const S = {
  page:    { background: "#0f172a", minHeight: "100vh", padding: "0", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
  header:  { background: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:   { fontSize: "18px", fontWeight: 700, color: "#38bdf8", letterSpacing: "1px" },
  body:    { display: "grid", gridTemplateColumns: "340px 1fr", minHeight: "calc(100vh - 57px)" },
  sidebar: { background: "#1e293b", borderRight: "1px solid #334155", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  console: { background: "#0f172a", padding: "20px", display: "flex", flexDirection: "column" },
  card:    { background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", padding: "16px" },
  label:   { fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", display: "block" },
  input:   { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", color: "#e2e8f0", outline: "none", boxSizing: "border-box" },
  select:  { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", color: "#e2e8f0", cursor: "pointer" },
  btn:     { padding: "9px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, width: "100%", letterSpacing: "0.5px" },
  logArea: { flex: 1, background: "#060d18", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "14px", overflowY: "auto", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.8" },
  statusDot: (on) => ({ width: "10px", height: "10px", borderRadius: "50%", background: on ? "#22c55e" : "#ef4444", boxShadow: on ? "0 0 8px #22c55e" : "0 0 4px #ef4444", flexShrink: 0 }),
};

const LOG_TYPES = {
  info:    { color: "#38bdf8", pre: "ℹ " },
  success: { color: "#22c55e", pre: "✅ " },
  warning: { color: "#fbbf24", pre: "⚠ " },
  error:   { color: "#ef4444", pre: "❌ " },
  packet:  { color: "#a78bfa", pre: "📦 " },
  cmd:     { color: "#f97316", pre: "📩 " },
  system:  { color: "#64748b", pre: "── " },
};

export default function DeviceTest() {
  const [imei,     setImei]     = useState("123456789012345");
  const [host,     setHost]     = useState(window.location.hostname);
  const [port,     setPort]     = useState("5023");
  const [route,    setRoute]    = useState("circle");
  const [interval, setInterval_] = useState("5000");
  const [startLat, setStartLat] = useState("28.6139");
  const [startLng, setStartLng] = useState("77.2090");

  const [status,   setStatus]   = useState("disconnected"); // disconnected|connecting|online
  const [packets,  setPackets]  = useState(0);
  const [liveData, setLiveData] = useState(null);
  const [devices,  setDevices]  = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [ignition, setIgnition] = useState(true);
  const [speed,    setSpeed]    = useState(0);

  const workerRef  = useRef(null);
  const angleRef   = useRef(0);
  const routeIdxRef = useRef(0);
  const pktCountRef = useRef(0);
  const logRef     = useRef(null);

  useEffect(() => {
    api.get("/devices?limit=50").then(r => setDevices(r.data.devices || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg, type = "info") => {
    const ts = new Date().toTimeString().slice(0,8);
    const { color, pre } = LOG_TYPES[type] || LOG_TYPES.info;
    setLogs(l => [...l.slice(-200), { id: Date.now() + Math.random(), ts, msg: pre + msg, color }]);
  };

  // ── Simulate packets in browser (no TCP needed for demo mode) ─
  const DELHI_ROUTES = [
    [28.6139,77.2090],[28.6145,77.2105],[28.6152,77.2120],[28.6160,77.2135],
    [28.6168,77.2150],[28.6175,77.2165],[28.6168,77.2165],[28.6160,77.2165],
  ];

  const getNextPosition = () => {
    let lat = parseFloat(startLat), lng = parseFloat(startLng), spd = 45, hdg = 90;
    switch (route) {
      case "circle":
        angleRef.current += 0.06;
        lat = parseFloat(startLat) + Math.sin(angleRef.current) * 0.01;
        lng = parseFloat(startLng) + Math.cos(angleRef.current) * 0.01;
        hdg = ((angleRef.current * 57.3) + 90) % 360;
        spd = 35 + Math.floor(Math.random() * 25);
        break;
      case "straight":
        lat = parseFloat(startLat) + (pktCountRef.current * 0.0002);
        lng = parseFloat(startLng) + (pktCountRef.current * 0.0002);
        spd = 55; hdg = 45;
        break;
      case "stationary":
        spd = 0; hdg = 0;
        break;
      case "overspeed":
        lat = parseFloat(startLat) + (pktCountRef.current * 0.0003);
        spd = 130 + Math.floor(Math.random()*40); hdg = 90;
        break;
      case "replay": {
        const pt = DELHI_ROUTES[routeIdxRef.current % DELHI_ROUTES.length];
        lat = pt[0]; lng = pt[1];
        spd = routeIdxRef.current % 3 === 0 ? 0 : 40;
        hdg = 90;
        routeIdxRef.current++;
        break;
      }
      case "random":
        lat = parseFloat(startLat) + (Math.random()-0.5)*0.05;
        lng = parseFloat(startLng) + (Math.random()-0.5)*0.05;
        spd = Math.floor(Math.random()*90); hdg = Math.floor(Math.random()*360);
        break;
    }
    return { lat, lng, speed: ignition ? spd : 0, heading: hdg };
  };

  const injectToAPI = async (pos) => {
    // Inject GPS data directly via internal API (simulates TCP server processing)
    try {
      await api.post("/devices/simulate", {
        imei,
        latitude:  pos.lat,
        longitude: pos.lng,
        speed:     pos.speed,
        heading:   pos.heading,
        altitude:  50,
        satellites: 8,
        ignition,
        battery_voltage: 12.4,
        gsm_signal: 85,
      });
    } catch (e) {
      // Silently fail — device may not exist yet
    }
  };

  const startSimulator = async () => {
    if (status === "online") return;

    // Verify device exists
    const exists = devices.find(d => d.imei === imei);
    if (!exists) {
      addLog(`IMEI ${imei} not found in devices. Add this device first!`, "error");
      addLog("Go to Devices → + Add Device → IMEI: " + imei, "warning");
      return;
    }

    setStatus("connecting");
    addLog(`Connecting simulator for IMEI: ${imei}`, "info");
    addLog(`Route: ${route.toUpperCase()} | Interval: ${interval}ms`, "system");

    await new Promise(r => setTimeout(r, 800));
    setStatus("online");
    setPackets(0);
    pktCountRef.current = 0;
    addLog(`Device ONLINE ✅ — Transmitting every ${interval}ms`, "success");
    addLog("", "system");

    workerRef.current = setInterval(async () => {
      if (!ignition && route !== "stationary") {
        addLog("Ignition OFF — sending zero-speed packet", "warning");
      }
      const pos = getNextPosition();
      setSpeed(pos.speed);
      setLiveData(pos);
      pktCountRef.current++;
      setPackets(pktCountRef.current);

      // Push to API
      await injectToAPI(pos);

      addLog(
        `#${pktCountRef.current} | ${pos.lat.toFixed(5)},${pos.lng.toFixed(5)} | ${pos.speed}km/h | hdg:${Math.round(pos.heading)}° | ign:${ignition?"ON":"OFF"}`,
        pos.speed > 120 ? "warning" : "packet"
      );

      // Random alarm
      if (Math.random() < 0.02) {
        const alarms = ["SOS","power_cut","vibration","low_battery"];
        const alm = alarms[Math.floor(Math.random()*alarms.length)];
        addLog(`🚨 ALARM: ${alm.toUpperCase()} triggered!`, "error");
      }
    }, parseInt(interval));
  };

  const stopSimulator = () => {
    clearInterval(workerRef.current);
    workerRef.current = null;
    setStatus("disconnected");
    setSpeed(0);
    addLog("Simulator STOPPED", "warning");
    addLog(`Session: ${packets} packets sent`, "system");
  };

  const sendAlarm = async () => {
    if (status !== "online") return;
    addLog("🚨 SOS ALARM sent manually!", "error");
    try {
      await api.post("/devices/simulate", { imei, alarm: "SOS", latitude: liveData?.lat, longitude: liveData?.lng });
    } catch {}
  };

  const triggerOverspeed = () => {
    if (status !== "online") return;
    const origRoute = route;
    setRoute("overspeed");
    addLog("🏎️  OVERSPEED mode: 130-170 km/h for 30s", "warning");
    setTimeout(() => { setRoute(origRoute); addLog("Speed normalized", "info"); }, 30000);
  };

  const toggleIgnition = () => {
    const next = !ignition;
    setIgnition(next);
    addLog(`Engine ${next ? "STARTED 🟢" : "STOPPED 🔴"}`, next ? "success" : "warning");
  };

  const clearLogs = () => setLogs([]);

  const copyCliCommand = () => {
    const cmd = `node simulator.js --imei=${imei} --host=${host} --port=${port} --route=${route} --interval=${interval} --lat=${startLat} --lng=${startLng}`;
    navigator.clipboard?.writeText(cmd);
    addLog("CLI command copied to clipboard!", "success");
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={S.statusDot(status==="online")} />
          <span style={S.title}>📡 GPS DEVICE SIMULATOR & TESTER</span>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"12px", color: status==="online" ? "#22c55e" : status==="connecting" ? "#fbbf24" : "#64748b", fontWeight:700 }}>
            {status === "online" ? "● TRANSMITTING" : status === "connecting" ? "◌ CONNECTING..." : "○ IDLE"}
          </span>
          {packets > 0 && <span style={{ fontSize:"11px", background:"#1e293b", padding:"3px 10px", borderRadius:"20px", color:"#94a3b8" }}>{packets} packets</span>}
        </div>
      </div>

      <div style={S.body}>
        {/* ── LEFT: CONTROLS ── */}
        <div style={S.sidebar}>

          {/* Device Select */}
          <div style={S.card}>
            <span style={S.label}>Select Device</span>
            <select style={S.select} value={imei} onChange={e => setImei(e.target.value)}>
              <option value="">-- Custom IMEI --</option>
              {devices.map(d => (
                <option key={d.id} value={d.imei}>{d.vehicle_number} ({d.imei})</option>
              ))}
            </select>
            <div style={{ marginTop:"8px" }}>
              <span style={S.label}>Custom IMEI</span>
              <input style={S.input} value={imei} onChange={e => setImei(e.target.value)} placeholder="15-digit IMEI" maxLength={15} />
            </div>
          </div>

          {/* Connection */}
          <div style={S.card}>
            <span style={S.label}>Connection</span>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:"8px" }}>
              <div><span style={S.label}>Server Host</span><input style={S.input} value={host} onChange={e => setHost(e.target.value)} /></div>
              <div><span style={S.label}>TCP Port</span><input style={S.input} value={port} onChange={e => setPort(e.target.value)} /></div>
            </div>
          </div>

          {/* Route */}
          <div style={S.card}>
            <span style={S.label}>Simulation Route</span>
            <select style={S.select} value={route} onChange={e => setRoute(e.target.value)}>
              <option value="circle">🔄 Circle (live tracking test)</option>
              <option value="straight">➡️  Straight line (trip test)</option>
              <option value="replay">🗺️  City replay (realistic)</option>
              <option value="overspeed">🏎️  Overspeed (alert test)</option>
              <option value="stationary">🅿️  Stationary (idle test)</option>
              <option value="random">🎲 Random (stress test)</option>
            </select>
            <div style={{ marginTop:"8px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              <div><span style={S.label}>Start Lat</span><input style={S.input} value={startLat} onChange={e => setStartLat(e.target.value)} /></div>
              <div><span style={S.label}>Start Lng</span><input style={S.input} value={startLng} onChange={e => setStartLng(e.target.value)} /></div>
            </div>
            <div style={{ marginTop:"8px" }}>
              <span style={S.label}>Packet Interval (ms)</span>
              <select style={S.select} value={interval} onChange={e => setInterval_(e.target.value)}>
                <option value="2000">2s (fast)</option>
                <option value="5000">5s (normal)</option>
                <option value="10000">10s (slow)</option>
                <option value="30000">30s (power saving)</option>
              </select>
            </div>
          </div>

          {/* Main Controls */}
          <div style={{ display:"flex", gap:"8px" }}>
            <button style={{ ...S.btn, background: status==="online" ? "#374151" : "#22c55e", color: status==="online" ? "#94a3b8" : "#fff", flex:1 }}
              onClick={startSimulator} disabled={status === "online"}>
              ▶ Start
            </button>
            <button style={{ ...S.btn, background: status!=="online" ? "#374151" : "#ef4444", color: status!=="online" ? "#94a3b8" : "#fff", flex:1 }}
              onClick={stopSimulator} disabled={status !== "online"}>
              ■ Stop
            </button>
          </div>

          {/* Action Buttons */}
          <div style={S.card}>
            <span style={S.label}>Simulate Events</span>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              <button style={{ ...S.btn, background: ignition ? "#7f1d1d" : "#14532d", color:"#fff" }}
                onClick={toggleIgnition}>
                {ignition ? "🔴 Stop Engine (Ignition OFF)" : "🟢 Start Engine (Ignition ON)"}
              </button>
              <button style={{ ...S.btn, background:"#7c2d12", color:"#fff" }} onClick={sendAlarm} disabled={status!=="online"}>
                🚨 Send SOS Alarm
              </button>
              <button style={{ ...S.btn, background:"#1e3a5f", color:"#93c5fd" }} onClick={triggerOverspeed} disabled={status!=="online"}>
                🏎️ Trigger Overspeed
              </button>
            </div>
          </div>

          {/* Live Stats */}
          {liveData && (
            <div style={S.card}>
              <span style={S.label}>Live Telemetry</span>
              {[
                ["Latitude",  liveData.lat?.toFixed(6)],
                ["Longitude", liveData.lng?.toFixed(6)],
                ["Speed",     speed + " km/h"],
                ["Heading",   Math.round(liveData.heading) + "°"],
                ["Ignition",  ignition ? "ON 🟢" : "OFF 🔴"],
                ["Packets",   packets],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #1e293b", fontSize:"12px" }}>
                  <span style={{ color:"#64748b" }}>{k}</span>
                  <span style={{ color:"#e2e8f0", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* CLI Export */}
          <button style={{ ...S.btn, background:"#1e293b", color:"#64748b", fontSize:"11px" }} onClick={copyCliCommand}>
            📋 Copy CLI Command
          </button>
        </div>

        {/* ── RIGHT: CONSOLE LOG ── */}
        <div style={S.console}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
            <div>
              <div style={{ fontWeight:700, color:"#38bdf8", fontSize:"14px" }}>Device Console</div>
              <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>Real-time packet log & events</div>
            </div>
            <button style={{ ...S.btn, background:"#1e293b", color:"#64748b", width:"auto", padding:"6px 14px", fontSize:"11px" }}
              onClick={clearLogs}>Clear</button>
          </div>

          <div ref={logRef} style={S.logArea}>
            {logs.length === 0 && (
              <div style={{ color:"#334155", textAlign:"center", marginTop:"60px" }}>
                <div style={{ fontSize:"32px", marginBottom:"12px" }}>📡</div>
                <div>Configure device settings and click <strong style={{color:"#22c55e"}}>▶ Start</strong> to begin simulation</div>
                <div style={{ marginTop:"16px", color:"#1e3a5f", fontSize:"11px" }}>
                  Make sure to <strong>add the device</strong> in the Devices page first!
                </div>
              </div>
            )}
            {logs.map(l => (
              <div key={l.id} style={{ color: l.color, marginBottom:"2px" }}>
                <span style={{ color:"#334155", marginRight:"8px" }}>{l.ts}</span>
                {l.msg}
              </div>
            ))}
            {status === "online" && <span style={{ color:"#22c55e", animation:"blink 1s infinite" }}>█</span>}
          </div>

          {/* Instructions */}
          <div style={{ marginTop:"16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
            {[
              { icon:"1️⃣", title:"Add Device First", body:"Go to Devices → + Add Device → Enter IMEI" },
              { icon:"2️⃣", title:"Start Simulator", body:"Click ▶ Start. Device will appear ONLINE." },
              { icon:"3️⃣", title:"See it Live", body:"Open Live Tracking — watch vehicle move on map!" },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ background:"#0f1e2e", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"14px" }}>
                <div style={{ fontSize:"18px", marginBottom:"6px" }}>{icon}</div>
                <div style={{ fontWeight:700, color:"#38bdf8", fontSize:"12px", marginBottom:"4px" }}>{title}</div>
                <div style={{ fontSize:"11px", color:"#475569", lineHeight:"1.5" }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        select option { background: #1e293b; }
      `}</style>
    </div>
  );
}
