#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════╗
# ║        GPS SaaS Platform — FINAL Install & Start Script      ║
# ║  Fixes: POSTGRES_PASSWORD blank, white page, stale volumes   ║
# ║  Usage: bash install.sh                                       ║
# ╚═══════════════════════════════════════════════════════════════╝
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  [✔]${NC} $*"; }
info() { echo -e "${CYAN}  [→]${NC} $*"; }
warn() { echo -e "${YELLOW}  [!]${NC} $*"; }
die()  { echo -e "${RED}  [✘] FATAL:${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${CYAN}  $*${NC}"; echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
LOG_FILE="$SCRIPT_DIR/install.log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        GPS SaaS Platform — Full Deploy Script         ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo -e "  Log: ${LOG_FILE}"
echo ""

# ── Detect if we need sudo for docker ─────────────────────────
if docker ps >/dev/null 2>&1; then
  DC="docker"
elif sudo docker ps >/dev/null 2>&1; then
  DC="sudo docker"
  warn "Using sudo docker (add yourself to docker group after install)"
else
  DC="docker"
fi

# ═══════════════════════════════════════════════════════════════
step "STEP 1 — Pre-flight checks"
# ═══════════════════════════════════════════════════════════════
[[ $(id -u) -ne 0 ]] || die "Do not run as root. Use your regular user account."
[[ -f "$ENV_FILE" ]]               || die ".env.production not found in $SCRIPT_DIR"
[[ -f "$SCRIPT_DIR/docker-compose.yml" ]] || die "docker-compose.yml not found"
ok "Files verified"

RAM_MB=$(awk '/MemTotal/{printf "%.0f",$2/1024}' /proc/meminfo)
info "RAM: ${RAM_MB} MB"
(( RAM_MB < 1500 )) && warn "Low RAM detected — swap will be created" || ok "RAM sufficient"

# ═══════════════════════════════════════════════════════════════
step "STEP 2 — Swap memory (prevents OOM on small servers)"
# ═══════════════════════════════════════════════════════════════
if [ ! -f /swapfile ]; then
  info "Creating 2 GB swap..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap  /swapfile >/dev/null
  sudo swapon  /swapfile
  grep -q '/swapfile' /etc/fstab || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
  ok "Swap created: $(free -h | awk '/Swap/{print $2}')"
else
  ok "Swap already exists: $(free -h | awk '/Swap/{print $2}')"
fi

# ═══════════════════════════════════════════════════════════════
step "STEP 3 — System packages"
# ═══════════════════════════════════════════════════════════════
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -yqq \
  curl wget git openssl ufw ca-certificates gnupg
ok "Packages installed"

# ═══════════════════════════════════════════════════════════════
step "STEP 4 — Docker Engine"
# ═══════════════════════════════════════════════════════════════
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  DC="sudo docker"
  ok "Docker installed"
else
  ok "Docker already installed: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
fi

if ! $DC compose version &>/dev/null 2>&1; then
  sudo apt-get install -yqq docker-compose-plugin
fi
sudo systemctl enable --now docker >/dev/null 2>&1
ok "Docker Compose: $($DC compose version --short 2>/dev/null || echo 'ready')"

# ═══════════════════════════════════════════════════════════════
step "STEP 5 — Firewall"
# ═══════════════════════════════════════════════════════════════
sudo ufw --force reset  >/dev/null
sudo ufw allow 22/tcp   >/dev/null
sudo ufw allow 80/tcp   >/dev/null
sudo ufw allow 443/tcp  >/dev/null
sudo ufw allow 5000/tcp >/dev/null
sudo ufw --force enable >/dev/null
ok "Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5000 (GPS TCP)"

# ═══════════════════════════════════════════════════════════════
step "STEP 6 — Kernel tuning"
# ═══════════════════════════════════════════════════════════════
cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-gps.conf >/dev/null
net.core.somaxconn          = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse        = 1
fs.file-max                  = 200000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-gps.conf >/dev/null 2>&1
ok "Kernel tuned for high-concurrency GPS traffic"

# ═══════════════════════════════════════════════════════════════
step "STEP 7 — Auto-generate JWT secrets"
# ═══════════════════════════════════════════════════════════════
if grep -q "REPLACE_run_openssl_rand" "$ENV_FILE"; then
  JWT1=$(openssl rand -hex 64)
  JWT2=$(openssl rand -hex 64)
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|${JWT1}|g"          "$ENV_FILE"
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|${JWT2}|g" "$ENV_FILE"
  ok "JWT secrets generated and written to .env.production"
else
  ok "JWT secrets already set"
fi

# Verify POSTGRES_PASSWORD is not blank
PG_PASS=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
[[ -z "$PG_PASS" ]] && die "POSTGRES_PASSWORD is empty in .env.production — set it first:\n  nano $ENV_FILE"
ok "POSTGRES_PASSWORD confirmed (${#PG_PASS} chars)"

# ═══════════════════════════════════════════════════════════════
step "STEP 8 — FIX: Create .env symlink for Docker Compose"
# ═══════════════════════════════════════════════════════════════
# WHY THIS IS NEEDED:
#   Docker Compose has TWO separate env mechanisms:
#   1. env_file: directive  → injects vars INTO the container (reads .env.production ✔)
#   2. ${VAR} in yml        → substituted at PARSE TIME, reads .env ONLY (not .env.production!)
#   The --env-file flag does NOT affect ${} substitution either.
#   Without .env, any ${VAR} in docker-compose.yml resolves to blank string → errors.
#   Symlinking .env → .env.production makes both mechanisms read the same file.
cd "$SCRIPT_DIR"
ln -sf .env.production .env
ok ".env → .env.production symlink created"

# Verify compose can now read POSTGRES_PASSWORD (should NOT show "not set" warning)
if $DC compose config 2>&1 | grep -q 'variable is not set'; then
  warn "Docker Compose still has unset variables — check your .env.production"
else
  ok "Docker Compose variable substitution working correctly"
fi

# ═══════════════════════════════════════════════════════════════
step "STEP 9 — FIX: Wipe stale PostgreSQL volume"
# ═══════════════════════════════════════════════════════════════
# WHY THIS IS NEEDED:
#   PostgreSQL sets the password ONLY on first init (empty data dir).
#   If a pgdata volume exists from a previous failed run (where password was blank),
#   it ignores POSTGRES_PASSWORD on restart → "password authentication failed" forever.
#   We always wipe so it re-initialises cleanly with the correct password.
info "Stopping any running containers..."
$DC compose down -v 2>/dev/null || true

info "Removing all pgdata volumes..."
OLD_VOLS=$($DC volume ls --format '{{.Name}}' | grep -i pgdata || true)
if [[ -n "$OLD_VOLS" ]]; then
  echo "$OLD_VOLS" | xargs $DC volume rm 2>/dev/null || true
  ok "Removed stale volumes: $OLD_VOLS"
else
  ok "No stale pgdata volumes (clean state)"
fi

# ═══════════════════════════════════════════════════════════════
step "STEP 10 — Nginx SSL directory"
# ═══════════════════════════════════════════════════════════════
mkdir -p "$SCRIPT_DIR/nginx/ssl"
chmod 700 "$SCRIPT_DIR/nginx/ssl"
ok "nginx/ssl directory ready"

# ═══════════════════════════════════════════════════════════════
step "STEP 11 — Build all Docker images (5–10 minutes)"
# ═══════════════════════════════════════════════════════════════
cd "$SCRIPT_DIR"
info "Building images in parallel..."
# Do NOT pass --env-file here — compose reads .env automatically for \${} substitution
$DC compose build --no-cache --parallel
ok "All images built successfully"

# ═══════════════════════════════════════════════════════════════
step "STEP 12 — Start all services"
# ═══════════════════════════════════════════════════════════════
$DC compose up -d
ok "All containers started"

# Show container status immediately
echo ""
$DC compose ps
echo ""

# ═══════════════════════════════════════════════════════════════
step "STEP 13 — Health checks"
# ═══════════════════════════════════════════════════════════════
info "Waiting 45 seconds for services to initialise..."
sleep 45

# PostgreSQL check
PG_STATUS=$($DC exec -T gps_postgres pg_isready -U gpsuser -d gpsdb 2>/dev/null || echo "not ready")
if echo "$PG_STATUS" | grep -q "accepting"; then
  ok "PostgreSQL: accepting connections ✔"
else
  warn "PostgreSQL not ready yet: $PG_STATUS"
  warn "Check: docker compose logs postgres --tail=20"
fi

# Redis check
REDIS_PING=$($DC exec -T gps_redis redis-cli ping 2>/dev/null || echo "FAIL")
[[ "$REDIS_PING" == "PONG" ]] && ok "Redis: PONG ✔" || warn "Redis: $REDIS_PING"

# Backend API check (poll up to 90s)
info "Polling backend /health endpoint (up to 90s)..."
BACKEND_OK=false
for i in $(seq 1 18); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    BACKEND_OK=true
    BODY=$(curl -s http://localhost:3000/health 2>/dev/null)
    ok "Backend healthy (attempt $i): $BODY"
    break
  fi
  info "  Attempt $i/18 — HTTP $CODE — waiting 5s..."
  sleep 5
done
$BACKEND_OK || warn "Backend not responding. Check: docker compose logs backend --tail=40"

# Nginx check
NGINX_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
[[ "$NGINX_CODE" != "000" ]] && ok "Nginx: responding (HTTP $NGINX_CODE)" || warn "Nginx not responding on port 80"

# Admin panel check
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
[[ "$ADMIN_CODE" != "000" ]] && ok "Admin panel: responding (HTTP $ADMIN_CODE)" || warn "Admin panel not responding"

# ═══════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════
IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || curl -s --max-time 3 icanhazip.com 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         GPS SaaS Platform is LIVE! 🎉                 ║${NC}"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Your URLs:${NC}"
echo -e "  ┌─────────────────────────────────────────────────────"
echo -e "  │  🌐  Customer Portal : http://${IP}/"
echo -e "  │  ⚙️   Admin Panel     : http://${IP}/admin"
echo -e "  │  🔌  Backend API     : http://${IP}/api"
echo -e "  │  📡  GPS TCP Server  : ${IP}:5000"
echo -e "  └─────────────────────────────────────────────────────"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "  ┌─────────────────────────────────────────────────────"
echo -e "  │  View logs    : docker compose logs -f backend"
echo -e "  │  All logs     : docker compose logs -f"
echo -e "  │  Status       : docker compose ps"
echo -e "  │  Restart all  : docker compose restart"
echo -e "  │  Stop all     : docker compose down"
echo -e "  │  Rebuild+start: docker compose up -d --build"
echo -e "  │  Reset DB     : docker compose down -v && docker compose up -d"
echo -e "  └─────────────────────────────────────────────────────"
echo ""
echo -e "  Full log: ${LOG_FILE}"
echo ""
