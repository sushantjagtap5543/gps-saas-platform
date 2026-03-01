#!/bin/bash
# GPS SaaS — AWS Lightsail One-Time Setup
# Ubuntu 22.04 LTS | Run as ubuntu user
set -e

echo "==> Updating system packages..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y curl git ufw wget openssl

echo "==> Installing Docker (official method)..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

echo "==> Installing docker-compose-plugin (v2) AND docker-compose (v1 fallback)..."
sudo apt-get install -y docker-compose-plugin
# Also install standalone compose for compatibility
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

sudo systemctl enable --now docker

echo "==> Verifying Docker installation..."
docker --version
docker compose version 2>/dev/null || docker-compose --version

echo "==> Configuring UFW firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable
sudo ufw status

echo "==> Creating directories..."
mkdir -p ~/backups

echo ""
echo "=================================================="
echo "  SETUP COMPLETE. NEXT STEPS:"
echo "=================================================="
echo ""
echo "1) Log out and back in (to apply docker group):"
echo "   exit"
echo "   ssh -i key.pem ubuntu@YOUR_IP"
echo ""
echo "2) Edit environment file:"
echo "   nano .env.production"
echo ""
echo "3) Generate JWT secrets:"
echo "   openssl rand -hex 64   # copy to JWT_SECRET"
echo "   openssl rand -hex 64   # copy to JWT_REFRESH_SECRET"
echo ""
echo "4) Get SSL certificate (after DNS is pointed):"
echo "   sudo apt install -y certbot"
echo "   sudo certbot certonly --standalone -d yourdomain.com"
echo "   mkdir -p nginx/ssl"
echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/"
echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/"
echo ""
echo "5) Start all services:"
echo "   docker compose up -d --build"
echo "   # OR if compose v2 not working:"
echo "   docker-compose up -d --build"
echo ""
echo "6) Check everything is healthy:"
echo "   docker compose ps"
echo "   curl http://localhost:3000/health"
echo ""
echo "=================================================="
