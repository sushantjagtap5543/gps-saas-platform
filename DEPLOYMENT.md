# GPS SaaS — AWS Lightsail Deployment Guide

## Architecture

```
Internet → Port 80/443 → Nginx → Backend (3000)  → PostgreSQL
GPS Devices → Port 5000 → TCP Server → Redis queue → GPS Worker
                                                   → Analytics Worker
                                       Redis pub/sub → Socket.io → Browsers
```

## GitHub Actions Secrets Required

Set these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `DOCKER_USERNAME` | Your DockerHub username |
| `DOCKER_PASSWORD` | DockerHub access token |
| `LIGHTSAIL_HOST` | Your Lightsail instance IP |
| `LIGHTSAIL_USER` | `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | Contents of your private SSH key |

## First-Time Server Setup

```bash
# SSH into your Lightsail instance
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_IP

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/sushantjagtap5543/gps-saas-platform/main/scripts/lightsail-setup.sh | bash

# Log out and back in (required for docker group)
exit
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_IP

# Edit environment variables
cd ~/gps-saas-platform
nano .env.production   # Fill in RAZORPAY_KEY, RAZORPAY_SECRET etc.

# Start everything
docker compose up -d --build

# Verify
docker compose ps
curl http://localhost:3000/health
```

## Lightsail Firewall Rules

Open these ports in the AWS Lightsail console → Networking → Firewall:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |
| 5000 | TCP | GPS device TCP connections |

## Environment Variables Checklist

Edit `.env.production` and ensure these are set:

- [ ] `POSTGRES_PASSWORD` — strong random password
- [ ] `JWT_SECRET` — 64 hex chars (`openssl rand -hex 64`)
- [ ] `JWT_REFRESH_SECRET` — 64 hex chars (`openssl rand -hex 64`)
- [ ] `RAZORPAY_KEY` — from Razorpay Dashboard
- [ ] `RAZORPAY_SECRET` — from Razorpay Dashboard
- [ ] `RAZORPAY_WEBHOOK_SECRET` — set in Razorpay webhook settings
- [ ] `CORS_ORIGIN` — your domain (e.g. `https://yourdomain.com`)

## Default Admin Account

Login at `http://YOUR_IP/admin/`  
Email: `admin@yourdomain.com`  
Password: `Admin@123` — **Change immediately after first login!**

## Common Commands

```bash
# View logs for a service
docker compose logs -f backend

# Restart a single service
docker compose restart backend

# Full restart
docker compose down && docker compose up -d

# Database backup
docker compose exec postgres pg_dump -U gpsuser gpsdb > backup_$(date +%Y%m%d).sql

# Scale backend for more capacity
docker compose up -d --scale backend=2
```

## SSL (HTTPS) Setup

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (point DNS A record to server IP first)
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  nginx/ssl/

# Uncomment the HTTPS server block in nginx/nginx.conf
# Then restart nginx
docker compose restart nginx
```
