#!/bin/bash
# GPS SaaS Diagnostic — works with any Docker/compose version

echo "=== Docker Info ==="
docker --version
docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "compose not found"

# Detect compose command
DC=""
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
fi

if [ -z "$DC" ]; then
  echo ""
  echo "❌ docker-compose not installed. Run:"
  echo "   sudo bash scripts/INSTALL-DOCKER-AND-FIX.sh"
  exit 1
fi

echo "Using: $DC"
echo ""

echo "=== Container Status ==="
$DC ps

echo ""
echo "=== Backend Last 100 Lines ==="
$DC logs backend 2>&1 | tail -100

echo ""
echo "=== PostgreSQL Status ==="
$DC exec -T postgres pg_isready -U gpsuser -d gpsdb 2>&1 || echo "POSTGRES NOT READY"

echo ""
echo "=== Redis Status ==="
$DC exec -T redis redis-cli ping 2>&1 || echo "REDIS NOT READY"

echo ""
echo "=== Health Endpoint ==="
curl -s http://localhost:3000/health 2>/dev/null || wget -qO- http://localhost:3000/health 2>/dev/null || echo "BACKEND NOT RESPONDING"

echo ""
echo "=== Env File Check ==="
ENVFILE=".env.production"
[ -f ".env" ] && ENVFILE=".env"
echo "File: $ENVFILE"
grep "^POSTGRES_DB\|^POSTGRES_USER\|^POSTGRES_HOST\|^REDIS_HOST" "$ENVFILE" 2>/dev/null
if grep -q "PLACEHOLDER\|REPLACE_WITH\|CHANGE_ME\|5e884898" "$ENVFILE" 2>/dev/null; then
  echo "JWT_SECRET: ❌ STILL PLACEHOLDER — run: sudo bash scripts/INSTALL-DOCKER-AND-FIX.sh"
else
  echo "JWT_SECRET: ✅ Custom value set"
fi
