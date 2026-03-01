#!/bin/bash
# GPS SaaS — AWS Lightsail One-Time Setup
# Ubuntu 22.04 LTS  |  Run as ubuntu user with sudo access
set -euo pipefail

echo ""
echo "=================================================="
echo "  GPS SaaS — Lightsail Setup"
echo "=================================================="
echo ""

# ── System Updates ────────────────────────────────────
echo "==> Updating system packages..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y curl git ufw wget openssl python3-certbot-nginx

# ── Docker ────────────────────────────────────────────
echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Compose plugin (v2)
sudo apt-get install -y docker-compose-plugin
# Standalone fallback
sudo curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

sudo systemctl enable --now docker

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version 2>/dev/null || docker-compose --version)"

# ── Firewall ──────────────────────────────────────────
echo "==> Configuring UFW firewall..."
sudo ufw allow 22/tcp   comment "SSH"
sudo ufw allow 80/tcp   comment "HTTP"
sudo ufw allow 443/tcp  comment "HTTPS"
sudo ufw allow 5000/tcp comment "GPS TCP devices"
# Uncomment if you expose admin on a separate port:
# sudo ufw allow 3001/tcp comment "Admin UI"
sudo ufw --force enable
sudo ufw status

# ── Directory Structure ───────────────────────────────
echo "==> Creating directories..."
mkdir -p ~/gps-saas-platform/nginx/ssl ~/backups

# ── Clone Repository ──────────────────────────────────
echo "==> Cloning repository..."
if [ ! -d ~/gps-saas-platform/.git ]; then
  git clone https://github.com/sushantjagtap5543/gps-saas-platform ~/gps-saas-platform
else
  echo "   (already cloned — pulling latest)"
  cd ~/gps-saas-platform && git pull origin main
fi

cd ~/gps-saas-platform

# ── Environment File ──────────────────────────────────
if [ ! -f .env.production ]; then
  echo "==> Creating .env.production from template..."
  cp .env.production .env.production.bak 2>/dev/null || true
  
  # Generate strong JWT secrets automatically
  JWT_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH=$(openssl rand -hex 64)
  DB_PASS=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
  
  sed -i \
    -e "s|REPLACE_WITH_64_CHAR_HEX_openssl_rand_-hex_64|${JWT_SECRET}|" \
    -e "s|REPLACE_WITH_ANOTHER_64_CHAR_HEX|${JWT_REFRESH}|" \
    -e "s|StrongDBPassword@123|${DB_PASS}|g" \
    .env.production
  
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.production and fill in:"
  echo "   - RAZORPAY_KEY, RAZORPAY_SECRET, RAZORPAY_WEBHOOK_SECRET"
  echo "   - FIREBASE_SERVICE_ACCOUNT (optional)"
  echo "   - CORS_ORIGIN (your domain)"
  echo ""
  echo "   nano .env.production"
fi

echo ""
echo "=================================================="
echo "  SETUP COMPLETE — NEXT STEPS"
echo "=================================================="
echo ""
echo "1) Log out and back in (to apply docker group):"
echo "   exit && ssh ubuntu@YOUR_IP"
echo ""
echo "2) Edit environment variables:"
echo "   cd ~/gps-saas-platform && nano .env.production"
echo ""
echo "3) Start all services (first boot — builds images):"
echo "   cd ~/gps-saas-platform"
echo "   docker compose up -d --build"
echo ""
echo "4) Seed the database (creates tables + seed plans + admin user):"
echo "   docker compose exec postgres psql -U gpsuser -d gpsdb -f /docker-entrypoint-initdb.d/01-schema.sql"
echo "   NOTE: Postgres runs schema.sql automatically on first start."
echo ""
echo "5) Verify everything is healthy:"
echo "   docker compose ps"
echo "   curl http://localhost:3000/health"
echo ""
echo "6) Get SSL certificate (after DNS A record points to this IP):"
echo "   sudo certbot --nginx -d yourdomain.com"
echo "   # Then copy certs to nginx/ssl/ and update nginx.conf"
echo ""
echo "7) Admin login (change password immediately!):"
echo "   Email:    admin@yourdomain.com"
echo "   Password: Admin@123"
echo ""
echo "=================================================="
