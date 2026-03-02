#!/bin/bash
# GPS SaaS — hotfix: GpsHistory missing primaryKey
# Run this from ~/gps-saas-platform on your Lightsail server

set -e

FILE="backend/src/models/index.js"

echo "[→] Patching $FILE ..."

# Fix the missing primaryKey on GpsHistory.id
sed -i 's/id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },/id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },/' "$FILE"

# Verify the fix was applied
if grep -q "primaryKey: true, defaultValue: DataTypes.UUIDV4" "$FILE"; then
  echo "[✔] Patch applied successfully"
else
  echo "[✘] Patch failed — please apply manually:"
  echo "    Line to fix in $FILE:"
  echo "    BEFORE:  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },"
  echo "    AFTER:   id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },"
  exit 1
fi

echo "[→] Rebuilding backend only (faster than full rebuild)..."
docker compose build --no-cache backend

echo "[→] Restarting all containers..."
docker compose down
docker compose up -d

echo "[→] Waiting for backend to be healthy..."
for i in $(seq 1 30); do
  sleep 3
  STATUS=$(docker inspect --format='{{.State.Status}}' gps_backend 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "running" ]; then
    echo "[✔] Backend is running!"
    break
  fi
  echo "    ... waiting ($i/30) — status: $STATUS"
done

echo ""
echo "[→] Current container status:"
docker compose ps

echo ""
echo "[→] Backend logs (last 20 lines):"
docker compose logs --tail=20 backend
