import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api/axios";

const VEHICLE_ICONS = { CAR:"🚗", TRUCK:"🚚", BIKE:"🏍️", BUS:"🚌", VAN:"🚐", OTHER:"📍" };

export default function LiveTracking() {
  const [devices,   setDevices]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("ALL");
  const [mapReady,  setMapReady]  = useState(false);
  const [lastUpdate,setLastUpdate]= useState(null);
  const mapRef   = useRef(null);
  const leafRef  = useRef(null);
  const markersRef = useRef({});
  const pollRef  = useRef(null);

  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => setMapReady(true);
    document.head.appendChild(js);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [20.5937, 78.9629], zoom: 5 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19
    }).addTo(map);
    leafRef.current = map;
  }, [mapReady]);

  const updateMarkers = useCallback((data) => {
    const L = window.L;
    if (!L || !leafRef.current) return;
    data.forEach(d => {
      if (!d.latitude || !d.longitude) return;
      const icon = L.divIcon({
        html: `<div style="transform:rotate(${d.heading||0}deg);font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));opacity:${d.status==="ONLINE"?1:0.5};transition:transform .3s">${VEHICLE_ICONS[d.vehicle_type]||"📍"}</div>`,
        className: "", iconSize: [28,28], iconAnchor: [14,14]
      });
      const html = `<div style="font-family:sans-serif;min-width:170px"><b style="font-size:13px">${d.vehicle_number}</b><div style="color:${d.status==="ONLINE"?"#22c55e":"#ef4444"};font-weight:700;margin:3px 0">${d.status}</div><table style="font-size:11px;width:100%"><tr><td>Speed</td><td><b>${d.speed||0} km/h</b></td></tr><tr><td>Ignition</td><td><b>${d.ignition?"ON 🟢":"OFF 🔴"}</b></td></tr><tr><td>Heading</td><td><b>${Math.round(d.heading||0)}°</b></td></tr><tr><td>Signal</td><td><b>${d.gsm_signal||0}%</b></td></tr><tr><td>Battery</td><td><b>${d.battery_voltage||0}V</b></td></tr><tr><td>Satellites</td><td><b>${d.satellites||0}</b></td></tr><tr><td>Last seen</td><td><b>${d.last_seen?new Date(d.last_seen).toLocaleTimeString():"-"}</b></td></tr></table></div>`;
      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng([d.latitude,d.longitude]);
        markersRef.current[d.id].setIcon(icon);
        markersRef.current[d.id].getPopup()?.setContent(html);
      } else {
        markersRef.current[d.id] = L.marker([d.latitude,d.longitude],{icon}).addTo(leafRef.current).bindPopup(html);
      }
    });
    Object.keys(markersRef.current).forEach(id => {
      if (!data.find(d=>d.id===id)) { leafRef.current.removeLayer(markersRef.current[id]); delete markersRef.current[id]; }
    });
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const r = await api.get("/devices/live");
      const data = r.data || [];
      setDevices(data);
      setLastUpdate(new Date());
      updateMarkers(data);
    } catch { } finally { setLoading(false); }
  }, [updateMarkers]);

  useEffect(() => {
    fetchLive();
    pollRef.current = setInterval(fetchLive, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchLive]);

  const focusDevice = (device) => {
    setSelected(device);
    if (leafRef.current && device.latitude && device.longitude) {
      leafRef.current.flyTo([device.latitude, device.longitude], 16, { duration: 1.2 });
      markersRef.current[device.id]?.openPopup();
    }
  };

  const fitAll = () => {
    if (!leafRef.current) return;
    const pts = devices.filter(d=>d.latitude&&d.longitude).map(d=>[d.latitude,d.longitude]);
    if (pts.length) leafRef.current.fitBounds(pts, { padding: [40,40] });
  };

  const filtered = devices.filter(d => {
    if (filter !== "ALL" && d.status !== filter) return false;
    if (search && !d.vehicle_number?.toLowerCase().includes(search.toLowerCase()) && !d.imei?.includes(search)) return false;
    return true;
  });

  const onlineCount = devices.filter(d=>d.status==="ONLINE").length;

  return (
    <div style={{display:"flex",height:"calc(100vh - 64px)",overflow:"hidden"}}>
      {/* Left Panel */}
      <div style={{width:"290px",background:"#fff",borderRight:"1px solid #e2e8f0",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #e2e8f0"}}>
          <div style={{fontWeight:700,fontSize:"15px"}}>🗺 Live Tracking</div>
          <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>{lastUpdate?`Updated ${lastUpdate.toLocaleTimeString()}`:"Loading..."}</div>
          <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            {[["Online",onlineCount,"#dcfce7","#166534"],["Offline",devices.length-onlineCount,"#fee2e2","#991b1b"],["Total",devices.length,"#f1f5f9","#0f172a"]].map(([l,v,bg,c])=>(
              <div key={l} style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:"8px",background:bg}}>
                <b style={{color:c,fontSize:"16px"}}>{v}</b>
                <div style={{fontSize:"10px",color:c}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <input style={{margin:"10px 16px 4px",padding:"8px 10px",border:"1px solid #e2e8f0",borderRadius:"8px",fontSize:"13px",outline:"none",width:"calc(100% - 52px)"}} placeholder="Search vehicle / IMEI..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{display:"flex",padding:"4px 16px 8px",gap:"6px"}}>
          {["ALL","ONLINE","OFFLINE"].map(f=>(
            <button key={f} style={{flex:1,padding:"5px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:700,background:filter===f?"#3b82f6":"#f1f5f9",color:filter===f?"#fff":"#64748b"}} onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {loading && <div style={{padding:"24px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:"13px"}}>
              {devices.length===0?"No devices yet.\nRun Device Tester to simulate a GPS device!":"No devices match filter"}
            </div>
          )}
          {filtered.map(d=>(
            <div key={d.id} style={{padding:"11px 16px",borderBottom:"1px solid #f1f5f9",cursor:"pointer",background:selected?.id===d.id?"#eff6ff":"transparent"}} onClick={()=>focusDevice(d)}>
              <div style={{display:"flex",alignItems:"center"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:d.status==="ONLINE"?"#22c55e":"#ef4444",marginRight:"7px",flexShrink:0}} />
                <span style={{fontWeight:600,fontSize:"13px"}}>{d.vehicle_number}</span>
                <span style={{marginLeft:"auto",fontSize:"18px"}}>{VEHICLE_ICONS[d.vehicle_type]||"📍"}</span>
              </div>
              <div style={{fontSize:"11px",color:"#64748b",marginTop:"3px",display:"flex",gap:"10px"}}>
                <span>{d.speed||0} km/h</span>
                <span style={{color:d.ignition?"#16a34a":"#dc2626"}}>{d.ignition?"IGN ON":"IGN OFF"}</span>
                {!d.latitude&&<span style={{color:"#f59e0b"}}>⚠ No GPS</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:"10px 16px",borderTop:"1px solid #e2e8f0",display:"flex",gap:"8px"}}>
          <button style={{flex:1,padding:"8px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:700}} onClick={fitAll}>🗺 Fit All</button>
          <button style={{padding:"8px 12px",background:"#f1f5f9",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px"}} onClick={fetchLive}>🔄</button>
        </div>
      </div>

      {/* Map */}
      <div style={{flex:1,position:"relative"}}>
        {!mapReady&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",zIndex:100}}><div style={{textAlign:"center"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🗺</div><div style={{color:"#94a3b8"}}>Loading map...</div></div></div>}
        <div ref={mapRef} style={{width:"100%",height:"100%"}} />
        {selected&&(
          <div style={{position:"absolute",top:"12px",right:"12px",zIndex:999,background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"14px",boxShadow:"0 4px 20px rgba(0,0,0,.1)",minWidth:"180px"}}>
            <div style={{fontWeight:700,fontSize:"14px"}}>{selected.vehicle_number}</div>
            <div style={{fontSize:"12px",marginTop:"6px",color:"#475569"}}>
              <div style={{marginBottom:"3px"}}>Speed: <b>{selected.speed||0} km/h</b></div>
              <div style={{marginBottom:"3px"}}>Ignition: <b style={{color:selected.ignition?"#22c55e":"#ef4444"}}>{selected.ignition?"ON":"OFF"}</b></div>
              <div style={{marginBottom:"3px"}}>Heading: <b>{Math.round(selected.heading||0)}°</b></div>
              {selected.latitude&&<div style={{fontSize:"10px",color:"#94a3b8",marginTop:"6px"}}>{selected.latitude?.toFixed(5)}, {selected.longitude?.toFixed(5)}</div>}
            </div>
            <button style={{marginTop:"8px",width:"100%",padding:"4px",border:"none",background:"#f1f5f9",borderRadius:"4px",cursor:"pointer",fontSize:"11px"}} onClick={()=>setSelected(null)}>✕</button>
          </div>
        )}
        {!loading&&devices.length===0&&(
          <div style={{position:"absolute",bottom:"24px",left:"50%",transform:"translateX(-50%)",background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"16px 24px",boxShadow:"0 4px 20px rgba(0,0,0,.1)",textAlign:"center",zIndex:999,whiteSpace:"nowrap"}}>
            <div style={{fontSize:"24px",marginBottom:"6px"}}>📡</div>
            <div style={{fontWeight:600,color:"#0f172a",fontSize:"13px"}}>No GPS data yet</div>
            <div style={{fontSize:"12px",color:"#64748b",marginTop:"4px"}}>Go to <b>Admin → Device Tester</b> to simulate a GPS device</div>
          </div>
        )}
      </div>
    </div>
  );
}
