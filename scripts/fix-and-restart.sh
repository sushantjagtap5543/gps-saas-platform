#!/bin/bash
# ══════════════════════════════════════════════════
#  GPS SaaS — Fix & Restart Script
#  Run this on your Lightsail server:
#  chmod +x scripts/fix-and-restart.sh && ./scripts/fix-and-restart.sh
# ══════════════════════════════════════════════════
set -e

echo ""
echo "════════════════════════════════════════"
echo "  GPS SaaS — Applying fixes & restarting"
echo "════════════════════════════════════════"
echo ""

# Step 1: Stop everything cleanly
echo "→ Stopping all containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Step 2: Remove old unhealthy images so they rebuild fresh
echo "→ Removing old backend image..."
docker rmi $(docker images | grep 'backend' | awk '{print $3}') 2>/dev/null || true

# Step 3: Check .env has been edited
if grep -q "CHANGE_ME" .env.production 2>/dev/null || grep -q "CHANGE_ME" .env 2>/dev/null; then
  echo ""
  echo "⚠️  WARNING: Your .env file still has placeholder values!"
  echo "   Edit it now: nano .env.production"
  echo "   Then re-run this script."
  echo ""
fi

# Step 4: Build backend fresh (no cache)
echo "→ Rebuilding backend (fresh)..."
docker compose build --no-cache backend

# Step 5: Build other services
echo "→ Building other services..."
docker compose build --no-cache frontend gps-admin tcp-server notifications

# Step 6: Start DB and Redis first, wait for them
echo "→ Starting database and Redis..."
docker compose up -d postgres redis

echo "→ Waiting for PostgreSQL to be ready (up to 60s)..."
for i in $(seq 1 12); do
  if docker compose exec -T postgres pg_isready -U gpsuser -d gpsdb >/dev/null 2>&1; then
    echo "   ✅ PostgreSQL is ready"
    break
  fi
  echo "   Waiting... ($i/12)"
  sleep 5
done

echo "→ Waiting for Redis..."
sleep 3
docker compose exec -T redis redis-cli ping >/dev/null && echo "   ✅ Redis is ready"

# Step 7: Start everything
echo "→ Starting all services..."
docker compose up -d

# Step 8: Watch backend logs for 30 seconds
echo ""
echo "→ Backend startup logs (30s):"
echo "────────────────────────────"
timeout 30 docker compose logs -f backend 2>/dev/null || true
echo "────────────────────────────"

# Step 9: Status check
echo ""
echo "→ Container status:"
docker compose ps

# Step 10: Health check
echo ""
echo "→ Testing health endpoint..."
sleep 5
if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
  echo "   ✅ Backend is HEALTHY at http://localhost:3000/health"
  curl -s http://localhost:3000/health
else
  echo "   ⚠️  Health check not responding yet — check logs:"
  echo "   docker compose logs backend --tail=50"
fi

echo ""
echo "════════════════════════════════════════"
echo "  Done! Useful commands:"
echo "  docker compose ps                    — check status"
echo "  docker compose logs backend -f       — watch logs"
echo "  docker compose logs nginx -f         — nginx logs"
echo "  curl http://localhost:3000/health    — health check"
echo "════════════════════════════════════════"
