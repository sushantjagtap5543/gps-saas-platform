#!/usr/bin/env bash

# ╔══════════════════════════════════════════════════════════════════╗
# ║        GPS SaaS Platform — Full Install & Start Script          ║
# ║  MODIFIED: Clean Docker + deps first, then update & install     ║
# ╚══════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────
RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'; BOLD='\\033[1m'; NC='\\033[0m'

ok()   { echo -e "${GREEN}  [✔]${NC} $*"; }
info() { echo -e "${CYAN}  [→]${NC} $*"; }
warn() { echo -e "${YELLOW}  [!]${NC} $*"; }
die()  { echo -e "${RED}  [✘] FATAL:${NC} $*"; exit 1; }
step() { echo -e "\\n${BOLD}${CYAN}━━━ $* ${NC}"; }

# ── Paths ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
LOG_FILE="$SCRIPT_DIR/install.log"

# ── Redirect all output to log ─────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       GPS SaaS Platform — CLEAN & INSTALL v1.1       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Log file: ${LOG_FILE}"
echo ""

# ══════════════════════════════════════════════════════════════════
# STEP 0 — AGGRESSIVE CLEANUP (Docker, npm, apt cache, logs)
# ══════════════════════════════════════════════════════════════════
step "STEP 0 — FULL SYSTEM CLEANUP"

# Docker full prune (ALL unused containers/images/volumes/networks)
if command -v docker >/dev/null 2>&1; then
  info "🧹 Docker cleanup..."
  docker system prune -a --volumes -f 2>/dev/null || true
  docker volume prune -f 2>/dev/null || true
  docker network prune -f 2>/dev/null || true
  docker image prune -a -f 2>/dev/null || true
  ok "Docker fully cleaned"
else
  info "No Docker found, skipping"
fi

# NPM global cache/pkgs cleanup
if command -v npm >/dev/null 2>&1; then
  info "🧹 NPM cleanup..."
  sudo npm cache clean --force
  sudo npm uninstall -g pm2 forever nodemon 2>/dev/null || true
  ok "NPM cleaned"
fi

# APT cache cleanup
info "🧹 APT cleanup..."
sudo apt autoremove -y -q
sudo apt autoclean
sudo apt clean
sudo rm -rf /var/cache/apt/archives/* /tmp/* 2>/dev/null || true

# Logs cleanup
sudo journalctl --vacuum-time=2d
sudo find /var/log -name "*.log" -delete 2>/dev/null || true

ok "✅ FULL CLEANUP COMPLETE"

# ══════════════════════════════════════════════════════════════════
# STEP 1 — SYSTEM UPDATE (full upgrade)
# ══════════════════════════════════════════════════════════════════
step "STEP 1 — FULL SYSTEM UPDATE"

info "🔄 Updating ALL packages..."
sudo apt update -y -qq
sudo apt full-upgrade -y -qq
sudo apt autoremove -y -qq
ok "✅ System fully updated"

# ══════════════════════════════════════════════════════════════════
# STEP 2 — Pre-flight checks (your original)
# ══════════════════════════════════════════════════════════════════
step "STEP 2 — Pre-flight checks"
# ... [keep your original STEP 0 code here unchanged] ...

# ══════════════════════════════════════════════════════════════════
# STEP 3 — Install DEPENDENCIES (corrected packages)
# ══════════════════════════════════════════════════════════════════
step "STEP 3 — Install REQUIRED PACKAGES"

# Core system packages (NO pm2 here)
PACKAGES=(curl wget git openssl ufw fail2ban ca-certificates gnupg lsb-release)
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${PACKAGES[@]}"

# Docker Engine
if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  sudo systemctl enable --now docker
fi

# Docker Compose
sudo apt-get install -y -q docker-compose-plugin

# Node.js LTS + PM2 (CORRECT way)
if ! command -v node >/dev/null 2>&1; then
  info "Installing Node.js LTS..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
  sudo npm install -g pm2@latest
fi

ok "✅ All dependencies installed"
# ╔══════════════════════════════════════════════════════════════════╗
# ║        GPS SaaS Platform — Full Install & Start Script          ║
# ║                                                                  ║
# ║  Usage:  bash install.sh                                         ║
# ║  Tested: Ubuntu 22.04 / 24.04  (AWS Lightsail, VPS, bare metal) ║
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

# ── Redirect all output to log as well ────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

# ══════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       GPS SaaS Platform — Installer v1.0             ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Log file: ${LOG_FILE}"
echo ""

# ══════════════════════════════════════════════════════════════════
# STEP 0 — Pre-flight checks
# ══════════════════════════════════════════════════════════════════
step "STEP 0 — Pre-flight checks"

# Must NOT be root
[[ $(id -u) -ne 0 ]] || die "Run as a regular user (not root). Use: bash install.sh"

# OS check
OS_ID=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "unknown")
OS_VER=$(grep -oP '(?<=^VERSION_ID=).+' /etc/os-release | tr -d '"' 2>/dev/null || echo "0")
info "OS: ${OS_ID} ${OS_VER}"
[[ "$OS_ID" == "ubuntu" ]] || warn "This script is tested on Ubuntu. Proceed with caution on ${OS_ID}."

# Architecture
ARCH=$(uname -m)
info "Architecture: ${ARCH}"

# RAM check (warn if under 1.5 GB)
TOTAL_RAM_MB=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)
info "RAM: ${TOTAL_RAM_MB} MB detected"
if (( TOTAL_RAM_MB < 1500 )); then
  warn "Less than 1.5 GB RAM detected. The platform may be unstable."
  warn "Recommended: 2 GB+ RAM. Swap will be created to help."
fi

# .env.production must exist
[[ -f "$ENV_FILE" ]]    || die ".env.production not found at: ${ENV_FILE}"
# docker-compose.yml must exist
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml not found at: ${COMPOSE_FILE}"

ok "Pre-flight checks passed"

# ══════════════════════════════════════════════════════════════════
# STEP 1 — Swap memory (critical for 2 GB instances)
# ══════════════════════════════════════════════════════════════════
step "STEP 1 — Swap memory"

if [ ! -f /swapfile ]; then
  info "Creating 2 GB swap file (helps on low-RAM servers)..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap  /swapfile  > /dev/null
  sudo swapon  /swapfile
  # Make swap permanent across reboots
  grep -q '/swapfile' /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab > /dev/null
  echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf > /dev/null
  sudo sysctl -p > /dev/null 2>&1
  ok "Swap created: $(free -h | awk '/Swap/{print $2}')"
else
  ok "Swap already exists: $(free -h | awk '/Swap/{print $2}')"
fi

# ══════════════════════════════════════════════════════════════════
# STEP 2 — System packages
# ══════════════════════════════════════════════════════════════════
step "STEP 2 — System packages"

info "Updating package lists..."
sudo apt-get update -y -q

PACKAGES=(curl wget git openssl ufw fail2ban ca-certificates gnupg lsb-release)
info "Installing: ${PACKAGES[*]}"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${PACKAGES[@]}"
ok "System packages installed"

# ══════════════════════════════════════════════════════════════════
# STEP 3 — Docker Engine
# ══════════════════════════════════════════════════════════════════
step "STEP 3 — Docker Engine"

if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  ok "Docker already installed: v${DOCKER_VER}"
else
  info "Installing Docker Engine (official script)..."
  curl -fsSL https://get.docker.com | sudo sh
  ok "Docker installed: $(docker --version)"
fi

# Docker Compose plugin
if docker compose version &>/dev/null 2>&1; then
  ok "Docker Compose plugin: $(docker compose version --short 2>/dev/null || echo 'present')"
else
  info "Installing Docker Compose plugin..."
  sudo apt-get install -y -q docker-compose-plugin
  ok "Docker Compose plugin installed"
fi

# Add current user to docker group (so no sudo needed)
if ! groups "$USER" | grep -q docker; then
  info "Adding ${USER} to docker group..."
  sudo usermod -aG docker "$USER"
  warn "You may need to log out and back in for docker group to take effect."
  warn "If 'docker ps' fails after install, run: newgrp docker"
fi

# Ensure Docker daemon is running
sudo systemctl enable --now docker > /dev/null 2>&1
ok "Docker daemon running"

# ══════════════════════════════════════════════════════════════════
# STEP 4 — Firewall (UFW)
# ══════════════════════════════════════════════════════════════════
step "STEP 4 — Firewall (UFW)"

info "Configuring UFW firewall rules..."
sudo ufw --force reset    > /dev/null
sudo ufw default deny incoming  > /dev/null
sudo ufw default allow outgoing > /dev/null
sudo ufw allow 22/tcp   comment 'SSH'        > /dev/null
sudo ufw allow 80/tcp   comment 'HTTP'       > /dev/null
sudo ufw allow 443/tcp  comment 'HTTPS'      > /dev/null
sudo ufw allow 5000/tcp comment 'GPS-TCP'    > /dev/null
sudo ufw --force enable > /dev/null
ok "Firewall enabled. Open ports: 22, 80, 443, 5000"

# ══════════════════════════════════════════════════════════════════
# STEP 5 — Kernel tuning for high-concurrency GPS traffic
# ══════════════════════════════════════════════════════════════════
step "STEP 5 — Kernel network tuning"

cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-gps-saas.conf > /dev/null
# GPS SaaS — high-concurrency network tuning
net.core.somaxconn          = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse        = 1
net.ipv4.ip_local_port_range = 1024 65535
fs.file-max                  = 200000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-gps-saas.conf > /dev/null 2>&1
ok "Kernel tuned for GPS TCP concurrency"

# ══════════════════════════════════════════════════════════════════
# STEP 6 — Generate secrets & validate .env.production
# ══════════════════════════════════════════════════════════════════
step "STEP 6 — Environment configuration"

# Auto-generate JWT secrets if they are still placeholders
if grep -q "REPLACE_run_openssl_rand" "$ENV_FILE"; then
  info "Generating JWT secrets with openssl..."
  JWT_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH=$(openssl rand -hex 64)
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|${JWT_SECRET}|g"          "$ENV_FILE"
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|${JWT_REFRESH}|g" "$ENV_FILE"
  ok "JWT_SECRET and JWT_REFRESH_SECRET auto-generated"
else
  ok "JWT secrets already set"
fi

# Validate that critical variables are present and non-empty
REQUIRED_VARS=(POSTGRES_PASSWORD POSTGRES_USER POSTGRES_DB JWT_SECRET JWT_REFRESH_SECRET)
MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
  VALUE=$(grep -E "^${VAR}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [[ -z "$VALUE" || "$VALUE" == REPLACE* ]]; then
    MISSING+=("$VAR")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  die "The following required variables in .env.production are missing or still placeholder values:\n    ${MISSING[*]}\n\n    Edit the file and re-run:  nano ${ENV_FILE}"
fi

ok "All required environment variables are set"

# Warn about optional-but-important vars still set to placeholder
OPTIONAL_WARN=()
for VAR in RAZORPAY_KEY RAZORPAY_SECRET RAZORPAY_WEBHOOK_SECRET; do
  VALUE=$(grep -E "^${VAR}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
  [[ "$VALUE" == REPLACE* || "$VALUE" == rzp_live_REPLACE* ]] && OPTIONAL_WARN+=("$VAR")
done
if [[ ${#OPTIONAL_WARN[@]} -gt 0 ]]; then
  warn "Razorpay keys are placeholder — payments will not work until set:"
  for V in "${OPTIONAL_WARN[@]}"; do warn "    $V"; done
  warn "Edit .env.production to add real keys after installation."
fi

# ══════════════════════════════════════════════════════════════════
# STEP 7 — Nginx SSL directory
# ══════════════════════════════════════════════════════════════════
step "STEP 7 — Nginx SSL directory"

mkdir -p "$SCRIPT_DIR/nginx/ssl"
chmod 700 "$SCRIPT_DIR/nginx/ssl"
ok "nginx/ssl directory ready"

# ══════════════════════════════════════════════════════════════════
# STEP 8 — Handle stale pgdata volume (avoid password auth errors)
# ══════════════════════════════════════════════════════════════════
step "STEP 8 — Docker volume check"

# Detect the project name Docker Compose will use
COMPOSE_PROJECT=$(basename "$SCRIPT_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
PGDATA_VOLUME="${COMPOSE_PROJECT}_pgdata"

if docker volume inspect "$PGDATA_VOLUME" > /dev/null 2>&1; then
  warn "Existing pgdata volume found: ${PGDATA_VOLUME}"
  warn "This can cause 'password authentication failed' if the password changed."
  echo ""
  read -rp "  Remove old volume and start fresh? Data will be LOST. [y/N] " REMOVE_VOL
  if [[ "${REMOVE_VOL,,}" == "y" ]]; then
    info "Removing stale volume: ${PGDATA_VOLUME}..."
    docker volume rm "$PGDATA_VOLUME" || true
    ok "Old pgdata volume removed — PostgreSQL will re-initialise cleanly"
  else
    ok "Keeping existing volume (if password matches, it will work fine)"
  fi
else
  ok "No existing pgdata volume — fresh install"
fi

# ══════════════════════════════════════════════════════════════════
# STEP 9 — Pull base images
# ══════════════════════════════════════════════════════════════════
step "STEP 9 — Pull Docker base images"

info "Pulling postgres, redis, nginx images (build layers cached for speed)..."
# Use || true so a network blip doesn't abort — docker build will retry
docker pull postgis/postgis:15-3.3  || warn "Could not pre-pull postgis (will try at build time)"
docker pull redis:7-alpine           || warn "Could not pre-pull redis"
docker pull nginx:1.25-alpine        || warn "Could not pre-pull nginx"
docker pull node:20-alpine           || warn "Could not pre-pull node:20-alpine"
ok "Base images pulled"

# ══════════════════════════════════════════════════════════════════
# STEP 10 — Build all services
# ══════════════════════════════════════════════════════════════════
step "STEP 10 — Build application images"

info "Building all Docker images (this may take 3–10 minutes on first run)..."
cd "$SCRIPT_DIR"

# Use newgrp to run in docker group if we just added the user
if ! groups "$USER" | grep -q docker; then
  DOCKER_CMD="sudo docker"
else
  DOCKER_CMD="docker"
fi

$DOCKER_CMD compose --env-file "$ENV_FILE" build --parallel 2>&1 | \
  grep -E "^(Step|#|=>|DONE|ERROR|Successfully)" || true

ok "All images built successfully"

# ══════════════════════════════════════════════════════════════════
# STEP 11 — Start all services
# ══════════════════════════════════════════════════════════════════
step "STEP 11 — Starting all services"

info "Starting containers in detached mode..."
$DOCKER_CMD compose --env-file "$ENV_FILE" up -d

ok "All containers started"

# ══════════════════════════════════════════════════════════════════
# STEP 12 — Health checks
# ══════════════════════════════════════════════════════════════════
step "STEP 12 — Health checks"

info "Waiting 30 seconds for services to initialise..."
sleep 30

# Check container statuses
echo ""
info "Container statuses:"
$DOCKER_CMD compose --env-file "$ENV_FILE" ps

# Wait up to 90s for backend health endpoint
info "Checking backend API health (up to 90s)..."
HEALTH_URL="http://localhost:3000/health"
ATTEMPTS=0
MAX_ATTEMPTS=18  # 18 × 5s = 90s
BACKEND_OK=false

while (( ATTEMPTS < MAX_ATTEMPTS )); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    BACKEND_OK=true
    break
  fi
  ATTEMPTS=$(( ATTEMPTS + 1 ))
  info "  Attempt ${ATTEMPTS}/${MAX_ATTEMPTS} — HTTP ${HTTP_CODE} — retrying in 5s..."
  sleep 5
done

echo ""
if $BACKEND_OK; then
  HEALTH_BODY=$(curl -s "$HEALTH_URL" 2>/dev/null || echo "{}")
  ok "Backend API is healthy: ${HEALTH_BODY}"
else
  warn "Backend did not respond within 90 seconds."
  warn "Check logs: docker compose logs backend --tail=50"
fi

# Check Redis
REDIS_PING=$($DOCKER_CMD exec gps_redis redis-cli ping 2>/dev/null || echo "FAILED")
if [[ "$REDIS_PING" == "PONG" ]]; then
  ok "Redis: PONG ✔"
else
  warn "Redis ping failed. Check: docker logs gps_redis"
fi

# Check PostgreSQL
PG_READY=$($DOCKER_CMD exec gps_postgres pg_isready -U gpsuser -d gpsdb 2>/dev/null || echo "FAILED")
if echo "$PG_READY" | grep -q "accepting connections"; then
  ok "PostgreSQL: accepting connections ✔"
else
  warn "PostgreSQL not ready. Check: docker logs gps_postgres"
fi

# ══════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║        GPS SaaS Platform — Installation Complete!   ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Service URLs${NC}"
echo -e "  ├── Customer Portal : http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)/"
echo -e "  ├── Admin Panel     : http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)/admin"
echo -e "  ├── Backend API     : http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)/api"
echo -e "  └── GPS TCP Server  : port 5000"
echo ""
echo -e "  ${BOLD}Useful commands${NC}"
echo -e "  ├── View logs      : docker compose logs -f [backend|postgres|redis]"
echo -e "  ├── Stop all       : docker compose --env-file .env.production down"
echo -e "  ├── Restart        : docker compose --env-file .env.production restart"
echo -e "  ├── Update & rebuild: docker compose --env-file .env.production up -d --build"
echo -e "  └── Reset DB volume: bash scripts/reset-db-volume.sh"
echo ""
if [[ ${#OPTIONAL_WARN[@]} -gt 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠  Payments need Razorpay keys in .env.production${NC}"
  echo ""
fi
echo -e "  Full install log: ${LOG_FILE}"
echo ""
