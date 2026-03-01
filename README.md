<!-- ============================================================
     GPS SaaS Platform — Complete README
     ============================================================ -->

<div align="center">

```
 ██████╗ ██████╗ ███████╗    ███████╗ █████╗  █████╗ ███████╗
██╔════╝ ██╔══██╗██╔════╝    ██╔════╝██╔══██╗██╔══██╗██╔════╝
██║  ███╗██████╔╝███████╗    ███████╗███████║███████║███████╗
██║   ██║██╔═══╝ ╚════██║    ╚════██║██╔══██║██╔══██║╚════██║
╚██████╔╝██║     ███████║    ███████║██║  ██║██║  ██║███████║
 ╚═════╝ ╚═╝     ╚══════╝    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

### 🛰️ Multi-Tenant GPS Vehicle Tracking Platform

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white)

**Real-time vehicle tracking • Geofencing • Driver Scoring • Razorpay Billing • White-label Branding**

---

</div>

## 📋 Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [AWS Lightsail — Instance Setup](#3-aws-lightsail--instance-setup)
4. [Firewall & Port Configuration](#4-firewall--port-configuration)
5. [All URLs & Access Points](#5-all-urls--access-points)
6. [Default Passwords & Credentials](#6-default-passwords--credentials)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Step-by-Step Deployment](#8-step-by-step-deployment)
9. [GPS Device Configuration](#9-gps-device-configuration)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [CI/CD — GitHub Actions](#12-cicd--github-actions)
13. [Monitoring — Grafana](#13-monitoring--grafana)
14. [Troubleshooting](#14-troubleshooting)
15. [User Roles & Permissions](#15-user-roles--permissions)

---

## 1. Product Overview

GPS SaaS is a **production-ready, multi-tenant GPS fleet tracking platform** that businesses subscribe to for tracking their vehicles in real time. Each business (tenant) gets their own isolated dashboard, devices, geofences, and billing — all running on one shared infrastructure.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Live Tracking** | Real-time vehicle location on Leaflet map via WebSocket |
| 📍 **Geofencing** | Circle geofences with instant entry/exit alerts |
| 🚨 **Smart Alerts** | Overspeed, SOS, power-cut, low battery, geofence alerts |
| 📊 **Driver Scoring** | Automated score (0–100) based on harsh braking/acceleration |
| 💳 **Razorpay Billing** | Subscription plans, payment gateway, auto-expiry |
| 🎨 **White Label** | Per-tenant branding: logo, colours, custom domain |
| 🔔 **Push Notifications** | Firebase FCM alerts to mobile devices |
| 📈 **Prometheus Metrics** | Full observability with Grafana dashboards |
| 🔐 **JWT Auth** | Access + Refresh token auth with RBAC (Admin/Client/Subuser) |
| 📄 **PDF Invoices** | Auto-generated invoices for each payment |

### 🏗️ Technology Stack

```
Frontend:     React 18 + Vite + React-Leaflet + Socket.IO Client + TailwindCSS
Admin Panel:  React 18 + Vite (separate app at /admin/)
Backend:      Node.js 20 + Express 4 + Sequelize 6 + Socket.IO 4
Database:     PostgreSQL 15 + PostGIS (partitioned gps_history table)
Cache/Queue:  Redis 7 (GPS queue + session state)
TCP Server:   Node.js (GT06 binary protocol parser)
Reverse Proxy: Nginx (SSL + routing + WebSocket + TCP stream)
Containers:   Docker Compose (8 services)
CI/CD:        GitHub Actions → SSH deploy to Lightsail
Monitoring:   Prometheus + Grafana
Payments:     Razorpay (UPI, cards, netbanking)
Push Alerts:  Firebase Cloud Messaging
```

---

## 2. System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                    INTERNET / PUBLIC ACCESS                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   🌐 Web Browser          📡 GPS Device (GT06)                  ║
║   (Client / Admin)        (Vehicle tracker)                      ║
║        │                        │                                ║
║        │ HTTP/HTTPS :80/:443    │ TCP :5000                      ║
║        ▼                        ▼                                ║
╠══════════════════════════════════════════════════════════════════╣
║                     NGINX REVERSE PROXY                         ║
║                   (Docker container)                             ║
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  :80  HTTP  →  redirect to HTTPS or serve directly      │    ║
║  │  :443 HTTPS →  SSL termination → route to services      │    ║
║  │  :5000 TCP  →  stream proxy to tcp-server container     │    ║
║  │                                                          │    ║
║  │  Routes:                                                 │    ║
║  │  /          → frontend:80   (React client app)          │    ║
║  │  /api/      → backend:3000  (REST API)                  │    ║
║  │  /socket.io/→ backend:3000  (WebSocket)                 │    ║
║  │  /admin/    → gps-admin:80  (Admin panel)               │    ║
║  │  /health    → backend:3000  (health check)              │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                   APPLICATION LAYER (Docker)                     ║
║                                                                  ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          ║
║  │   backend    │  │   frontend   │  │  gps-admin   │          ║
║  │  Express API │  │ React + Map  │  │ React Admin  │          ║
║  │  Socket.IO   │  │   Vite SPA   │  │  Dashboard   │          ║
║  │  :3000       │  │   :80        │  │  :80         │          ║
║  └──────┬───────┘  └──────────────┘  └──────────────┘          ║
║         │                                                         ║
║  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐          ║
║  │  tcp-server  │  │notifications │  │   grafana    │          ║
║  │  GT06 parser │  │ Firebase FCM │  │  Dashboards  │          ║
║  │  :5000       │  │ Queue worker │  │  :3001       │          ║
║  └──────────────┘  └──────────────┘  └──────┬───────┘          ║
║                                              │                   ║
║                                    ┌─────────┴──────┐           ║
║                                    │   prometheus   │           ║
║                                    │  Metrics scrape│           ║
║                                    └────────────────┘           ║
╠══════════════════════════════════════════════════════════════════╣
║                       DATA LAYER (Docker)                        ║
║                                                                  ║
║  ┌──────────────────────────┐  ┌──────────────────────────┐    ║
║  │     PostgreSQL 15        │  │        Redis 7            │    ║
║  │  + PostGIS extension     │  │                           │    ║
║  │                          │  │  GPS packet queue         │    ║
║  │  12 tables:              │  │  Command queue            │    ║
║  │  users, devices,         │  │  Alert queue              │    ║
║  │  gps_live, gps_history   │  │  Session state cache      │    ║
║  │  subscriptions, plans,   │  │  maxmemory: 512MB         │    ║
║  │  geofences, alert_events │  │                           │    ║
║  │  brandings, analytics,   │  │  :6379 (internal only)    │    ║
║  │  command_logs, audit_logs│  │                           │    ║
║  │  :5432 (internal only)   │  └──────────────────────────┘    ║
║  └──────────────────────────┘                                    ║
╠══════════════════════════════════════════════════════════════════╣
║                  GPS DATA FLOW (Real-time)                       ║
║                                                                  ║
║  📡 Device → TCP:5000 → parser → Redis queue → GPS Worker       ║
║                                                    │             ║
║                                         ┌──────────┼──────────┐ ║
║                                         ▼          ▼          ▼ ║
║                                    gps_live   geofence     history║
║                                    upsert     checker      insert ║
║                                         │          │              ║
║                                         └──────────┘              ║
║                                              │                    ║
║                                    WebSocket emit                 ║
║                                         │                        ║
║                                    🌐 Browser map updates        ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 3. AWS Lightsail — Instance Setup

### 📋 Recommended Instance Specs

```
┌─────────────────────────────────────────────────┐
│           AWS LIGHTSAIL INSTANCE                │
├─────────────────┬───────────────────────────────┤
│ OS              │ Ubuntu 22.04 LTS               │
│ RAM             │ 4 GB minimum (2 GB WILL FAIL)  │
│ vCPUs           │ 2                              │
│ Storage         │ 80 GB SSD                      │
│ Region          │ ap-south-1 (Mumbai)            │
│ Price           │ ~$20 / month                   │
│ Static IP       │ YES — attach immediately       │
│ SSH Key         │ Download .pem file             │
└─────────────────┴───────────────────────────────┘
```

> ⚠️ **CRITICAL:** Attach a **Static IP** immediately after creating the instance. Without it, your IP changes on every reboot and breaks DNS. Static IPs are **free** when attached to a running instance.

### Steps in AWS Console

```
1. Login → aws.amazon.com/lightsail
2. Click "Create instance"
3. Platform: Linux/Unix
4. Blueprint: OS Only → Ubuntu 22.04 LTS
5. Instance plan: $20/month (4 GB RAM, 2 vCPU, 80 GB)
6. Name: gps-saas-server
7. Click "Create instance"
8. Networking tab → Create Static IP → Attach to instance
9. Download SSH key (.pem file)
```

---

## 4. Firewall & Port Configuration

### 🔥 Lightsail Firewall Rules

Go to: **Lightsail Console → Your Instance → Networking tab → Firewall**

```
┌────────────────────────────────────────────────────────────────┐
│              LIGHTSAIL FIREWALL RULES                          │
├────────┬──────────┬─────────────────────────────┬─────────────┤
│  PORT  │ PROTOCOL │ PURPOSE                     │ REQUIRED    │
├────────┼──────────┼─────────────────────────────┼─────────────┤
│  22    │  TCP     │ SSH server access           │ ✅ YES      │
│  80    │  TCP     │ HTTP web traffic            │ ✅ YES      │
│  443   │  TCP     │ HTTPS secure web traffic    │ ✅ YES      │
│  5000  │  TCP     │ GPS device TCP connection   │ ✅ YES      │
│  3001  │  TCP     │ Grafana monitoring UI       │ ⚠️  OPTIONAL │
└────────┴──────────┴─────────────────────────────┴─────────────┘
```

> 🚨 **Port 5000 is the #1 missed setting.** If GPS devices show offline instantly, this port is blocked. GPS trackers send data to this port directly.

### UFW Firewall Commands (Run on Server)

```bash
# SSH into your server first, then run:
sudo ufw allow 22/tcp     # SSH — ALWAYS keep this open or you lock yourself out!
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5000/tcp   # GPS devices — CRITICAL
sudo ufw allow 3001/tcp   # Grafana
sudo ufw --force enable

# Verify rules:
sudo ufw status verbose
```

Expected output:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
5000/tcp                   ALLOW IN    Anywhere
3001/tcp                   ALLOW IN    Anywhere
```

### Internal Docker Ports (NOT exposed to internet)

```
┌──────────────────────────────────────────────────────────┐
│           INTERNAL DOCKER NETWORK PORTS                  │
│           (accessible only between containers)           │
├──────────────────┬──────────┬────────────────────────────┤
│ Service          │ Port     │ Used By                    │
├──────────────────┼──────────┼────────────────────────────┤
│ backend (API)    │ 3000     │ nginx proxy                │
│ frontend         │ 80       │ nginx proxy                │
│ gps-admin        │ 80       │ nginx proxy                │
│ tcp-server       │ 5000     │ nginx stream proxy         │
│ postgres         │ 5432     │ backend                    │
│ redis            │ 6379     │ backend, tcp-server,       │
│                  │          │ workers, notifications     │
│ prometheus       │ 9090     │ grafana                    │
└──────────────────┴──────────┴────────────────────────────┘
```

---

## 5. All URLs & Access Points

Replace `yourdomain.com` with your actual domain everywhere.

```
┌──────────────────────────────────────────────────────────────────┐
│                    ACCESS URLS REFERENCE                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🗺️  CLIENT WEB APP (Fleet Owner Login)                         │
│      https://yourdomain.com                                      │
│      Role: CLIENT, SUBUSER                                       │
│      Pages: Dashboard, Live Tracking, Alerts, Billing,           │
│             Geofences                                            │
│                                                                  │
│  🔧  ADMIN PANEL                                                 │
│      https://admin.yourdomain.com                                │
│      — OR —                                                      │
│      https://yourdomain.com/admin/                               │
│      Role: ADMIN only                                            │
│      Pages: Users, All Devices, Plans, Stats, Alerts             │
│                                                                  │
│  ⚡  REST API BASE URL                                           │
│      https://yourdomain.com/api                                  │
│      Auth: Bearer token in Authorization header                  │
│                                                                  │
│  💓  HEALTH CHECK                                                │
│      https://yourdomain.com/health                               │
│      Returns: {"status":"OK","postgres":"connected",             │
│               "redis":"connected","uptime":"123s"}               │
│      Use: monitor this URL to verify platform is up             │
│                                                                  │
│  📊  GRAFANA MONITORING                                          │
│      http://yourdomain.com:3001                                  │
│      Username: admin                                             │
│      Password: value of GRAFANA_PASSWORD in .env.production      │
│                                                                  │
│  📡  GPS DEVICE TCP ENDPOINT                                     │
│      yourdomain.com : 5000   (raw TCP — not HTTP)               │
│      SMS to device: SERVER,1,yourdomain.com,5000,0#             │
│      Protocol: GT06 binary                                       │
│                                                                  │
│  💳  RAZORPAY WEBHOOK URL                                        │
│      https://yourdomain.com/api/billing/webhook                  │
│      Set in: Razorpay Dashboard → Webhooks                       │
│      Events: payment.captured                                    │
│                                                                  │
│  📈  PROMETHEUS METRICS                                          │
│      https://yourdomain.com/metrics                              │
│      Format: Prometheus text format                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Default Passwords & Credentials

> 🔴 **CHANGE ALL OF THESE ON FIRST DEPLOYMENT. NEVER USE DEFAULTS IN PRODUCTION.**

### Application Logins

```
┌───────────────────────────────────────────────────────────────┐
│                 DEFAULT LOGIN CREDENTIALS                     │
├────────────────────┬──────────────────────┬───────────────────┤
│ Portal             │ Email / Username      │ Password          │
├────────────────────┼──────────────────────┼───────────────────┤
│ Admin Panel        │ admin@yourdomain.com  │ Admin@123         │
│ Grafana Monitoring │ admin                 │ Admin@Grafana2024 │
└────────────────────┴──────────────────────┴───────────────────┘
```

> ⚠️ Change the admin password immediately via Admin Panel → Profile → Change Password

### Database Credentials (from .env.production)

```
┌─────────────────────────────────────────────────────────┐
│              DATABASE CREDENTIALS                       │
├──────────────────┬──────────────────────────────────────┤
│ Host             │ postgres  (Docker internal name)     │
│ Port             │ 5432      (internal only)            │
│ Database name    │ gpsdb                                │
│ Username         │ gpsuser                              │
│ Password         │ GpsSecure@2024!  ← CHANGE THIS      │
└──────────────────┴──────────────────────────────────────┘
```

### JWT Secrets (from .env.production)

```bash
# CHANGE THESE — generate new ones with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run TWICE — use different values for JWT_SECRET and JWT_REFRESH_SECRET
```

---

## 7. Environment Variables Reference

File: `.env.production` — **Edit this before first deploy**

```bash
# ═══════════════════════════════════════════════════
#  APPLICATION
# ═══════════════════════════════════════════════════
NODE_ENV=production          # Never change
API_PORT=3000                # Backend internal port
TCP_PORT=5000                # GPS device port (publicly exposed)

# ═══════════════════════════════════════════════════
#  DATABASE  (⚠️ CHANGE PASSWORD)
# ═══════════════════════════════════════════════════
POSTGRES_HOST=postgres       # Docker service name — DO NOT CHANGE
POSTGRES_PORT=5432           # Internal only
POSTGRES_DB=gpsdb            # Database name
POSTGRES_USER=gpsuser        # Database user
POSTGRES_PASSWORD=GpsSecure@2024!   # ← CHANGE THIS

# ═══════════════════════════════════════════════════
#  REDIS (no password needed — internal only)
# ═══════════════════════════════════════════════════
REDIS_HOST=redis             # Docker service name — DO NOT CHANGE
REDIS_PORT=6379

# ═══════════════════════════════════════════════════
#  JWT SECRETS  (⚠️ MUST CHANGE — generate new values)
# ═══════════════════════════════════════════════════
JWT_SECRET=<generate 64-byte hex>         # Access token signing key
JWT_REFRESH_SECRET=<different 64-byte hex> # Refresh token signing key

# ═══════════════════════════════════════════════════
#  CORS
# ═══════════════════════════════════════════════════
CORS_ORIGIN=https://yourdomain.com   # Change * to your domain in production

# ═══════════════════════════════════════════════════
#  RAZORPAY  (⚠️ GET FROM razorpay.com DASHBOARD)
# ═══════════════════════════════════════════════════
RAZORPAY_KEY=rzp_live_XXXXXXXXXXXXXXXXXX    # From Razorpay → Settings → API Keys
RAZORPAY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX    # From Razorpay → Settings → API Keys
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXX    # From Razorpay → Webhooks → create secret

# ═══════════════════════════════════════════════════
#  PLATFORM SETTINGS
# ═══════════════════════════════════════════════════
OVERSPEED_LIMIT=100          # Alert when vehicle exceeds this speed (km/h)
LOG_LEVEL=info               # Options: error | warn | info | debug

# ═══════════════════════════════════════════════════
#  MONITORING
# ═══════════════════════════════════════════════════
GRAFANA_PASSWORD=Admin@Grafana2024   # ← CHANGE THIS
```

### How to Edit the .env File on Server

```bash
nano .env.production
# Make changes
# Press CTRL+O to save, CTRL+X to exit

# After editing — rebuild and restart:
docker compose down
docker compose up -d --build
```

---

## 8. Step-by-Step Deployment

### Prerequisites

- AWS Lightsail account
- Domain name pointed to your Lightsail static IP
- Razorpay account (for billing)
- GitHub account (for CI/CD)

---

### STEP 1 — Upload Files to Server

```bash
# On your LOCAL machine — upload the project zip:
scp -i ~/Downloads/lightsail-key.pem GPS-SaaS-HOTFIX.zip ubuntu@YOUR_SERVER_IP:~/

# SSH into server:
chmod 400 ~/Downloads/lightsail-key.pem
ssh -i ~/Downloads/lightsail-key.pem ubuntu@YOUR_SERVER_IP
```

---

### STEP 2 — Run Setup Script

```bash
# On the SERVER:
unzip GPS-SaaS-HOTFIX.zip
mv deploy gps-saas-platform
cd gps-saas-platform
chmod +x scripts/lightsail-setup.sh
./scripts/lightsail-setup.sh
```

> This installs Docker, configures UFW firewall, and sets up the environment.

---

### STEP 3 — Configure Environment Variables

```bash
nano .env.production
```

**Minimum changes required:**

```bash
POSTGRES_PASSWORD=YourNewStrongPassword123!    # Change this
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://yourdomain.com
RAZORPAY_KEY=rzp_live_your_actual_key
RAZORPAY_SECRET=your_actual_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
GRAFANA_PASSWORD=YourNewGrafanaPassword!
```

---

### STEP 4 — Point Domain DNS

In your domain registrar / Cloudflare / Route53:

```
Type    Name                Value
────    ────                ─────────────────────────
A       yourdomain.com      YOUR_LIGHTSAIL_STATIC_IP
A       www                 YOUR_LIGHTSAIL_STATIC_IP
A       admin               YOUR_LIGHTSAIL_STATIC_IP
```

> Wait 5–30 minutes for DNS propagation before getting SSL certificate.

---

### STEP 5 — Get SSL Certificate (Let's Encrypt)

```bash
# Install certbot:
sudo apt install -y certbot

# Stop anything using port 80 first:
docker compose down 2>/dev/null || true

# Get certificate (all your subdomains in one command):
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d admin.yourdomain.com

# Copy certs to nginx ssl folder:
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown -R ubuntu:ubuntu nginx/ssl/
```

---

### STEP 6 — Start All Services

```bash
# Build and start everything:
docker compose up -d --build

# Watch the startup (takes 60-120 seconds on first run):
docker compose logs -f backend

# You should see these lines in the logs:
# [DB] PostgreSQL connected
# [SERVER] Running on port 3000
# [STARTUP] All workers and jobs initialised
```

---

### STEP 7 — Verify Everything is Running

```bash
# Check all containers are healthy:
docker compose ps

# Expected output — all should show "Up" or "healthy":
# NAME              STATUS
# backend           Up (healthy)
# postgres          Up (healthy)
# redis             Up (healthy)
# nginx             Up
# frontend          Up
# gps-admin         Up
# tcp-server        Up
# notifications     Up
# prometheus        Up
# grafana           Up

# Test health endpoint:
curl http://localhost:3000/health
# Expected: {"status":"OK","postgres":"connected","redis":"connected"}

# Test from internet:
curl https://yourdomain.com/health
```

---

### STEP 8 — Configure Razorpay Webhook

```
1. Login to razorpay.com
2. Settings → Webhooks → Add New Webhook
3. Webhook URL: https://yourdomain.com/api/billing/webhook
4. Secret: (same value as RAZORPAY_WEBHOOK_SECRET in .env.production)
5. Active Events: CHECK "payment.captured"
6. Save
```

---

### STEP 9 — Set Up Auto-Renewal SSL

```bash
# Test renewal works:
sudo certbot renew --dry-run

# Add to crontab for auto-renewal:
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/gps-saas-platform/nginx/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/gps-saas-platform/nginx/ssl/ && docker compose -f ~/gps-saas-platform/docker-compose.yml restart nginx") | crontab -
```

---

### STEP 10 — Set Up Daily Backup

```bash
chmod +x scripts/backup.sh

# Add to crontab:
(crontab -l 2>/dev/null; echo "0 2 * * * ~/gps-saas-platform/scripts/backup.sh >> ~/backup.log 2>&1") | crontab -
```

---

### ✅ Deployment Checklist

```
[ ] Lightsail 4GB instance created
[ ] Static IP attached
[ ] Firewall ports open: 22, 80, 443, 5000, 3001
[ ] Files uploaded and extracted
[ ] .env.production edited with real values
[ ] POSTGRES_PASSWORD changed from default
[ ] JWT_SECRET generated (not default placeholder)
[ ] JWT_REFRESH_SECRET generated (different from JWT_SECRET)
[ ] RAZORPAY_KEY / RAZORPAY_SECRET set
[ ] CORS_ORIGIN set to your domain
[ ] Domain DNS A records pointing to static IP
[ ] SSL certificate obtained and copied to nginx/ssl/
[ ] docker compose up -d successful
[ ] All containers showing Up/healthy
[ ] https://yourdomain.com loads login page
[ ] https://yourdomain.com/health returns OK
[ ] https://admin.yourdomain.com loads admin login
[ ] Razorpay webhook configured
[ ] SSL auto-renewal cron added
[ ] Daily backup cron added
[ ] Admin password changed from Admin@123
[ ] Grafana password changed from default
```

---

## 9. GPS Device Configuration

### Supported Devices

Any GPS tracker using the **GT06 binary protocol**:
- GT06, GT06N, GT06E (all variants)
- Concox GT06 series
- JM-VL01, JM-LL01 series
- Most Chinese OBD/wired GPS trackers

### SMS Configuration Commands

Send these SMS messages **to the SIM card installed in the GPS device**:

```
┌─────────────────────────────────────────────────────────────┐
│              GPS DEVICE SMS COMMANDS                        │
├──────────────────────────────┬──────────────────────────────┤
│ Action                       │ SMS Command                  │
├──────────────────────────────┼──────────────────────────────┤
│ Set server (primary)         │ SERVER,1,yourdomain.com,5000,0#│
│ Set server (by IP)           │ IP,YOUR_SERVER_IP,5000#      │
│ Set APN (Airtel)             │ APN,airtelgprs.com#          │
│ Set APN (Jio)                │ APN,jionet#                  │
│ Set APN (Vi/Vodafone)        │ APN,portalnmms#              │
│ Set APN (BSNL)               │ APN,bsnlnet#                 │
│ Set reporting interval (30s) │ TIMER,30#                    │
│ Set reporting interval (60s) │ TIMER,60#                    │
│ Check device status          │ STATUS#                      │
│ Reboot device                │ REBOOT#                      │
│ Factory reset                │ RESET#                       │
│ Get current location         │ WHERE#                       │
└──────────────────────────────┴──────────────────────────────┘
```

> Replace `yourdomain.com` with your actual domain or server IP address.

### Device Registration Flow

```
1. Register device in GPS SaaS → Dashboard → Add Device
   (Enter IMEI, vehicle number, SIM number)

2. Send SERVER SMS to the SIM in the device:
   SERVER,1,yourdomain.com,5000,0#

3. Send APN SMS:
   APN,airtelgprs.com#  (use your SIM provider's APN)

4. Send TIMER SMS:
   TIMER,30#  (report every 30 seconds)

5. Wait 2-5 minutes → device appears ONLINE on map ✅
```

---

## 10. Database Schema

The database contains **12 tables** with UUID primary keys across all:

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                          │
├──────────────────┬──────────────────────────────────────────┤
│ Table            │ Purpose                                  │
├──────────────────┼──────────────────────────────────────────┤
│ users            │ All users (ADMIN, CLIENT, SUBUSER)       │
│ plans            │ Subscription plans (Basic/Std/Enterprise)│
│ subscriptions    │ Active/expired client subscriptions      │
│ devices          │ Registered GPS devices (per tenant)      │
│ gps_live         │ Latest position per device (upserted)    │
│ gps_history      │ All historical GPS points (PARTITIONED)  │
│ command_logs     │ Commands sent to devices + status        │
│ alert_events     │ All alerts with lat/lng + severity       │
│ geofences        │ Client geofence zones (circle/polygon)   │
│ brandings        │ Per-tenant white-label settings          │
│ analytics        │ Driver scores, trip data, harsh events   │
│ audit_logs       │ All user actions for compliance          │
└──────────────────┴──────────────────────────────────────────┘
```

### Default Seed Data

```sql
-- 3 plans seeded automatically:
Basic      → ₹499/month  → up to 5 devices
Standard   → ₹999/month  → up to 20 devices
Enterprise → ₹2499/month → up to 100 devices

-- Default admin user:
Email:    admin@yourdomain.com
Password: Admin@123  ← CHANGE IMMEDIATELY
Role:     ADMIN
```

---

## 11. API Reference

Base URL: `https://yourdomain.com/api`

Authentication: `Authorization: Bearer <accessToken>`

### Authentication

```
POST /api/auth/register    → Register new CLIENT
POST /api/auth/login       → Login → returns accessToken + refreshToken
POST /api/auth/refresh     → Get new accessToken using refreshToken
GET  /api/auth/me          → Get current user profile + subscription
```

### Devices

```
GET    /api/devices              → List your devices (with live GPS data)
POST   /api/devices              → Register new device (needs active subscription)
GET    /api/devices/:id          → Get single device details
GET    /api/devices/:id/history  → GPS history (?from=ISO&to=ISO)
PUT    /api/devices/:id          → Update device info
DELETE /api/devices/:id          → Remove device
```

### Billing

```
GET  /api/billing/plans          → List all subscription plans
POST /api/billing/create-order   → Create Razorpay order {plan_id}
GET  /api/billing/subscription   → Get my current subscription
POST /api/billing/webhook        → Razorpay webhook (internal use)
```

### Alerts, Geofences, Analytics

```
GET  /api/alerts             → List all alerts (newest first, limit 100)
PUT  /api/alerts/:id/read    → Mark alert as read

GET    /api/geofences        → List my geofences
POST   /api/geofences        → Create geofence
DELETE /api/geofences/:id    → Delete geofence

GET  /api/analytics          → Get analytics/driver score data
```

### Admin Only

```
GET /api/admin/users              → All users + subscriptions
PUT /api/admin/users/:id/active   → Enable/disable user {is_active: bool}
GET /api/admin/stats              → Platform stats (users, devices, subs)
```

### System

```
GET /health    → Health check (postgres + redis status)
GET /metrics   → Prometheus metrics
```

---

## 12. CI/CD — GitHub Actions

The `.github/workflows/deploy.yml` auto-deploys on every push to `main`.

### Required GitHub Secrets

Go to: **GitHub → Repository → Settings → Secrets → Actions**

```
┌──────────────────────┬─────────────────────────────────────────┐
│ Secret Name          │ Value                                   │
├──────────────────────┼─────────────────────────────────────────┤
│ LIGHTSAIL_HOST       │ Your Lightsail static IP address        │
│ LIGHTSAIL_USER       │ ubuntu                                  │
│ LIGHTSAIL_SSH_KEY    │ Contents of your .pem file (full text)  │
│ DOCKER_USERNAME      │ Your Docker Hub username                │
│ DOCKER_PASSWORD      │ Your Docker Hub password or token       │
└──────────────────────┴─────────────────────────────────────────┘
```

### Deploy Flow

```
Push to main branch
       │
       ▼
GitHub Actions triggered
       │
       ├── Build backend Docker image → push to DockerHub
       ├── Build tcp-server image     → push to DockerHub
       ├── Build frontend image       → push to DockerHub
       ├── Build gps-admin image      → push to DockerHub
       └── Build notifications image  → push to DockerHub
       │
       ▼
SSH into Lightsail server
       │
       ├── git pull origin main
       ├── docker compose pull
       ├── docker compose up -d --remove-orphans
       └── docker image prune -f
```

---

## 13. Monitoring — Grafana

Access: `http://yourdomain.com:3001`

```
Username: admin
Password: value of GRAFANA_PASSWORD in .env.production
```

### Available Metrics

```
┌──────────────────────────────────────────────────────────┐
│                  PROMETHEUS METRICS                      │
├──────────────────────────┬───────────────────────────────┤
│ Metric                   │ Description                   │
├──────────────────────────┼───────────────────────────────┤
│ gps_api_requests_total   │ API requests by route/status  │
│ gps_active_devices_total │ Currently online device count │
│ gps_tcp_connections_total│ Live GPS device connections   │
│ gps_packets_processed_   │ Total GPS packets processed   │
│   total                  │                               │
│ gps_process_cpu_*        │ Node.js CPU usage             │
│ gps_nodejs_heap_*        │ Node.js memory usage          │
│ gps_process_uptime_*     │ Service uptime                │
└──────────────────────────┴───────────────────────────────┘
```

### Add Prometheus Data Source in Grafana

```
1. Grafana → Configuration → Data Sources → Add
2. Type: Prometheus
3. URL: http://prometheus:9090
4. Save & Test
```

---

## 14. Troubleshooting

### Quick Diagnostic

```bash
# Run the built-in diagnostic script:
chmod +x scripts/diagnose.sh
./scripts/diagnose.sh
```

### Common Issues

```
┌──────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING GUIDE                         │
├───────────────────────────┬──────────────────────────────────────┤
│ Problem                   │ Solution                             │
├───────────────────────────┼──────────────────────────────────────┤
│ Backend container          │ Run: docker compose logs backend     │
│ "unhealthy"               │ Usually: DB not ready yet            │
│                           │ Wait 2 min then check again          │
│                           │ Or run: ./scripts/fix-and-restart.sh │
├───────────────────────────┼──────────────────────────────────────┤
│ GPS device never online   │ 1. Port 5000 not open in Lightsail   │
│                           │    firewall → add rule               │
│                           │ 2. Wrong SERVER SMS command          │
│                           │    Re-send: SERVER,1,domain,5000,0#  │
│                           │ 3. Wrong APN for SIM provider        │
│                           │    Re-send APN SMS                   │
├───────────────────────────┼──────────────────────────────────────┤
│ Payment not activating    │ 1. Check Razorpay webhook URL        │
│ subscription              │ 2. Check RAZORPAY_WEBHOOK_SECRET     │
│                           │ 3. Run: docker compose logs backend  │
│                           │    look for [WEBHOOK] errors          │
├───────────────────────────┼──────────────────────────────────────┤
│ Cannot login              │ 1. Wrong credentials                 │
│                           │ 2. Account disabled by admin         │
│                           │ 3. JWT_SECRET changed → all tokens   │
│                           │    invalidated → login again         │
├───────────────────────────┼──────────────────────────────────────┤
│ Map shows no vehicles     │ 1. No active subscription            │
│                           │    → go to Billing and subscribe     │
│                           │ 2. Devices offline                   │
│                           │    → check device GPS signal         │
├───────────────────────────┼──────────────────────────────────────┤
│ SSL/HTTPS not working     │ 1. Certs not copied to nginx/ssl/    │
│                           │ 2. Run certbot again                 │
│                           │ 3. Port 443 not open in firewall     │
├───────────────────────────┼──────────────────────────────────────┤
│ Out of disk space         │ docker system prune -af              │
│                           │ Also: check ~/backups/ folder size   │
├───────────────────────────┼──────────────────────────────────────┤
│ API returns 401           │ Access token expired (15 min TTL)    │
│                           │ POST /api/auth/refresh with your     │
│                           │ refreshToken to get new accessToken  │
└───────────────────────────┴──────────────────────────────────────┘
```

### Useful Commands

```bash
# Check all container status
docker compose ps

# View logs for specific service
docker compose logs backend -f --tail=100
docker compose logs nginx -f
docker compose logs postgres -f
docker compose logs tcp-server -f

# Restart a single service
docker compose restart backend
docker compose restart nginx

# Full restart (keeps data)
docker compose down && docker compose up -d

# Rebuild a service (after code changes)
docker compose build --no-cache backend
docker compose up -d backend

# Access PostgreSQL directly
docker compose exec postgres psql -U gpsuser -d gpsdb

# Access Redis CLI
docker compose exec redis redis-cli

# Check Redis queue depth
docker compose exec redis redis-cli llen gps_queue

# View all Docker volumes
docker volume ls

# Backup database manually
./scripts/backup.sh
```

---

## 15. User Roles & Permissions

```
┌──────────────────────────────────────────────────────────────────┐
│                    ROLE PERMISSIONS MATRIX                       │
├──────────────────────────┬───────────┬───────────┬──────────────┤
│ Feature                  │  ADMIN    │  CLIENT   │  SUBUSER     │
├──────────────────────────┼───────────┼───────────┼──────────────┤
│ View live tracking       │    ✅     │    ✅     │     ✅       │
│ View alerts              │    ✅     │    ✅     │     ✅       │
│ Mark alerts read         │    ✅     │    ✅     │     ✅       │
│ Add/edit/delete devices  │    ✅     │    ✅     │     ❌       │
│ Create/delete geofences  │    ✅     │    ✅     │     ❌       │
│ Send device commands     │    ✅     │    ✅     │     ❌       │
│ View analytics           │    ✅     │    ✅     │     ❌       │
│ Manage billing           │    ✅     │    ✅     │     ❌       │
│ Manage branding          │    ✅     │    ✅     │     ❌       │
│ View all users           │    ✅     │    ❌     │     ❌       │
│ Enable/disable users     │    ✅     │    ❌     │     ❌       │
│ View all tenants/devices │    ✅     │    ❌     │     ❌       │
│ View platform stats      │    ✅     │    ❌     │     ❌       │
│ Manage plans             │    ✅     │    ❌     │     ❌       │
└──────────────────────────┴───────────┴───────────┴──────────────┘
```

---

## 📁 Project File Structure

```
gps-saas-platform/
├── backend/                    ← Node.js Express API
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              ← Express setup + middleware
│       ├── server.js           ← HTTP server + Socket.IO init
│       ├── startup.js          ← Worker process spawner
│       ├── config/             ← Redis, Razorpay config
│       ├── controllers/        ← auth, device, billing, webhook
│       ├── middleware/         ← auth, rbac, subscription, rateLimit
│       ├── models/             ← Sequelize models (12 tables)
│       ├── modules/
│       │   ├── geofence/       ← geofence checker + GPS worker
│       │   ├── branding/       ← white-label service
│       │   └── analytics/      ← driver score worker
│       ├── routes/             ← all API route files
│       ├── services/           ← command, invoice services
│       ├── socket/             ← Socket.IO server
│       ├── jobs/               ← subscription expiry, health jobs
│       ├── monitoring/         ← Prometheus metrics
│       └── utils/              ← logger, response helpers
│
├── frontend/                   ← React client app (Vite)
│   ├── Dockerfile
│   ├── src/
│   │   ├── App.jsx             ← Router + protected routes
│   │   ├── pages/              ← Dashboard, LiveTracking, Alerts,
│   │   │                          Billing, Geofences, Login
│   │   ├── components/         ← MapView, Navbar
│   │   ├── context/            ← AuthContext
│   │   ├── api/axios.js        ← Axios with token interceptor
│   │   └── socket/socket.js    ← Socket.IO client
│   └── nginx.conf
│
├── gps-admin/                  ← React admin panel (Vite)
│   ├── Dockerfile
│   └── src/
│       ├── App.jsx
│       ├── pages/              ← Dashboard, Users, Devices,
│       │                          Alerts, Billing, Login
│       └── components/         ← MapView
│
├── tcp-server/                 ← GT06 GPS device TCP server
│   ├── Dockerfile
│   └── src/
│       ├── server.js           ← TCP listener
│       ├── protocols/gt06/     ← parser, handlers
│       ├── sessions/           ← device session manager
│       └── services/           ← Redis GPS publisher
│
├── notifications/              ← Firebase push worker
│   ├── Dockerfile
│   ├── worker.js
│   └── push/firebase.js
│
├── database/
│   └── schema.sql              ← Complete DB schema + seed data
│
├── nginx/
│   └── nginx.conf              ← Reverse proxy + SSL + TCP stream
│
├── monitoring/
│   └── prometheus.yml
│
├── scripts/
│   ├── lightsail-setup.sh      ← One-time server setup
│   ├── fix-and-restart.sh      ← Fix unhealthy containers
│   ├── diagnose.sh             ← Debug failing deployments
│   └── backup.sh               ← Daily DB backup
│
├── .github/workflows/
│   └── deploy.yml              ← GitHub Actions CI/CD
│
├── docker-compose.yml          ← All 10 services
├── .env.production             ← Environment variables
└── README.md                   ← This file
```

---

## 🆘 Support

| Issue Type | Action |
|------------|--------|
| Container unhealthy | Run `./scripts/fix-and-restart.sh` |
| Need to debug | Run `./scripts/diagnose.sh` |
| DB corruption | Restore from `~/backups/` directory |
| SSL expired | Run `sudo certbot renew` |
| Out of memory | Upgrade Lightsail to 8GB plan |

---

<div align="center">

**GPS SaaS Platform — Production Ready**

Built with Node.js · PostgreSQL · Redis · React · Docker · AWS Lightsail

</div>
