#!/usr/bin/env node
/**
 * Multi-Device Simulator
 * Simulates multiple GPS devices simultaneously for load testing
 * Usage: node multi-simulator.js --count=10 --host=localhost --port=5023
 */

const { spawn } = require("child_process");
const net = require("net");

const args = process.argv.slice(2).reduce((a,v) => {
  const [k,val] = v.replace("--","").split("=");
  a[k]=val; return a;
}, {});

const COUNT  = parseInt(args.count || "5");
const HOST   = args.host || "localhost";
const PORT   = parseInt(args.port || "5023");
const ROUTES = ["circle","straight","random","overspeed","replay"];

const BASE_IMEI = 123456789000000;

const CRC16 = (buf) => {
  let c = 0xFFFF;
  for (const b of buf) { c ^= b<<8; for(let i=0;i<8;i++) c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF; }
  return c;
};

function buildLogin(imei) {
  const buf = Buffer.alloc(18);
  buf[0]=0x78; buf[1]=0x78; buf[2]=0x0F; buf[3]=0x01;
  const s = imei.toString().padStart(16,"0");
  for(let i=0;i<8;i++) buf[4+i]=parseInt(s.slice(i*2,i*2+2),16);
  buf[12]=0; buf[13]=1;
  const c=CRC16(buf.slice(2,14)); buf[14]=(c>>8)&0xFF; buf[15]=c&0xFF;
  buf[16]=0x0D; buf[17]=0x0A;
  return buf;
}

function buildLocation(lat,lng,spd,hdg) {
  const data=Buffer.alloc(22); const now=new Date();
  data[0]=now.getUTCFullYear()-2000; data[1]=now.getUTCMonth()+1; data[2]=now.getUTCDate();
  data[3]=now.getUTCHours(); data[4]=now.getUTCMinutes(); data[5]=now.getUTCSeconds();
  data[6]=0x0C;
  const latI=Math.round(Math.abs(lat)*1800000); const lngI=Math.round(Math.abs(lng)*1800000);
  data.writeUInt32BE(latI,7); data.writeUInt32BE(lngI,11); data[15]=Math.min(spd,255);
  let fl=0x0001; if(lat<0)fl|=4; if(lng<0)fl|=8; fl|=(Math.round(hdg)%360)<<3;
  data.writeUInt16BE(fl,16); data.writeUInt16BE(0,18);
  const pktLen=data.length+3; const full=Buffer.alloc(pktLen+5);
  full[0]=0x78;full[1]=0x78;full[2]=pktLen;full[3]=0x12; data.copy(full,4);
  const c=CRC16(full.slice(2,4+data.length)); full[4+data.length]=(c>>8)&0xFF; full[5+data.length]=c&0xFF;
  full[6+data.length]=0x0D; full[7+data.length]=0x0A;
  return full.slice(0,8+data.length);
}

class Device {
  constructor(id, imei) {
    this.id = id;
    this.imei = imei.toString();
    this.lat = 28.5 + Math.random()*0.3;
    this.lng = 77.1 + Math.random()*0.3;
    this.angle = Math.random()*Math.PI*2;
    this.connected = false;
    this.packets = 0;
    this.socket = null;
    this.route = ROUTES[id % ROUTES.length];
  }

  connect() {
    this.socket = new net.Socket();
    this.socket.connect(PORT, HOST, () => {
      this.connected = true;
      this.socket.write(buildLogin(this.imei));
      console.log(`[Dev ${this.id}] ✅ Connected IMEI:${this.imei}`);
    });
    this.socket.on("data", (d) => {
      if (d[3] === 0x01) {
        console.log(`[Dev ${this.id}] ✅ Logged in → ${this.route} route`);
        this.startSending();
      }
    });
    this.socket.on("error", () => { this.connected=false; });
    this.socket.on("close", () => {
      this.connected=false;
      console.log(`[Dev ${this.id}] Disconnected - reconnect in 10s`);
      setTimeout(()=>this.connect(), 10000);
    });
  }

  startSending() {
    setInterval(() => {
      if (!this.connected) return;
      this.angle += 0.008;
      const lat = this.lat + Math.sin(this.angle)*0.01;
      const lng = this.lng + Math.cos(this.angle)*0.01;
      const spd = 30 + Math.floor(Math.random()*50);
      const hdg = (this.angle*57.3)%360;
      this.socket.write(buildLocation(lat, lng, spd, hdg));
      this.packets++;
    }, 5000 + Math.random()*3000);
  }
}

console.log(`\n🚀 Starting ${COUNT} simulated devices on ${HOST}:${PORT}\n`);
const devices = [];
for (let i = 0; i < COUNT; i++) {
  const d = new Device(i+1, BASE_IMEI + i);
  devices.push(d);
  setTimeout(() => d.connect(), i * 1000); // stagger connections
}

// Status report every 30 seconds
setInterval(() => {
  const online = devices.filter(d=>d.connected).length;
  const total  = devices.reduce((a,d)=>a+d.packets, 0);
  console.log(`\n📊 Status: ${online}/${COUNT} online | ${total} total packets sent`);
}, 30000);

console.log("\n[Press Ctrl+C to stop all simulators]");
