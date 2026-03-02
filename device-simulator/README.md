# 📡 GPS Device Simulator — How To Test Without Real Hardware

## Quick Start (3 Steps)

### Step 1: Add a Device in the Portal
1. Open your portal at `http://YOUR-IP:5025`
2. Login as `admin@gps.local` / `Admin@123!`
3. Go to **Devices** → **+ Add Device**
4. Enter **IMEI: `123456789012345`**
5. Vehicle number: `TEST-01`, Type: `CAR`
6. Click **Add Device** → ✅

### Step 2: Run the Simulator
```bash
cd device-simulator
node simulator.js --imei=123456789012345 --host=YOUR-SERVER-IP --port=5023 --route=circle
```

> **If running locally (Docker):** use `--host=localhost`
> **If testing on AWS:** use `--host=3.108.114.12` (your server IP)

### Step 3: Watch It Go Live!
- Go to **Live Tracking** page in portal
- You'll see your vehicle appear on the map within 5 seconds
- Watch it moving in a circle in real-time!

---

## Route Options

| Route | Description | Use For |
|-------|-------------|---------|
| `circle` | Circular path (default) | Normal live tracking test |
| `straight` | Northeast diagonal | Trip recording test |
| `random` | Random movement | Stress test |
| `stationary` | No movement, ignition ON | Idle detection test |
| `overspeed` | 130-170 km/h | Overspeed alert test |
| `replay` | Delhi city route | Route playback test |

```bash
# Examples:
node simulator.js --route=circle       # Moving in circle
node simulator.js --route=overspeed    # Trigger speed alerts
node simulator.js --route=stationary   # Parked vehicle
node simulator.js --route=replay       # Real city route

# Custom location (Mumbai):
node simulator.js --lat=19.0760 --lng=72.8777 --route=circle

# Faster updates (every 2 seconds):
node simulator.js --interval=2000
```

## Multiple Devices (Load Test)
```bash
# Run 10 simulated devices simultaneously:
node multi-simulator.js --count=10 --host=YOUR-IP --port=5023
```

## Interactive Commands
While simulator is running, type:
| Key | Action |
|-----|--------|
| `s` | Stop engine (ignition OFF) → triggers alert |
| `r` | Resume engine (ignition ON) |
| `a` | Send SOS alarm → triggers critical alert |
| `x` | Overspeed mode (140 km/h for 30s) |
| `d` | Disconnect (test reconnect logic) |
| `q` | Quit simulator |

## Testing Checklist

### ✅ Basic Connectivity Test
```
1. Add device with IMEI in portal
2. Start simulator
3. Check: device status becomes ONLINE ✓
4. Check: Live Tracking shows vehicle ✓
5. Check: GPS history being stored ✓
```

### ✅ Alert Tests
```
1. Run overspeed route → overspeed alert fires
2. Type 'a' for SOS → critical alert created
3. Type 's' to stop engine → ignition OFF alert
4. Kill simulator → device goes OFFLINE alert (after 5 min)
```

### ✅ Command Test (Ignition Cut)
```
1. Simulator running (ignition ON)
2. In portal → Devices → Select device → Send Command → IGNITION_OFF
3. Simulator shows: "🔴 Ignition CUT — engine stopped"
4. Command log shows SUCCESS
```

### ✅ Trip Recording Test
```
1. Run 'circle' or 'straight' route for 5+ minutes
2. Go to Trips page → trip should appear
3. Stop engine (type 's') → trip ends
4. Check: distance, duration, driver score calculated
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Check TCP server running: `docker ps` |
| Device stays OFFLINE | Verify IMEI matches exactly in database |
| No location on map | Check Redis is running, gps_worker processing |
| Commands not received | Check simulator is reading port 5023 responses |

## Understanding Packet Flow
```
Simulator → TCP Server (port 5023)
    ↓ Login packet (IMEI validation)
    ↓ Location packets (every 5s)
    ↓ Heartbeat (every 30s)
    ↓
TCP Server → Redis (gps_queue) → GPS Worker → PostgreSQL
    ↓
GPS Worker → Socket.IO → Browser (live update)
```

## IMEI Numbers for Testing
Use these pre-registered test IMEIs:
- `123456789012345` - Test Car 1
- `123456789012346` - Test Truck 1  
- `123456789012347` - Test Bike 1

Register each in your portal before starting the simulator!
