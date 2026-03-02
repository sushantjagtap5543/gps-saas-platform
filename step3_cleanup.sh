#!/bin/bash
# STEP 3: Stop all containers and clean Docker
cd /home/ubuntu/gps-saas-platform

echo "[→] Stopping all containers..."
docker compose down --remove-orphans --volumes 2>/dev/null || docker-compose down --remove-orphans --volumes 2>/dev/null || echo "[!] Nothing was running"

echo "[→] Removing stale containers..."
for c in gps_postgres gps_redis gps_backend gps_tcp_server gps_notifications gps_frontend gps_admin gps_nginx; do
    docker rm -f "$c" 2>/dev/null && echo "[!] Removed: $c" || true
done

echo "[→] Removing old images..."
docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE "gps|saas" | xargs -r docker rmi -f 2>/dev/null || true

echo "[→] Pruning dangling images and build cache..."
docker image prune -f
docker builder prune -f
echo "[✔] Docker cleanup complete"
