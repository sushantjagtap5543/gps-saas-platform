# GPS SaaS — AWS Lightsail 2GB Deployment Guide

## Architecture on 2GB Instance

```
Internet
  │
  ├─ Port 80/443 ──→ Nginx (128MB)
  │                    ├─ /          → Frontend  (nginx, 80MB)
  │                    ├─ /api/      → Backend   (Node.js, 320MB)
  │                    ├─ /admin/    → GPS Admin (nginx, 80MB)
  │                    └─ /socket.io → Backend   (WebSocket)
  │
  └─ Port 5000 ─────→ TCP Server    (Node.js, 140MB)  ← GPS Hardware
                           │
                       Redis Queue  (100MB)
                           │
                    GPS Worker (in Backend)
                           │
                    PostgreSQL       (320MB)

Total RAM budget:  ~1.3GB soft limit
OS + overhead:     ~400MB
Swap buffer:       2GB swap on disk
```

## Memory Budget (2GB = 2048MB)

| Service | RAM Limit | Purpose |
|---------|-----------|---------|
| PostgreSQL | 320MB | Database (tuned: shared_buffers=64MB) |
| Redis | 140MB | Queue + pub/sub (max 100MB data) |
| Backend | 320MB | API + GPS Worker + Analytics Worker |
| TCP Server | 140MB | GPS hardware device connections |
| Notifications | 80MB | Firebase push worker |
| Frontend nginx | 80MB | Serves compiled React SPA |
| Admin nginx | 80MB | Serves admin panel |
| Nginx proxy | 140MB | Reverse proxy + SSL |
| **App Total** | **~1.3GB** | |
| OS + Docker | ~400MB | Ubuntu + Docker daemon |
| **Swap buffer** | **2GB** | Prevents OOM crashes |

---

## 🚀 Step-by-Step Deployment

### Prerequisites
- AWS Lightsail instance: **Ubuntu 22.04, 2GB RAM, 60GB SSD**
- Lightsail Firewall rules: TCP 22, 80, 443, 5000
- A domain name (optional but recommended for SSL)
- Razorpay account for billing

---

### Step 1 — Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com)
2. Click **Create instance**
3. Select:
   - Platform: **Linux/Unix**
   - Blueprint: **Ubuntu 22.04 LTS**
   - Plan: **$10/month (2GB RAM, 2 vCPU, 60GB SSD)**
4. Add a key pair or create new one
5. Name it: `gps-saas-server`
6. Click **Create instance**

**Open firewall ports:**
1. Click your instance → **Networking** tab
2. Under **IPv4 firewall**, add:
   - Port 80 (TCP) — HTTP
   - Port 443 (TCP) — HTTPS  
   - Port 5000 (TCP) — GPS device connections
3. Click **Save**

---

### Step 2 — Connect and Run Setup

```bash
# SSH into your instance
ssh -i ~/your-key.pem ubuntu@YOUR_INSTANCE_IP

# Download the deployment package
# Option A: clone from GitHub
git clone https://github.com/sushantjagtap5543/gps-saas-platform ~/gps-saas-platform

# Option B: upload the fixed zip and extract
unzip gps-saas-platform-FIXED.zip
mv gps-fixed ~/gps-saas-platform

cd ~/gps-saas-platform
chmod +x scripts/*.sh

# Run Step 1: server setup (takes ~3 minutes)
bash scripts/01-server-setup.sh
```

**IMPORTANT:** Log out and back in after Step 1:
```bash
exit
ssh -i ~/your-key.pem ubuntu@YOUR_INSTANCE_IP
```

---

### Step 3 — Configure Environment

```bash
cd ~/gps-saas-platform
bash scripts/02-configure-env.sh
```

This will ask for:
- Your domain (or IP for testing)
- Razorpay Key ID, Secret, and Webhook Secret
- Admin email address

It auto-generates all JWT secrets and DB passwords.

---

### Step 4 — Launch All Services

```bash
bash scripts/03-launch.sh
```

First launch takes 5-10 minutes (builds all Docker images). Subsequent launches are fast (seconds).

After launch you'll see:
```
  Customer Portal:  http://YOUR_IP
  Admin Panel:      http://YOUR_IP/admin/
  GPS TCP Port:     YOUR_IP:5000
```

---

### Step 5 — Set Up SSL (Recommended)

Point your domain's DNS A record to the Lightsail IP first, then:

```bash
bash scripts/04-ssl-setup.sh yourdomain.com
```

This:
- Installs certbot
- Gets a free Let's Encrypt certificate
- Configures nginx for HTTPS
- Sets up monthly auto-renewal

---

### Step 6 — Set Up Cron Jobs

```bash
bash scripts/05-setup-crons.sh
```

Configures:
- Daily database backup at 2:00 AM
- Health monitoring every 5 minutes (auto-restarts crashed services)
- Weekly Docker cleanup

---

### Step 7 — First Login

1. Go to `http://YOUR_IP/admin/`
2. Login: `admin@gps.com` / `Admin@123`
3. **Change the password immediately!**

---

## 📋 GitHub Actions (CI/CD)

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret | Value |
|--------|-------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token (not your password) |
| `LIGHTSAIL_HOST` | Your Lightsail instance IP |
| `LIGHTSAIL_USER` | `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | Contents of your `.pem` private key |

After adding secrets, every push to `main` auto-deploys.

---

## 🔧 Common Commands

```bash
cd ~/gps-saas-platform

# View running services
docker compose -f docker-compose.2gb.yml ps

# View logs for a service
docker compose -f docker-compose.2gb.yml logs -f backend
docker compose -f docker-compose.2gb.yml logs -f nginx

# Restart a service
docker compose -f docker-compose.2gb.yml restart backend

# Full restart (keeps DB data)
docker compose -f docker-compose.2gb.yml down
docker compose -f docker-compose.2gb.yml up -d

# Manual backup
bash scripts/backup.sh

# Health check
bash scripts/monitor.sh

# Watch memory usage live
docker stats

# Check memory
free -h

# Database shell
docker compose -f docker-compose.2gb.yml exec postgres psql -U gpsuser -d gpsdb

# Redis shell
docker compose -f docker-compose.2gb.yml exec redis redis-cli
```

---

## 🚨 Troubleshooting

### Out of Memory
```bash
# Check memory
free -h
docker stats --no-stream

# If swap is not enabled
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Backend won't start
```bash
docker compose -f docker-compose.2gb.yml logs --tail=100 backend
# Usually: wrong env vars, DB not ready, or port in use
```

### GPS devices not connecting
```bash
# Check TCP port is open
sudo ufw status
# Check TCP server running
docker compose -f docker-compose.2gb.yml logs tcp-server
# Test TCP connection
telnet YOUR_IP 5000
```

### Database connection errors
```bash
# Check postgres is healthy
docker compose -f docker-compose.2gb.yml exec postgres pg_isready -U gpsuser -d gpsdb

# View postgres logs
docker compose -f docker-compose.2gb.yml logs postgres
```

### Nginx 502 Bad Gateway
```bash
# Backend probably crashed
docker compose -f docker-compose.2gb.yml logs backend
docker compose -f docker-compose.2gb.yml restart backend
```

---

## 💾 Backup & Restore

**Backup:**
```bash
bash scripts/backup.sh
ls ~/backups/
```

**Restore:**
```bash
# Restore from a specific backup
gunzip -c ~/backups/gpsdb_20250301_020000.sql.gz | \
  docker compose -f docker-compose.2gb.yml exec -T postgres \
  psql -U gpsuser -d gpsdb
```

---

## 🔐 Security Checklist

- [ ] Changed admin password from `Admin@123`
- [ ] `.env.production` has mode 600 (`chmod 600 .env.production`)
- [ ] UFW firewall enabled (only ports 22, 80, 443, 5000 open)
- [ ] Fail2ban running (`sudo systemctl status fail2ban`)
- [ ] SSL certificate installed
- [ ] Razorpay webhook configured with your domain
- [ ] Added `.env.production` to `.gitignore`

---

## 📈 Scaling Beyond 2GB

When traffic grows, upgrade options:

1. **Vertical:** Upgrade Lightsail to 4GB ($20/mo) or 8GB ($40/mo)
2. **Horizontal:** Move PostgreSQL to Amazon RDS, Redis to ElastiCache
3. **Container:** Migrate to ECS/Fargate for auto-scaling
