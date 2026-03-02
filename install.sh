#!/bin/bash
# ============================================================
# GPS SaaS — One-Command Setup for AWS Lightsail 2GB (Ubuntu 22.04)
# Usage: bash setup.sh
# ============================================================
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
die()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

[[ $(id -u) -eq 0 ]] && die "Run as ubuntu, not root"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    GPS SaaS — Automated Server Setup            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Swap (CRITICAL for 2GB RAM) ────────────────────────────
if [ ! -f /swapfile ]; then
  info "Creating 2GB swap (essential on 2GB instance)..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab > /dev/null
  echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf > /dev/null
  sudo sysctl -p > /dev/null 2>&1
  log "Swap: $(free -h | grep Swap | awk '{print $2}')"
fi

# ── 2. System update ──────────────────────────────────────────
info "Updating system..."
sudo apt-get update -y -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q curl wget git openssl ufw fail2ban

# ── 3. Docker ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  log "Docker installed"
fi
sudo apt-get install -y -q docker-compose-plugin 2>/dev/null || true
sudo systemctl enable --now docker

# ── 4. Firewall ───────────────────────────────────────────────
info "Configuring firewall..."
sudo ufw --force reset > /dev/null
sudo ufw default deny incoming  > /dev/null
sudo ufw default allow outgoing > /dev/null
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 5000/tcp comment 'GPS TCP'
sudo ufw --force enable > /dev/null
log "Firewall ready"

# ── 5. Kernel tuning ──────────────────────────────────────────
cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-gps.conf > /dev/null
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.tcp_tw_reuse=1
fs.file-max=200000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-gps.conf > /dev/null 2>&1
log "Kernel tuned"

# ── 6. Generate JWT secrets ───────────────────────────────────
info "Generating JWT secrets..."
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH=$(openssl rand -hex 64)

# ── 7. Edit .env.production ───────────────────────────────────
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$APP_DIR/.env.production"

# Replace placeholder JWT values
sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|$JWT_SECRET|g" "$ENV"
sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|$JWT_REFRESH|g" "$ENV"

log "JWT secrets written to .env.production"

# ── 8. Create .env symlink for Docker Compose variable substitution ──
# Docker Compose reads .env (not .env.production) for ${VAR} substitution in yml.
# Symlinking ensures POSTGRES_PASSWORD and other vars are never blank.
ln -sf "$APP_DIR/.env.production" "$APP_DIR/.env"
log ".env -> .env.production symlink created"

# ── 9. Wipe stale pgdata volume to prevent password auth errors ──
# PostgreSQL only sets the password on first init. If an old volume
# exists from a failed run, it ignores POSTGRES_PASSWORD forever.
info "Removing stale PostgreSQL volumes (if any)..."
if docker compose -f "$APP_DIR/docker-compose.yml" down -v 2>/dev/null; then
  docker volume ls --format '{{.Name}}' | grep -i pgdata | xargs docker volume rm 2>/dev/null || true
fi
log "PostgreSQL volumes cleared"

# ── 10. Create nginx ssl dir ──────────────────────────────────
sudo mkdir -p "$APP_DIR/nginx/ssl"
sudo chmod 700 "$APP_DIR/nginx/ssl"
sudo chown "$USER":"$USER" "$APP_DIR/nginx/ssl" 2>/dev/null || true
log "nginx/ssl directory ready"

# ── 11. Build and start all services ─────────────────────────
info "Building Docker images (5-10 mins first run)..."
cd "$APP_DIR"
docker compose build --no-cache --parallel
docker compose up -d
log "All services started"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           SETUP COMPLETE ✅                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
echo "  🌐  Customer Portal : http://${IP}/"
echo "  ⚙️   Admin Panel     : http://${IP}/admin"
echo "  🔌  Backend API     : http://${IP}/api"
echo "  📡  GPS TCP Server  : ${IP}:5000"
echo ""
echo "  Logs   : docker compose logs -f backend"
echo "  Status : docker compose ps"
echo "  Stop   : docker compose down"
echo ""
warn "If you just added Docker, log out and back in, then re-run:"
echo "  exit && ssh ubuntu@${IP} && bash setup.sh"
