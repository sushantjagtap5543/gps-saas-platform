# 🛰️ GPS Tracking SaaS Platform v2.0

Enterprise-grade, multi-tenant GPS fleet management platform.

## ✨ What's New in v2.0

### 🏗️ Architecture Upgrades
- **Multi-tenant** with Super Admin / Admin / Reseller / Client / Driver / Technician / Support roles
- **White-label** branding per reseller (logo, colors, domain, support info)
- **Full audit logging** for every action

### 📊 Database Enhancements
- **20+ tables** covering all aspects of fleet management
- **Device Models** — GT06, Teltonika, TK103, Concox support
- **SIM card inventory** management
- **Trip** recording with start/end coordinates
- **Fuel data** + theft/fill detection
- **CAN bus data** tables
- **Driver scoring** per day per driver
- **Alert rules** engine with severity levels and cooldowns
- **Support tickets** system
- **System controls** — master switches (ignition commands, maintenance mode)

### 🎛️ Command Engine
- **Per-model command templates** with safety rules
- **Speed check** — blocks ignition cut if vehicle moving
- **OTP confirmation** for dangerous commands
- **Cooldown** enforcement
- **Redis queue** + retry logic (3 retries, 5-min timeout)
- **Global kill-switch** for ignition commands

### 📱 Frontend Pages (10 new pages)
- **Dashboard** — KPI cards, fleet status, recent alerts
- **Devices** — Full CRUD with model selection, pagination, search
- **Trips** — History with driver scores, harsh events
- **Driver Scores** — Visual scoring circles (speed/brake/accel/idle)
- **Reports** — Fleet analytics with CSV export
- **Users** — Admin user management with role badges
- **Support** — Ticket creation and tracking
- **Settings** — Profile, password change, white-label branding
- **Alerts** — With unread count in Navbar
- **Sidebar** — Professional navigation with role-based admin menu

### 💰 Billing Upgrades
- **Monthly/Yearly** billing cycles
- **GST calculation** (18%)
- **Invoice generation** with line items
- **Grace period** (7 days default, configurable)
- **Auto-suspension** after expiry
- Admin **extend subscription** override

### 🤖 AI Driver Scoring (Free)
- Rule-based scoring — NO paid APIs
- Speed score, brake score, acceleration score, idle score
- Weighted overall score (100 = perfect)
- Per-trip and per-day aggregation

### 🔒 Security
- Timing-safe login
- Last login tracking
- Login attempt audit logging
- Change password with verification
- RBAC for all endpoints

## 🚀 Quick Start

```bash
# Clone and setup
git clone your-repo
cd gps-saas-platform

# One command deployment
chmod +x setup.sh && sudo ./setup.sh
```

## 🌐 Access Points

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Client Portal | :5025 | admin@gps.local / Admin@123! |
| Admin Panel | :5026 | admin@gps.local / Admin@123! |
| API | :5024/api | JWT Token |
| GPS Devices | :5023 | IMEI Auth |
| Database Admin | :8080 | postgres/postgres |
| Grafana | :3000 | admin/admin |

## 📡 Supported GPS Protocols
- GT06 / GT06N / GT06E (Concox)
- Teltonika FMB series
- TK103 / TK103B
- H02 protocol

## 📋 Role Permissions

| Role | Devices | Commands | Users | Billing | System |
|------|---------|----------|-------|---------|--------|
| SUPER_ADMIN | ✅ All | ✅ All | ✅ All | ✅ All | ✅ |
| ADMIN | ✅ Own | ✅ Most | ✅ Clients | ✅ Own | ❌ |
| RESELLER | ✅ Clients | ✅ Most | ✅ Clients | ✅ Clients | ❌ |
| CLIENT | ✅ Own | ❌ | ❌ | ✅ Own | ❌ |
| TECHNICIAN | ✅ View | ❌ | ❌ | ❌ | ❌ |
| DRIVER | Own vehicle | ❌ | ❌ | ❌ | ❌ |

## 📞 Support
- Email: admin@gps.local
- Docs: See /docs folder
