#!/bin/bash
# ══════════════════════════════════════════════════════
#  GPS SaaS — AWS Lightsail One-Time Setup Script
#  Ubuntu 22.04 LTS | Run as ubuntu user
# ══════════════════════════════════════════════════════
set -e

echo "==> Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
sudo apt-get install -y docker-compose-plugin

echo "==> Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable

echo "==> Cloning repository..."
cd ~
git clone https://github.com/YOUR_GITHUB_USERNAME/gps-saas-platform.git
cd gps-saas-platform

echo "==> Setting up environment..."
cp .env.production .env

echo ""
echo "══════════════════════════════════════════════════"
echo "  MANUAL STEPS REQUIRED:"
echo "══════════════════════════════════════════════════"
echo ""
echo "1) Edit .env with your real values:"
echo "   nano .env"
echo "   Required: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET,"
echo "             RAZORPAY_KEY, RAZORPAY_SECRET, RAZORPAY_WEBHOOK_SECRET,"
echo "             CORS_ORIGIN=https://yourdomain.com"
echo ""
echo "   Generate JWT secrets with:"
echo "   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))""
echo ""
echo "2) Point your domain DNS to: $(curl -s ifconfig.me 2>/dev/null || echo YOUR_IP)"
echo ""
echo "3) Get SSL certificate:"
echo "   sudo apt install -y certbot"
echo "   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com"
echo "   sudo mkdir -p nginx/ssl"
echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/"
echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/"
echo ""
echo "4) Update nginx/nginx.conf — replace 'yourdomain.com' with your real domain"
echo "   sed -i s/yourdomain.com/YOUR_ACTUAL_DOMAIN/g nginx/nginx.conf"
echo ""
echo "5) Start all services:"
echo "   docker compose up -d"
echo ""
echo "6) Set Razorpay webhook in dashboard:"
echo "   URL: https://yourdomain.com/api/billing/webhook"
echo "   Events: payment.captured"
echo ""
echo "7) Add GitHub Secrets for CI/CD:"
echo "   LIGHTSAIL_HOST     = $(curl -s ifconfig.me 2>/dev/null)"
echo "   LIGHTSAIL_USER     = ubuntu"
echo "   LIGHTSAIL_SSH_KEY  = (your ~/.ssh/id_rsa private key)"
echo "   DOCKER_USERNAME    = your_dockerhub_username"
echo "   DOCKER_PASSWORD    = your_dockerhub_password"
echo ""
echo "8) Verify everything is running:"
echo "   docker compose ps"
echo "   curl http://localhost:3000/health"
echo ""
echo "══════════════════════════════════════════════════"
echo "  Access URLs after setup:"
echo "  Client App: https://yourdomain.com"
echo "  Admin Panel: https://admin.yourdomain.com"
echo "  Grafana: https://yourdomain.com:3001"
echo "  GPS TCP: yourdomain.com:5000"
echo "══════════════════════════════════════════════════"
