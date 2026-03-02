#!/bin/bash
# GPS SaaS — hotfix: fix remaining broken auth middleware imports
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

[ -f backend/src/middleware/auth.middleware.js ] || fail "Run from ~/gps-saas-platform"

# Fix geofence.routes.js
sed -i 's|const auth = require("../../middleware/auth.middleware");|const { authenticate: auth } = require("../../middleware/auth.middleware");|' \
    backend/src/modules/geofence/geofence.routes.js
ok "geofence.routes.js fixed"

# Fix branding.routes.js
sed -i 's|const auth   = require("../../middleware/auth.middleware");|const { authenticate: auth } = require("../../middleware/auth.middleware");|' \
    backend/src/modules/branding/branding.routes.js
ok "branding.routes.js fixed"

# Verify no more broken imports
REMAINING=$(grep -rn "const auth\s*=\s*require.*auth.middleware" backend/src/ --include="*.js" | grep -v "authenticate" || true)
if [ -n "$REMAINING" ]; then
    warn "Still broken imports found:"
    echo "$REMAINING"
else
    ok "All auth middleware imports are correct"
fi

# Rebuild and restart backend only
if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

warn "Rebuilding backend (~40 seconds)..."
$DC build --no-cache backend
$DC up -d --no-deps backend

warn "Waiting for backend..."
for i in $(seq 1 25); do
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
warn "Backend not yet healthy — logs:"
$DC logs --tail=30 backend
