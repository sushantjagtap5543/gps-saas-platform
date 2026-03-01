#!/bin/bash
# Run this on your server to see EXACTLY why the backend is unhealthy
echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Backend Last 100 Lines ==="
docker compose logs backend --tail=100

echo ""
echo "=== PostgreSQL Status ==="
docker compose exec postgres pg_isready -U gpsuser -d gpsdb 2>&1 || echo "POSTGRES NOT READY"

echo ""
echo "=== Redis Status ==="
docker compose exec redis redis-cli ping 2>&1 || echo "REDIS NOT READY"

echo ""
echo "=== Health Endpoint ==="
curl -s http://localhost:3000/health 2>&1 || echo "BACKEND NOT RESPONDING"

echo ""
echo "=== Env Check (no secret values) ==="
echo "POSTGRES_DB=$(grep POSTGRES_DB .env.production | head -1)"
echo "POSTGRES_USER=$(grep POSTGRES_USER .env.production | head -1)"
echo "POSTGRES_HOST=$(grep POSTGRES_HOST .env.production | head -1)"
echo "REDIS_HOST=$(grep REDIS_HOST .env.production | head -1)"
echo "JWT_SECRET set: $(grep -q 'CHANGE_ME' .env.production && echo 'NO - still placeholder!' || echo 'YES')"
