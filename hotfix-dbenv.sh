#!/bin/bash
# GPS SaaS — hotfix: fix DB env variable names in .env.production
# The backend uses DB_HOST/DB_USER/DB_NAME/DB_PASSWORD
# but setup.sh was writing POSTGRES_HOST/POSTGRES_USER etc.
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

[ -f .env.production ] || fail "Run from ~/gps-saas-platform (.env.production not found)"

warn "Reading current DB values from .env.production..."

# Extract current POSTGRES_* values
DB_NAME=$(grep "^POSTGRES_DB="     .env.production | cut -d= -f2)
DB_USER=$(grep "^POSTGRES_USER="   .env.production | cut -d= -f2)
DB_PASS=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d= -f2)
DB_HOST=$(grep "^POSTGRES_HOST="   .env.production | cut -d= -f2)
DB_PORT=$(grep "^POSTGRES_PORT="   .env.production | cut -d= -f2)

[ -z "$DB_NAME" ] && fail "POSTGRES_DB not found in .env.production"
[ -z "$DB_USER" ] && fail "POSTGRES_USER not found in .env.production"
[ -z "$DB_PASS" ] && fail "POSTGRES_PASSWORD not found in .env.production"

ok "Found: DB=$DB_NAME USER=$DB_USER HOST=${DB_HOST:-postgres}"

warn "Adding DB_* aliases to .env.production..."

# Add DB_* aliases if not already present
grep -q "^DB_NAME=" .env.production || echo "DB_NAME=${DB_NAME}"         >> .env.production
grep -q "^DB_USER=" .env.production || echo "DB_USER=${DB_USER}"         >> .env.production
grep -q "^DB_PASSWORD=" .env.production || echo "DB_PASSWORD=${DB_PASS}" >> .env.production
grep -q "^DB_HOST=" .env.production || echo "DB_HOST=${DB_HOST:-postgres}" >> .env.production
grep -q "^DB_PORT=" .env.production || echo "DB_PORT=${DB_PORT:-5432}"   >> .env.production

ok ".env.production updated with DB_* aliases"

# Also ensure DATABASE_URL uses gpsuser not postgres
if grep -q "^DATABASE_URL=.*postgres:5432" .env.production; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME}|" .env.production
    ok "DATABASE_URL fixed"
fi

if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

# No rebuild needed — just restart the backend with the new env
warn "Restarting backend (no rebuild needed)..."
$DC up -d --no-deps --force-recreate backend

warn "Waiting for backend to connect to DB..."
for i in $(seq 1 30); do
    sleep 3
    if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
        ok "Backend is healthy!"
        echo ""
        $DC ps
        exit 0
    fi
    printf "."
done
echo ""
warn "Backend not yet healthy — showing logs:"
$DC logs --tail=20 backend
