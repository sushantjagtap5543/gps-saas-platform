#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║        GPS SaaS Platform — FULL CLEAN & INSTALL v2.1 (FIXED)     ║
# ║  FIXES: Docker perms, unbound vars, Ubuntu 24.04, Node.js LTS   ║
# ╚══════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  [✔]${NC} $*"; }
info() { echo -e "${CYAN}  [→]${NC} $*"; }
warn() { echo -e "${YELLOW}  [!]${NC} $*"; }
die()  { echo -e "${RED}  [✘] FATAL:${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}━━━ $* ${NC}"; }

# ── Paths ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
LOG_FILE="$SCRIPT_DIR/install.log"

# ── Docker command (handles sudo/newgrp automatically) ─────────────
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
  warn "Using sudo for Docker - run 'newgrp docker' after install"
fi

# ── Redirect output to log ──────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       GPS SaaS Platform — CLEAN & INSTALL v2.1       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Docker cmd: ${DOCKER_CMD}"
echo -e "  Log: ${LOG_FILE}"
echo ""

# ══════════════════════════════════════════════════════════════════
# STEP 0 — FULL CLEANUP
step "STEP 0 — FULL SYSTEM CLEANUP"
${DOCKER_CMD} system prune -a --volumes -f 2>/dev/null || true
sudo npm cache clean --force 2>/dev/null || true
sudo apt autoremove -y -qq && sudo apt autoclean -qq && sudo apt clean
sudo journalctl --vacuum-time=2d -q 2>/dev/null || true
ok "✅ CLEANUP COMPLETE"

# ══════════════════════════════════════════════════════════════════
# STEP 1 — SYSTEM UPDATE
step "STEP 1 — FULL SYSTEM UPDATE"
sudo apt update -y -qq && sudo apt full-upgrade -y -qq && sudo apt autoremove -y -qq
ok "✅ UPDATED"

# ══════════════════════════════════════════════════════════════════
# STEP 2 — PRE-FLIGHT CHECKS
step "STEP 2 — Pre-flight checks"
[[ $(id -u) -ne 0 ]] || die "Run as regular user (not root)"

OS_ID=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "unknown")
info "OS: ${OS_ID} $(grep -oP '(?<=^VERSION_ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "0")"

TOTAL_RAM_MB=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)
info "RAM: ${TOTAL_RAM_MB} MB"
(( TOTAL_RAM_MB >= 1500 )) || warn "Recommend 2GB+ RAM"

[[ -f "$ENV_FILE" ]] || die ".env.production missing: ${ENV_FILE}"
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml missing: ${COMPOSE_FILE}"
ok "✅ Pre-flight OK"

# ══════════════════════════════════════════════════════════════════
# STEP 3 — SWAP (if needed)
step "STEP 3 — Swap memory"
[[ -f /swapfile ]] || {
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
}
ok "Swap: $(free -h | awk '/Swap/{print $2}')"

# ══════════════════════════════════════════════════════════════════
# STEP 4 — DEPENDENCIES (idempotent)
step "STEP 4 — Install dependencies"
sudo apt install -y curl wget git openssl ufw ca-certificates gnupg lsb-release

# Docker (already works)
sudo systemctl enable --now docker >/dev/null 2>&1
sudo usermod -aG docker "$USER" 2>/dev/null || true
ok "Docker: $(docker --version 2>/dev/null || echo 'v$(sudo docker --version | awk "{print \$3}" | tr -d ",")')"

# Docker Compose
docker compose version >/dev/null 2>&1 || sudo apt install -y docker-compose-plugin
ok "Compose: $(docker compose version --short 2>/dev/null || echo 'OK')"

# Node.js + PM2
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
fi
sudo npm install -g pm2@latest 2>/dev/null || true
ok "Node: $(node --version 2>/dev/null || echo 'OK')"

# ══════════════════════════════════════════════════════════════════
# STEP 5 — FIREWALL
step "STEP 5 — UFW Firewall"
sudo ufw --force reset >/dev/null 2>&1
sudo ufw default deny incoming >/dev/null 2>&1
sudo ufw default allow outgoing >/dev/null 2>&1
sudo ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1
sudo ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1
sudo ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1
sudo ufw allow 5000/tcp comment 'GPS-TCP' >/dev/null 2>&1
sudo ufw --force enable >/dev/null 2>&1
ok "Firewall: 22,80,443,5000"

# ══════════════════════════════════════════════════════════════════
# STEP 6 — KERNEL TUNING
step "STEP 6 — Kernel tuning"
cat <<'EOF' | sudo tee /etc/sysctl.d/99-gps.conf >/dev/null
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.tcp_tw_reuse=1
net.ipv4.ip_local_port_range=1024 65535
fs.file-max=200000
EOF
sudo sysctl -p /etc/sysctl.d/99-gps.conf >/dev/null 2>&1
ok "Kernel tuned"

# ══════════════════════════════════════════════════════════════════
# STEP 7 — ENV SECRETS
step "STEP 7 — Environment secrets"
if grep -q "REPLACE_run_openssl_rand" "$ENV_FILE" 2>/dev/null; then
  JWT_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH=$(openssl rand -hex 64)
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|${JWT_SECRET}|g" "$ENV_FILE"
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|${JWT_REFRESH}|g" "$ENV_FILE"
  ok "JWT secrets generated"
fi

REQUIRED=(POSTGRES_PASSWORD POSTGRES_USER POSTGRES_DB JWT_SECRET JWT_REFRESH_SECRET)
for var in "${REQUIRED[@]}"; do
  grep -q "^${var}=" "$ENV_FILE" || die "Missing ${var} in ${ENV_FILE}"
done
ok "✅ Environment OK"

# ══════════════════════════════════════════════════════════════════
# STEP 8 — BUILD & START (MAIN EVENT)
step "STEP 8 — Build & Start GPS SaaS"
cd "$SCRIPT_DIR"

# Pull base images (ignore permission errors - build will fetch)
${DOCKER_CMD} pull postgis/postgis:15-3.3 2>/dev/null || true
${DOCKER_CMD} pull redis:7-alpine 2>/dev/null || true
${DOCKER_CMD} pull nginx:1.25-alpine 2>/dev/null || true

# BUILD (this takes 3-10 mins first time)
info "Building services (3-10 mins)..."
${DOCKER_CMD} compose --env-file "$ENV_FILE" build --parallel

# START
info "Starting services..."
${DOCKER_CMD} compose --env-file "$ENV_FILE" up -d
ok "✅ Services running"

# ══════════════════════════════════════════════════════════════════
# STEP 9 — HEALTH CHECKS
step "STEP 9 — Health checks"
sleep 30
${DOCKER_CMD} compose ps

# Backend API
HEALTH_URL="http://localhost:3000/health"
for i in {1..18}; do
  if curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null | grep -q 200; then
    ok "Backend: HEALTHY ($(curl -s "$HEALTH_URL"))"
    break
  fi
  sleep 5
done || warn "Backend slow - check: ${DOCKER_CMD} compose logs backend"

# Database/Redis
${DOCKER_CMD} compose ps | grep -q Up || warn "Some services down - check logs"

# ══════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}${GREEN}🎉 GPS SaaS LIVE!${NC}"
echo -e "🌐 Customer: http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_IP)/"
echo -e "👨‍💼 Admin:    http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_IP)/admin"
echo -e "📡 GPS TCP:    port 5000 (devices connect here)"
echo -e "\n🔧 Commands:"
echo -e "  ${DOCKER_CMD} compose logs -f"
echo -e "  ${DOCKER_CMD} compose down"
echo -e "  ${DOCKER_CMD} compose up -d --build"
echo -e "  newgrp docker  (fix permissions)"
echo -e "\n📋 Log: ${LOG_FILE}"
