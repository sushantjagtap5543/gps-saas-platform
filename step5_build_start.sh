#!/bin/bash
# STEP 5: Build Docker images and start all services
cd /home/ubuntu/gps-saas-platform

# Detect compose command
if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    DC="docker compose"
fi

echo "[→] Building Docker images (no-cache)..."
echo "    This takes 5-10 minutes on first run..."
echo ""

$DC --env-file .env.production build --no-cache
echo ""
echo "[✔] Build complete"

echo "[→] Starting all services..."
$DC --env-file .env.production up -d
echo "[✔] Services started"

echo ""
echo "[→] Waiting for PostgreSQL to be ready..."
MAX=60
N=0
until $DC exec -T postgres pg_isready -U gpsuser -d gpsdb >/dev/null 2>&1; do
    N=$((N+1))
    if [ $N -ge $MAX ]; then
        echo "[✘] PostgreSQL failed to start. Check logs:"
        $DC logs --tail=30 postgres
        exit 1
    fi
    printf "."
    sleep 3
done
echo ""
echo "[✔] PostgreSQL ready"

echo "[→] Waiting for Backend API to be ready..."
MAX=40
N=0
until curl -sf http://localhost:3000/health >/dev/null 2>&1; do
    N=$((N+1))
    if [ $N -ge $MAX ]; then
        echo "[!] Backend timed out. Showing logs:"
        $DC logs --tail=40 backend
        break
    fi
    printf "."
    sleep 4
done
echo ""

if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    echo "[✔] Backend API is healthy"
else
    echo "[!] Backend still starting — check: $DC logs backend"
fi

echo ""
echo "[→] Current service status:"
$DC ps
