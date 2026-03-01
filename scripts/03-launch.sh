#!/bin/bash
# ============================================================
# GPS SaaS — Step 3: Launch All Services
# Usage: bash 03-launch.sh
# ============================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
die()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   GPS SaaS — Launching Services (2GB Mode)      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Pre-flight checks ─────────────────────────────────────────
[ ! -f ".env.production" ] && die ".env.production not found. Run 02-configure-env.sh first!"

if ! groups | grep -q docker; then
  die "User not in docker group. Log out and back in first!"
fi

info "System memory: $(free -h | grep Mem | awk '{print $2}') RAM + $(free -h | grep Swap | awk '{print $2}') swap"

# ── Stop any existing containers ──────────────────────────────
info "Stopping any running containers..."
docker compose -f docker-compose.2gb.yml down --remove-orphans 2>/dev/null || true
log "Clean slate"

# ── Pull / Build images ───────────────────────────────────────
info "Building Docker images (this takes 3-5 minutes on first run)..."
docker compose -f docker-compose.2gb.yml build --no-cache 2>&1 | grep -E "Step|Successfully|error|ERROR" || true
log "Images built"

# ── Start infrastructure first ────────────────────────────────
info "Starting PostgreSQL and Redis..."
docker compose -f docker-compose.2gb.yml up -d postgres redis
info "Waiting for PostgreSQL to be ready..."

RETRIES=30
until docker compose -f docker-compose.2gb.yml exec -T postgres \
  pg_isready -U gpsuser -d gpsdb > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  [ $RETRIES -eq 0 ] && die "PostgreSQL failed to start after 150 seconds!"
  echo -n "."
  sleep 5
done
echo ""
log "PostgreSQL ready"

# ── Initialize database ───────────────────────────────────────
info "Initializing database schema..."
docker compose -f docker-compose.2gb.yml exec -T postgres \
  psql -U gpsuser -d gpsdb \
  -c "SELECT 1" > /dev/null 2>&1 && \
  docker compose -f docker-compose.2gb.yml exec -T postgres \
  psql -U gpsuser -d gpsdb \
  -f /docker-entrypoint-initdb.d/01-schema.sql > /dev/null 2>&1 || \
  warn "Schema may already exist (safe to ignore)"
log "Database initialized"

# ── Start all services ────────────────────────────────────────
info "Starting all services..."
docker compose -f docker-compose.2gb.yml up -d
log "All containers started"

# ── Wait and verify ───────────────────────────────────────────
info "Waiting for backend to be healthy (up to 2 minutes)..."
RETRIES=24
until curl -sf http://localhost:3000/health | grep -q '"status"' 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  [ $RETRIES -eq 0 ] && {
    warn "Backend health check timeout — checking logs..."
    docker compose -f docker-compose.2gb.yml logs --tail=30 backend
    die "Backend failed to start!"
  }
  echo -n "."
  sleep 5
done
echo ""
log "Backend healthy"

# ── Final status ──────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           ALL SERVICES RUNNING ✅               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

docker compose -f docker-compose.2gb.yml ps
echo ""

HEALTH=$(curl -s http://localhost:3000/health)
echo "Backend Health: $HEALTH"
echo ""

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Customer Portal:  http://${SERVER_IP}"
echo "  Admin Panel:      http://${SERVER_IP}/admin/"
echo "  GPS TCP Port:     ${SERVER_IP}:5000"
echo "  API Health:       http://${SERVER_IP}/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Default admin: admin@gps.com / Admin@123"
warn "CHANGE THE ADMIN PASSWORD IMMEDIATELY!"
echo ""
echo "For SSL setup run:"
echo "  bash scripts/04-ssl-setup.sh"
echo ""
