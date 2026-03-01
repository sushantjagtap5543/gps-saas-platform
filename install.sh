#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║        GPS SaaS Platform — FULL CLEAN & INSTALL v2.0             ║
# ║  Ubuntu 22.04/24.04 • AWS Lightsail • Docker Compose • GPS TCP  ║
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

# ── Redirect all output to log ─────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       GPS SaaS Platform — CLEAN & INSTALL v2.0       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Log file: ${LOG_FILE}"
echo ""

# ══════════════════════════════════════════════════════════════════
# STEP 0 — AGGRESSIVE FULL CLEANUP
# ══════════════════════════════════════════════════════════════════
step "STEP 0 — FULL SYSTEM CLEANUP (Docker/NPM/APT/Logs)"

# Docker: Remove ALL containers/images/volumes/networks
if command -v docker >/dev/null 2>&1; then
  info "🧹 Docker full cleanup..."
  docker stop $(docker ps -q) 2>/dev/null || true
  docker rm $(docker ps -aq) 2>/dev/null || true
  docker system prune -a --volumes -f 2>/dev/null || true
  docker volume prune -f 2>/dev/null || true
  docker network prune -f 2>/dev/null || true
  ok "Docker completely cleaned"
else
  info "Docker not found, skipping"
fi

# NPM global cleanup
if command -v npm >/dev/null 2>&1; then
  info "🧹 NPM global cleanup..."
  sudo npm cache clean --force 2>/dev/null || true
  sudo npm uninstall -g pm2 forever nodemon 2>/dev/null || true
  ok "NPM cleaned"
fi

# APT full cleanup
info "🧹 APT cache cleanup..."
sudo apt autoremove -y -qq
sudo apt autoclean -qq
sudo apt clean
sudo rm -rf /var/cache/apt/archives/* /tmp/* /var/tmp/* 2>/dev/null || true

# System logs cleanup
sudo journalctl --vacuum-time=2d -q 2>/dev/null || true
sudo find /var/log -type f -name "*.log" -delete 2>/dev/null || true
ok "✅ FULL CLEANUP COMPLETE"

# ══════════════════════════════════════════════════════════════════
# STEP 1 — SYSTEM FULL UPDATE
# ══════════════════════════════════════════════════════════════════
step "STEP 1 — FULL SYSTEM UPDATE"
info "🔄 Updating Ubuntu packages..."
sudo apt update -y -qq
sudo apt full-upgrade -y -qq
sudo apt autoremove -y -qq
sudo apt autoclean -qq
ok "✅ System fully updated"

# ══════════════════════════════════════════════════════════════════
# STEP 2 — PRE-FLIGHT CHECKS
# ══════════════════════════════════════════════════════════════════
step "STEP 2 — Pre-flight checks"

[[ $(id -u) -ne 0 ]] || die "Run as regular user (not root): bash install.sh"

OS_ID=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "unknown")
OS_VER=$(grep -oP '(?<=^VERSION_ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "0")
info "OS: ${OS_ID} ${OS_VER}"
[[ "$OS_ID" == "ubuntu" ]] || warn "Tested on Ubuntu. Proceed with caution on ${OS_ID}."

ARCH=$(uname -m)
info "Architecture: ${ARCH}"

TOTAL_RAM_MB=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)
info "RAM: ${TOTAL_RAM_MB} MB"
(( TOTAL_RAM_MB >= 1500 )) || warn "Less than 1.5GB RAM. Recommend 2GB+ for production."

[[ -f "$ENV_FILE" ]] || die ".env.production not found: ${ENV_FILE}"
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml not found: ${COMPOSE_FILE}"
ok "✅ Pre-flight checks passed"

# ══════════════════════════════════════════════════════════════════
# STEP 3 — SWAP MEMORY (Critical for 2GB instances)
# ══════════════════════════════════════════════════════════════════
step "STEP 3 — Swap memory setup"
if [[ ! -f /swapfile ]]; then
  info "Creating 2GB swap file..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf >/dev/null
  sudo sysctl -p >/dev/null 2>&1
  ok "Swap: $(free -h | awk '/Swap/{print $2}')"
else
  ok "Swap exists: $(free -h | awk '/Swap/{print $2}')"
fi

# ══════════════════════════════════════════════════════════════════
# STEP 4 — INSTALL DEPENDENCIES (CORRECTED)
# ══════════════════════════════════════════════════════════════════
step "STEP 4 — Install all dependencies"

# Core packages
PACKAGES=(curl wget git openssl ufw ca-certificates gnupg lsb-release)
info "Installing core packages: ${PACKAGES[*]}"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${PACKAGES[@]}"

# Docker Engine
if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  sudo systemctl enable --now docker >/dev/null 2>&1
  ok "Docker: $(docker --version)"
else
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  ok "Docker already installed: v${DOCKER_VER}"
fi

# Docker Compose plugin
if ! docker compose version >/dev/null 2>&1; then
  info "Installing Docker Compose plugin..."
  sudo apt-get update -qq
  sudo apt-get install -y -q docker-compose-plugin
fi
ok "Docker Compose: $(docker compose version --short 2>/dev/null || echo 'v2+')"

# Node.js LTS + PM2
if ! command -v node >/dev/null 2>&1; then
  info "Installing Node.js LTS + PM2..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
  sudo npm install -g pm2@latest
  ok "Node: $(node --version), PM2: $(pm2 --version)"
else
  ok "Node.js already installed: $(node --version)"
fi

# ══════════════════════════════════════════════════════════════════
# STEP 5 — FIREWALL CONFIGURATION
# ══════════════════════════════════════════════════════════════════
step "STEP 5 — UFW Firewall"
info "Configuring firewall..."
sudo ufw --force reset >/dev/null 2>&1
sudo ufw default deny incoming >/dev/null 2>&1
sudo ufw default allow outgoing >/dev/null 2>&1
sudo ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1
sudo ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1
sudo ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1
sudo ufw allow 5000/tcp comment 'GPS-TCP' >/dev/null 2>&1
sudo ufw --force enable >/dev/null 2>&1
ok "Firewall: ports 22,80,443,5000 open"

# ══════════════════════════════════════════════════════════════════
# STEP 6 — KERNEL TUNING (GPS high-concurrency)
# ══════════════════════════════════════════════════════════════════
step "STEP 6 — Kernel network tuning"
cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-gps-saas.conf >/dev/null
# GPS SaaS — High-concurrency TCP tuning
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.tcp_tw_reuse=1
net.ipv4.ip_local_port_range=1024 65535
fs.file-max=200000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-gps-saas.conf >/dev/null 2>&1
ok "Kernel tuned for GPS traffic"

# ══════════════════════════════════════════════════════════════════
# STEP 7 — ENVIRONMENT VALIDATION
# ══════════════════════════════════════════════════════════════════
step "STEP 7 — Environment configuration"
if grep -q "REPLACE_run_openssl_rand" "$ENV_FILE" 2>/dev/null; then
  info "Generating JWT secrets..."
  JWT_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH=$(openssl rand -hex 64)
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|${JWT_SECRET}|g" "$ENV_FILE"
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|${JWT_REFRESH}|g" "$ENV_FILE"
  ok "JWT secrets generated"
fi

REQUIRED_VARS=(POSTGRES_PASSWORD POSTGRES_USER POSTGRES_DB JWT_SECRET JWT_REFRESH_SECRET)
MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
  VALUE=$(grep -E "^${VAR}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  [[ -z "$VALUE" || "$VALUE" == REPLACE* ]] && MISSING+=("$VAR")
done

[[ ${#MISSING[@]} -eq 0 ]] || die "Missing env vars: ${MISSING[*]}. Edit ${ENV_FILE}"

ok "✅ Environment validated"

# ══════════════════════════════════════════════════════════════════
# STEP 8 — NGINX SSL DIRECTORY
# ══════════════════════════════════════════════════════════════════
step "STEP 8 — Nginx SSL setup"
mkdir -p "$SCRIPT_DIR/nginx/ssl"
chmod 700 "$SCRIPT_DIR/nginx/ssl"
ok "nginx/ssl ready"

# ══════════════════════════════════════════════════════════════════
# STEP 9 — DOCKER VOLUME CLEANUP
# ══════════════════════════════════════════════════════════════════
step "STEP 9 — Docker volume check"
COMPOSE_PROJECT=$(basename "$SCRIPT_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
PGDATA_VOLUME="${COMPOSE_PROJECT}_pgdata"

if docker volume inspect "$PGDATA_VOLUME" >/dev/null 2>&1; then
  warn "Stale pgdata volume: ${PGDATA_VOLUME}"
  read -rp "Remove? Data LOST. [y/N]: " -n 1
  echo
  [[ "${REPLY,,}" == "y" ]] && docker volume rm "$PGDATA_VOLUME" && ok "Volume removed"
else
  ok "Fresh install - no stale volumes"
fi

# ══════════════════════════════════════════════════════════════════
# STEP 10 — PULL BASE IMAGES
# ══════════════════════════════════════════════════════════════════
step "STEP 10 — Pull Docker images"
docker pull postgis/postgis:15-3.3 || warn "PostGIS pull failed"
docker pull redis:7-alpine || warn "Redis pull failed"
docker pull nginx:1.25-alpine || warn "Nginx pull failed"
docker pull node:20-alpine || warn "Node pull failed"
ok "Base images ready"

# ══════════════════════════════════════════════════════════════════
# STEP 11 — BUILD & START
# ══════════════════════════════════════════════════════════════════
step "STEP 11 — Build & start services"
cd "$SCRIPT_DIR"
DOCKER_CMD=$(groups "$USER" | grep -q docker || echo "sudo") docker
${DOCKER_CMD} compose --env-file "$ENV_FILE" build --parallel
${DOCKER_CMD} compose --env-file "$ENV_FILE" up -d
ok "All services started"

# ══════════════════════════════════════════════════════════════════
# STEP 12 — HEALTH CHECKS
# ══════════════════════════════════════════════════════════════════
step "STEP 12 — Health checks"
sleep 30
echo "Container status:"
${DOCKER_CMD} compose ps

HEALTH_URL="http://localhost:3000/health"
for i in {1..18}; do
  [[ "$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo 000)" == "200" ]] && { ok "Backend healthy!"; break; }
  info "Backend check ${i}/18... $(sleep 5)"
done || warn "Backend slow to start - check: docker compose logs backend"

${DOCKER_CMD} exec gps_redis redis-cli ping 2>/dev/null | grep -q PONG && ok "Redis: OK" || warn "Redis issue"
${DOCKER_CMD} exec gps_postgres pg_isready -U gpsuser -d gpsdb 2>/dev/null | grep -q "accepting" && ok "PostgreSQL: OK" || warn "PostgreSQL issue"

# ══════════════════════════════════════════════════════════════════
# COMPLETE!
echo -e "\n${BOLD}${GREEN}🎉 INSTALLATION COMPLETE!${NC}"
echo -e "  Customer Portal: http://$(curl -s ifconfig.me || echo YOUR_IP)/"
echo -e "  Admin Panel:     http://$(curl -s ifconfig.me || echo YOUR_IP)/admin"
echo -e "  GPS TCP:         port 5000"
echo -e "\nCommands:\n  docker compose logs -f\n  docker compose down\n  docker compose up -d --build"
echo -e "  Log: ${LOG_FILE}"
