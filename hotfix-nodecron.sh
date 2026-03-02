#!/bin/bash
# GPS SaaS — hotfix: add node-cron to backend package.json then rebuild
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

[ -f backend/package.json ] || { echo "Run from ~/gps-saas-platform"; exit 1; }

warn "Adding node-cron to backend/package.json..."

# Add node-cron if not already present
if ! grep -q "node-cron" backend/package.json; then
    sed -i 's/"pdfkit":/"node-cron":              "^3.0.3",\n    "pdfkit":/' backend/package.json
    ok "node-cron added"
else
    ok "node-cron already present"
fi

if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

warn "Rebuilding backend container (~60 seconds)..."
$DC build --no-cache backend
$DC up -d --no-deps backend

warn "Waiting for backend to start..."
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
$DC logs --tail=30 backend
