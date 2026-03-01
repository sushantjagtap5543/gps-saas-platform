#!/bin/bash
# ============================================================
# GPS SaaS — AWS Lightsail 2GB  |  Step 1: Server Setup
# Run ONCE on a fresh Ubuntu 22.04 instance
# Usage: bash 01-server-setup.sh
# ============================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
die()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

[[ $(id -u) -eq 0 ]] && die "Do NOT run as root. Run as ubuntu: bash 01-server-setup.sh"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   GPS SaaS — AWS Lightsail 2GB Setup Script     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. System update ─────────────────────────────────────────
info "Updating system packages..."
sudo apt-get update -y -q
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q
sudo apt-get install -y -q \
  curl wget git openssl htop net-tools \
  unzip jq python3 python3-pip \
  fail2ban ufw
log "System updated"

# ── 2. Swap (CRITICAL for 2GB RAM) ───────────────────────────
SWAP_FILE=/swapfile
if [ ! -f "$SWAP_FILE" ]; then
  info "Creating 2GB swap (essential for 2GB RAM instance)..."
  sudo fallocate -l 2G $SWAP_FILE
  sudo chmod 600 $SWAP_FILE
  sudo mkswap $SWAP_FILE
  sudo swapon $SWAP_FILE
  # Persist across reboots
  echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab > /dev/null
  # Tune swappiness for production (swap only under memory pressure)
  echo "vm.swappiness=10"        | sudo tee -a /etc/sysctl.conf > /dev/null
  echo "vm.vfs_cache_pressure=50"| sudo tee -a /etc/sysctl.conf > /dev/null
  sudo sysctl -p > /dev/null 2>&1
  log "Swap configured: $(free -h | grep Swap)"
else
  log "Swap already exists"
fi

# ── 3. Docker ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  log "Docker installed: $(docker --version)"
else
  log "Docker already installed: $(docker --version)"
fi

# ── 4. Docker Compose ─────────────────────────────────────────
if ! docker compose version &>/dev/null 2>&1; then
  info "Installing Docker Compose plugin..."
  sudo apt-get install -y -q docker-compose-plugin
fi
log "Docker Compose: $(docker compose version)"

sudo systemctl enable --now docker

# ── 5. UFW Firewall ───────────────────────────────────────────
info "Configuring UFW firewall..."
sudo ufw --force reset > /dev/null
sudo ufw default deny incoming  > /dev/null
sudo ufw default allow outgoing > /dev/null
sudo ufw allow 22/tcp   comment 'SSH'
sudo ufw allow 80/tcp   comment 'HTTP'
sudo ufw allow 443/tcp  comment 'HTTPS'
sudo ufw allow 5000/tcp comment 'GPS TCP devices'
sudo ufw --force enable > /dev/null
log "Firewall configured"

# ── 6. Fail2ban (brute-force protection) ─────────────────────
info "Configuring fail2ban..."
sudo systemctl enable --now fail2ban > /dev/null 2>&1
log "Fail2ban active"

# ── 7. Kernel tuning for TCP server ──────────────────────────
info "Applying kernel network tuning..."
cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-gps-saas.conf > /dev/null
# GPS SaaS TCP tuning
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.ip_local_port_range=1024 65535
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_keepalive_time=60
net.ipv4.tcp_keepalive_intvl=10
net.ipv4.tcp_keepalive_probes=6
# File descriptor limits
fs.file-max=200000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-gps-saas.conf > /dev/null 2>&1
log "Kernel tuned"

# ── 8. Increase file descriptor limits ───────────────────────
cat <<'LIMITS' | sudo tee /etc/security/limits.d/99-gps-saas.conf > /dev/null
* soft nofile 65535
* hard nofile 65535
ubuntu soft nofile 65535
ubuntu hard nofile 65535
LIMITS
log "File limits set"

# ── 9. Create app directory ───────────────────────────────────
mkdir -p ~/gps-saas-platform/nginx/ssl
mkdir -p ~/backups
log "Directories created"

# ── 10. Log rotation ─────────────────────────────────────────
cat <<'LOGROTATE' | sudo tee /etc/logrotate.d/gps-saas > /dev/null
/home/ubuntu/gps-saas-platform/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
LOGROTATE
log "Log rotation configured"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           STEP 1 COMPLETE ✅                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
warn "IMPORTANT: Log out and back in to apply Docker group!"
echo ""
echo "  exit"
echo "  ssh -i your-key.pem ubuntu@$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP')"
echo ""
echo "Then run Step 2:"
echo "  cd ~/gps-saas-platform && bash scripts/02-configure-env.sh"
echo ""
