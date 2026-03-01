#!/bin/bash
# GPS SaaS — Fix & Restart Script (compatible with Docker v1 & v2)
set -e

# Detect compose command
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "Installing docker-compose plugin..."
  sudo apt-get install -y docker-compose-plugin
  DC="docker compose"
fi

echo "Using compose: $DC"
echo ""
echo "================================================"
echo "  GPS SaaS — Fix & Restart"
echo "================================================"

# Stop everything
echo "→ Stopping all containers..."
$DC down --remove-orphans 2>/dev/null || true

# Check env file
ENVFILE=".env.production"
[ -f ".env" ] && ENVFILE=".env"

echo "→ Using env file: $ENVFILE"

# Check for placeholder JWT secret
if grep -q "5e884898\|CHANGE_ME" $ENVFILE 2>/dev/null; then
  echo ""
  echo "⚠️  JWT_SECRET is still the default placeholder value!"
  echo "   Generating new JWT secrets automatically..."
  echo ""
  # Generate new secrets using openssl (always available)
  JWT=$(openssl rand -hex 64)
  REFRESH=$(openssl rand -hex 64)
  # Replace in env file
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" $ENVFILE
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$REFRESH|" $ENVFILE
  echo "✅  JWT secrets regenerated"
fi

# Build fresh
echo "→ Building backend (no cache)..."
$DC build --no-cache backend

echo "→ Building other services..."
$DC build frontend gps-admin tcp-server notifications 2>/dev/null || true

# Start DB and Redis first
echo "→ Starting postgres and redis..."
$DC up -d postgres redis

# Wait for postgres
echo "→ Waiting for PostgreSQL..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if $DC exec -T postgres pg_isready -U gpsuser -d gpsdb >/dev/null 2>&1; then
    echo "   ✅ PostgreSQL ready"
    break
  fi
  echo "   Waiting ($i/12)..."
  sleep 5
done

# Wait for redis
sleep 3
$DC exec -T redis redis-cli ping >/dev/null 2>&1 && echo "   ✅ Redis ready" || echo "   ⚠️  Redis not responding"

# Start all
echo "→ Starting all services..."
$DC up -d

# Watch logs 30s
echo ""
echo "→ Backend startup logs (30s):"
echo "----------------------------------------"
timeout 30 $DC logs -f backend 2>/dev/null || true
echo "----------------------------------------"

echo ""
echo "→ Container status:"
$DC ps

echo ""
echo "→ Testing health..."
sleep 5
if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
  echo "✅ Backend HEALTHY"
  curl -s http://localhost:3000/health
elif wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
  echo "✅ Backend HEALTHY"
  wget -qO- http://localhost:3000/health
else
  echo "⚠️  Not responding yet — check: $DC logs backend"
fi

echo ""
echo "================================================"
echo "  Commands:"
echo "  $DC ps                    → status"
echo "  $DC logs backend -f       → watch logs"
echo "  curl http://localhost:3000/health → health"
echo "================================================"
