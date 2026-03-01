#!/usr/bin/env bash
# ============================================================
# reset-db-volume.sh
# Use this when you see:
#   "password authentication failed for user gpsuser"
#
# This happens when the pgdata Docker volume already exists
# from a previous run with a different POSTGRES_PASSWORD.
# PostgreSQL ignores POSTGRES_PASSWORD on an existing volume.
#
# WARNING: This deletes ALL database data. Back up first!
# ============================================================

set -euo pipefail

PROJECT=$(basename "$(pwd)")   # e.g. "gps-saas-platform-main"
VOLUME="${PROJECT}_pgdata"      # Docker Compose default naming

echo "=== GPS SaaS — DB Volume Reset ==="
echo ""
echo "⚠️  WARNING: This will permanently delete all PostgreSQL data."
echo "    Volume to be removed: ${VOLUME}"
echo ""
read -rp "Type YES to confirm: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "1. Stopping all containers..."
docker compose --env-file .env.production down

echo "2. Removing stale pgdata volume: ${VOLUME}"
docker volume rm "${VOLUME}" || true

echo "3. Starting fresh (PostgreSQL will re-initialise with current password)..."
docker compose --env-file .env.production up -d

echo ""
echo "✅ Done. PostgreSQL will initialise with the password in .env.production."
echo "   Check logs: docker compose logs -f backend"
