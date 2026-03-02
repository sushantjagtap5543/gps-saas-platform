#!/bin/bash
# GPS SaaS — hotfix: rbac middleware import fix in branding.routes.js
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

[ -f backend/src/modules/branding/branding.routes.js ] || fail "Run from ~/gps-saas-platform"

# Fix: rbac.middleware exports { authorize } but branding.routes imported whole module
sed -i 's|const rbac   = require("../../middleware/rbac.middleware");|const { authorize: rbac } = require("../../middleware/rbac.middleware");|' \
    backend/src/modules/branding/branding.routes.js
ok "branding.routes.js rbac import fixed"

# Rebuild and restart backend only
if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

warn "Rebuilding backend (~40 seconds)..."
$DC build --no-cache backend
$DC up -d --no-deps backend

warn "Waiting for backend to be healthy..."
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
warn "Backend not yet healthy — showing logs:"
$DC logs --tail=30 backend
