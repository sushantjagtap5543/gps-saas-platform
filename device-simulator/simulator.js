#!/usr/bin/env node
/**
 * ============================================================
 * GPS DEVICE SIMULATOR v2.0
 * Simulates a GT06 GPS device for testing WITHOUT real hardware
 * Usage: node simulator.js --imei=123456789012345 --host=localhost --port=5023
 * Routes: circle | straight | random | stationary | overspeed | replay
 * ============================================================
 */

const net = require("net");
const args = process.argv.slice(2).reduce((a, v) => {
  const [k, val] = v.replace("--","").split("=");
  a[k] = val;
  return a;
}, {});

const CONFIG = {
  IMEI:     args.imei     || "123456789012345",
  HOST:     args.host     || process.env.TCP_HOST || "localhost",
  PORT:     parseInt(args.port     || process.env.TCP_PORT || "5023"),
  INTERVAL: parseInt(args.interval || "5000"),
  START_LAT: parseFloat(args.lat  || "28.6139"),
  START_LNG: parseFloat(args.lng  || "77.2090"),
  SPEED:    parseInt(args.speed   || "45"),
  ROUTE:    args.route    || "circle",
};

console.log("\n╔══════════════════════════════════════════╗");
console.log("║     GPS DEVICE SIMULATOR v2.0             ║");
console.log("╠══════════════════════════════════════════╣");
console.log(`║ IMEI    : ${CONFIG.IMEI.padEnd(31)}║`);
console.log(`║ Server  : ${(CONFIG.HOST+":"+CONFIG.PORT).padEnd(31)}║`);
console.log(`║ Route   : ${CONFIG.ROUTE.padEnd(31)}║`);
console.log(`║ Interval: ${(CONFIG.INTERVAL+"ms").padEnd(31)}║`);
console.log("╚══════════════════════════════════════════╝\n");

let lat = CONFIG.START_LAT;
let lng = CONFIG.START_LNG;
let speed = CONFIG.SPEED;
let heading = 90;
let ignition = true;
let packetCount = 0;
let angleOffset = 0;
let routeIdx = 0;
let connected = false;
let socket = null;
let heartbeatTimer = null;
let locationTimer = null;

// ── CRC16 XMODEM ─────────────────────────────────────────────
function crc16(buf) {
  let crc = 0xFFFF;
  for (const b of buf) {
    crc ^= (b << 8);
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc & 0xFFFF;
}

// ── GT06 PACKET BUILDERS ─────────────────────────────────────
function buildLoginPacket(imei) {
  const buf = Buffer.alloc(18);
  buf[0] = 0x78; buf[1] = 0x78;
  buf[2] = 0x0F;
  buf[3] = 0x01;
  const iStr = imei.padStart(16,"0");
  for (let i = 0; i < 8; i++) buf[4+i] = parseInt(iStr.slice(i*2, i*2+2), 16);
  buf[12] = 0x00; buf[13] = 0x01;
  const c = crc16(buf.slice(2, 14));
  buf[14] = (c >> 8) & 0xFF; buf[15] = c & 0xFF;
  buf[16] = 0x0D; buf[17] = 0x0A;
  return buf;
}

function buildLocationPacket(lat, lng, spd, hdg, ign) {
  const data = Buffer.alloc(22);
  const now = new Date();
  data[0] = now.getUTCFullYear() - 2000;
  data[1] = now.getUTCMonth() + 1;
  data[2] = now.getUTCDate();
  data[3] = now.getUTCHours();
  data[4] = now.getUTCMinutes();
  data[5] = now.getUTCSeconds();
  data[6] = 0x0C; // satellites

  const latInt = Math.round(Math.abs(lat) * 1800000);
  const lngInt = Math.round(Math.abs(lng) * 1800000);
  data.writeUInt32BE(latInt, 7);
  data.writeUInt32BE(lngInt, 11);
  data[15] = Math.min(Math.max(Math.round(spd), 0), 255);

  let flags = 0x0001; // real GPS fix
  if (lat < 0) flags |= 0x0004;
  if (lng < 0) flags |= 0x0008;
  if (ign)     flags |= 0x8000;
  const hdgBits = (Math.round(hdg) % 360) & 0x1FF;
  flags |= (hdgBits << 3);
  data.writeUInt16BE(flags, 16);
  data.writeUInt16BE(packetCount & 0xFFFF, 18);

  const pktLen = data.length + 3; // protocol + data + serial
  const full = Buffer.alloc(pktLen + 5);
  full[0] = 0x78; full[1] = 0x78;
  full[2] = pktLen;
  full[3] = 0x12; // location protocol
  data.copy(full, 4);
  const c = crc16(full.slice(2, 4 + data.length));
  full[4 + data.length] = (c >> 8) & 0xFF;
  full[5 + data.length] = c & 0xFF;
  full[6 + data.length] = 0x0D;
  full[7 + data.length] = 0x0A;
  return full.slice(0, 8 + data.length);
}

function buildHeartbeatPacket() {
  const buf = Buffer.alloc(10);
  buf[0]=0x78; buf[1]=0x78; buf[2]=0x05; buf[3]=0x13;
  buf[4]=0x00; buf[5]=0x01;
  const c = crc16(buf.slice(2, 6));
  buf[6]=(c>>8)&0xFF; buf[7]=c&0xFF;
  buf[8]=0x0D; buf[9]=0x0A;
  return buf;
}

function buildAlarmPacket(alarmType) {
  // Simplified alarm packet
  return Buffer.from([0x78,0x78,0x0A,0x16,0x00,0x00,0x00,0x00,alarmType,0x00,0x01,0xD9,0xDC,0x0D,0x0A]);
}

// ── ROUTE SIMULATION ─────────────────────────────────────────
const DELHI_ROUTES = [
  [28.6139,77.2090],[28.6145,77.2105],[28.6152,77.2120],[28.6160,77.2135],
  [28.6168,77.2150],[28.6175,77.2165],[28.6168,77.2165],[28.6160,77.2165],
  [28.6152,77.2160],[28.6139,77.2090],
];

function updatePosition() {
  switch (CONFIG.ROUTE) {
    case "circle":
      angleOffset += 0.005;
      lat = CONFIG.START_LAT + Math.sin(angleOffset) * 0.01;
      lng = CONFIG.START_LNG + Math.cos(angleOffset) * 0.01;
      heading = ((Math.atan2(Math.cos(angleOffset), Math.sin(angleOffset)) * 180 / Math.PI) + 360) % 360;
      speed = 35 + Math.floor(Math.random() * 25);
      ignition = true;
      break;
    case "straight":
      lat += 0.00015; lng += 0.00015;
      heading = 45; speed = CONFIG.SPEED;
      ignition = true;
      break;
    case "random":
      lat  += (Math.random()-0.5) * 0.002;
      lng  += (Math.random()-0.5) * 0.002;
      heading = Math.floor(Math.random()*360);
      speed = Math.floor(Math.random()*80);
      ignition = true;
      break;
    case "stationary":
      speed = 0; heading = 0; ignition = true;
      break;
    case "overspeed":
      lat += 0.0003; heading = 90;
      speed = 130 + Math.floor(Math.random()*40);
      ignition = true;
      break;
    case "replay":
      const pt = DELHI_ROUTES[routeIdx % DELHI_ROUTES.length];
      lat = pt[0]; lng = pt[1];
      speed = routeIdx % 3 === 0 ? 0 : 40;
      heading = routeIdx % 2 === 0 ? 90 : 180;
      routeIdx++;
      break;
    case "nighttrip":
      lat += 0.00012; lng -= 0.00008; heading = 210; speed = 55;
      break;
  }
}

// ── CONNECTION ────────────────────────────────────────────────
function connect() {
  socket = new net.Socket();
  socket.setTimeout(60000);

  socket.connect(CONFIG.PORT, CONFIG.HOST, () => {
    connected = true;
    console.log(`\n✅ Connected to ${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`📡 Sending LOGIN packet with IMEI: ${CONFIG.IMEI}`);
    socket.write(buildLoginPacket(CONFIG.IMEI));
  });

  socket.on("data", (data) => {
    if (!data || data.length < 4) return;
    const proto = data[3];
    if (proto === 0x01) {
      console.log(`✅ LOGIN ACK — Device [${CONFIG.IMEI}] is ONLINE\n`);
      startTransmission();
    } else if (proto === 0x80) {
      const cmdBuf = data.slice(4, data.length - 4);
      const cmd = cmdBuf.toString("ascii").replace(/\x00/g,"").trim();
      console.log(`\n📩 SERVER COMMAND: "${cmd}"`);
      setTimeout(() => {
        if (/RELAY,1|IGNITION_OFF|ENGINE_OFF/i.test(cmd)) {
          ignition = false; speed = 0;
          console.log("🔴 Ignition CUT — engine stopped (simulated)");
        } else if (/RELAY,0|IGNITION_ON|ENGINE_ON/i.test(cmd)) {
          ignition = true; speed = CONFIG.SPEED;
          console.log("🟢 Ignition ON — engine running (simulated)");
        } else if (/REBOOT/i.test(cmd)) {
          console.log("♻️  Device REBOOT (simulated) — reconnecting...");
          socket.destroy();
        }
        // Send ACK
        socket.write(Buffer.from([0x78,0x78,0x05,0x80,0x00,0x01,0xD9,0xDC,0x0D,0x0A]));
      }, 800 + Math.random()*600);
    }
  });

  socket.on("error", (err) => {
    console.error(`❌ Error: ${err.message}`);
    connected = false;
  });

  socket.on("timeout", () => { socket.destroy(); });

  socket.on("close", () => {
    connected = false;
    clearInterval(heartbeatTimer);
    clearInterval(locationTimer);
    console.log(`\n📴 Disconnected. Reconnecting in 5s...`);
    setTimeout(connect, 5000);
  });
}

function startTransmission() {
  heartbeatTimer = setInterval(() => {
    if (connected) socket.write(buildHeartbeatPacket());
  }, 30000);

  locationTimer = setInterval(() => {
    if (!connected) return;
    updatePosition();
    try {
      const pkt = buildLocationPacket(lat, lng, speed, heading, ignition);
      socket.write(pkt);
      packetCount++;
      const st = ignition ? "🟢 IGN:ON" : "🔴 IGN:OFF";
      process.stdout.write(`\r${st} | #${packetCount} | ${lat.toFixed(5)},${lng.toFixed(5)} | ${speed}km/h | ${Math.round(heading)}°     `);
    } catch(e) {
      console.error("\nPacket build error:", e.message);
    }

    // Simulate random alarm every ~100 packets
    if (Math.random() < 0.01) {
      const types = [0x01,0x02,0x03,0x09];
      socket.write(buildAlarmPacket(types[Math.floor(Math.random()*types.length)]));
    }
  }, CONFIG.INTERVAL);
}

// ── INTERACTIVE KEYBOARD CONTROL ─────────────────────────────
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("💡 Keyboard: [s]=stop engine  [r]=resume  [a]=alarm  [x]=overspeed  [d]=disconnect  [q]=quit\n");

rl.on("line", (cmd) => {
  switch(cmd.trim().toLowerCase()) {
    case "s": ignition=false; speed=0; console.log("\n🔴 Engine stopped"); break;
    case "r": ignition=true; speed=CONFIG.SPEED; console.log("\n🟢 Engine running"); break;
    case "a": if(socket&&connected) socket.write(buildAlarmPacket(0x01)); console.log("\n🚨 SOS alarm sent"); break;
    case "x": speed=140; console.log("\n🏎️  Overspeed: 140km/h (resets in 30s)"); setTimeout(()=>{speed=CONFIG.SPEED;},30000); break;
    case "d": if(socket) socket.destroy(); console.log("\n📴 Disconnecting..."); break;
    case "q": console.log("\n👋 Simulator stopped"); process.exit(0); break;
    case "h":
    default:
      console.log("\nCommands: s=stop s=stop engine, r=resume, a=alarm, x=overspeed, d=disconnect, q=quit");
  }
});

connect();
