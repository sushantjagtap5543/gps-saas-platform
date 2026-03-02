# 🧪 How to Add Devices & Test — Complete Guide

## Step 1: Add a Test Device (2 minutes)

1. Open portal → Login as admin
2. Go to **Devices** in sidebar
3. Click **"+ Add Device"**
4. Fill in:
   - **IMEI**: `123456789012345` (must be 15 digits)
   - **Vehicle Number**: `TEST-CAR-01`
   - **Vehicle Type**: CAR
5. Click **Save** → Device appears as INACTIVE

## Step 2: Use the Built-In Device Tester

1. In sidebar, go to **Admin → Device Tester** (🧪)
2. Select your device from the dropdown (or type IMEI)
3. Choose a **Route**:
   - 🔄 **Circle** — vehicle drives in a circle (best for testing)
   - 🏎️ **Overspeed** — triggers speed alert
   - 🅿️ **Stationary** — parked vehicle
4. Click **▶ Start**
5. Watch the console log fill up — device is ONLINE!

## Step 3: See Vehicle on Live Map

1. Go to **Live Tracking** in sidebar
2. Your vehicle appears with a direction arrow!
3. Click the vehicle to see speed, ignition, battery etc.

## Step 4: Test Features

### Test Ignition Cut
1. Device Tester → Start simulator
2. In Devices page → select device → Send Command → **IGNITION_OFF**
3. Watch simulator log: `🔴 Ignition CUT`

### Test Alerts
1. Select route **Overspeed** → alerts fire automatically
2. Click **🚨 Send SOS Alarm** button → critical alert created
3. Check **Alerts** page to see them

### Test Trip Recording
1. Start simulator on **Circle** route for 5+ minutes
2. Go to **Trips** page → trip recorded automatically!

---

## CLI Simulator (Run on Your Machine)

If you have Node.js installed:

```bash
cd device-simulator
node simulator.js --imei=123456789012345 --host=YOUR_SERVER_IP --port=5023 --route=circle
```

Replace `YOUR_SERVER_IP` with your server's IP (e.g., `3.110.216.100`)

### Multiple Devices (Load Test)
```bash
node multi-simulator.js --count=10 --host=YOUR_SERVER_IP --port=5023
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Device stays INACTIVE | IMEI must match exactly. Check Devices page |
| No vehicle on map | Wait 5 seconds — map auto-refreshes |
| Simulator says "Device not found" | Add IMEI in Devices first |
| Commands not working | Device must be ONLINE (simulator running) |

## Default Login
- **URL**: `http://YOUR_IP:5025`
- **Email**: `admin@gps.local`
- **Password**: `Admin@123!`
