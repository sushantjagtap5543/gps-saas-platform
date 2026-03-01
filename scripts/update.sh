#!/bin/bash
# ============================================================
# GPS SaaS — Update Script
# Pulls latest code and does a zero-downtime rolling update
# Usage: bash update.sh
# ============================================================
set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $APP_DIR/docker-compose.2gb.yml"
cd "$APP_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   GPS SaaS — Rolling Update                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Backup before update ──────────────────────────────────────
info "Taking backup before update..."
bash "$SCRIPT_DIR/backup.sh"
log "Backup done"

# ── Pull latest code ──────────────────────────────────────────
info "Pulling latest code..."
git pull origin main
log "Code updated"

# ── Rebuild changed images only ───────────────────────────────
info "Rebuilding images..."
$COMPOSE build
log "Images rebuilt"

# ── Rolling restart (keeps DB and Redis running) ──────────────
info "Restarting application services..."
$COMPOSE up -d --no-deps tcp-server
$COMPOSE up -d --no-deps notifications
$COMPOSE up -d --no-deps frontend gps-admin
$COMPOSE up -d --no-deps backend
sleep 10
$COMPOSE up -d --no-deps nginx
log "Services restarted"

# ── Cleanup ───────────────────────────────────────────────────
info "Pruning old images..."
docker image prune -f > /dev/null
log "Cleanup done"

# ── Health check ──────────────────────────────────────────────
sleep 15
if curl -sf http://localhost:3000/health | grep -q '"status"'; then
  log "Health check passed ✅"
else
  warn "Health check failed — check logs:"
  echo "  $COMPOSE logs --tail=50 backend"
fi

echo ""
log "Update complete!"
