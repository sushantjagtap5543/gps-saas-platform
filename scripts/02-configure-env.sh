#!/bin/bash
# ============================================================
# GPS SaaS — Step 2: Configure Environment
# Generates secure secrets and creates .env.production
# Usage: bash 02-configure-env.sh
# ============================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$APP_DIR/.env.production"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   GPS SaaS — Environment Configuration          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Collect user inputs ───────────────────────────────────────
read -rp "$(echo -e "${CYAN}Your domain or IP (e.g. gps.mycompany.com):${NC} ")" DOMAIN
DOMAIN="${DOMAIN:-$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')}"

read -rp "$(echo -e "${CYAN}Razorpay Key ID (rzp_live_... or rzp_test_...):${NC} ")" RZP_KEY
read -rp "$(echo -e "${CYAN}Razorpay Key Secret:${NC} ")" RZP_SECRET
read -rp "$(echo -e "${CYAN}Razorpay Webhook Secret:${NC} ")" RZP_WEBHOOK

read -rp "$(echo -e "${CYAN}Admin email for first login [admin@gps.com]:${NC} ")" ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@gps.com}"

# ── Generate secrets ──────────────────────────────────────────
info "Generating cryptographic secrets..."
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH=$(openssl rand -hex 64)
DB_PASS="GPS_$(openssl rand -base64 18 | tr -d '=/+' | head -c 24)_DB!"
GRAFANA_PASS="Graf_$(openssl rand -base64 12 | tr -d '=/+' | head -c 16)!"
log "Secrets generated"

# ── Backup existing env if present ───────────────────────────
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  warn "Existing .env.production backed up"
fi

# ── Write .env.production ─────────────────────────────────────
info "Writing .env.production..."
cat > "$ENV_FILE" <<EOF
# ================================================================
# GPS SaaS — Production Environment
# Generated: $(date)
# Instance:  AWS Lightsail 2GB
# ================================================================

NODE_ENV=production

# ── PostgreSQL ──────────────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=gpsdb
POSTGRES_USER=gpsuser
POSTGRES_PASSWORD=${DB_PASS}

DATABASE_URL=postgresql://gpsuser:${DB_PASS}@postgres:5432/gpsdb

# ── Redis ────────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379

# ── JWT Secrets (auto-generated — DO NOT SHARE) ─────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Ports ────────────────────────────────────────────────────────
API_PORT=3000
TCP_PORT=5000

# ── CORS ─────────────────────────────────────────────────────────
CORS_ORIGIN=https://${DOMAIN}

# ── Razorpay ─────────────────────────────────────────────────────
RAZORPAY_KEY=${RZP_KEY}
RAZORPAY_SECRET=${RZP_SECRET}
RAZORPAY_WEBHOOK_SECRET=${RZP_WEBHOOK}

# ── Firebase (optional — leave empty to disable push notifications)
FIREBASE_SERVICE_ACCOUNT=

# ── Speed alert threshold ────────────────────────────────────────
OVERSPEED_LIMIT=100

# ── Monitoring ───────────────────────────────────────────────────
GRAFANA_PASSWORD=${GRAFANA_PASS}

# ── Domain ───────────────────────────────────────────────────────
DOMAIN=${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
EOF

chmod 600 "$ENV_FILE"
log ".env.production created (mode 600)"

# ── Update admin email in schema ──────────────────────────────
SCHEMA="$APP_DIR/database/schema.sql"
if [ -f "$SCHEMA" ]; then
  sed -i "s|admin@yourdomain.com|${ADMIN_EMAIL}|g" "$SCHEMA"
  log "Admin email updated in schema: ${ADMIN_EMAIL}"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           STEP 2 COMPLETE ✅                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Credentials saved to: $ENV_FILE"
echo ""
warn "Save these somewhere safe:"
echo "  DB Password:     ${DB_PASS}"
echo "  Grafana Pass:    ${GRAFANA_PASS}"
echo "  Admin Email:     ${ADMIN_EMAIL}"
echo "  Admin Password:  Admin@123  (CHANGE after first login!)"
echo ""
echo "Next step:"
echo "  bash $SCRIPT_DIR/03-launch.sh"
echo ""
