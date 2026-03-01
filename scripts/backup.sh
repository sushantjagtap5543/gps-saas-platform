#!/bin/bash
# ============================================================
# GPS SaaS — Backup Script
# Backs up PostgreSQL DB + environment file
# Usage: bash backup.sh
# Cron:  0 2 * * * /home/ubuntu/gps-saas-platform/scripts/backup.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE="docker compose -f $APP_DIR/docker-compose.2gb.yml"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# ── PostgreSQL dump ────────────────────────────────────────────
DUMP_FILE="$BACKUP_DIR/gpsdb_${DATE}.sql.gz"
$COMPOSE exec -T postgres \
  pg_dump -U gpsuser gpsdb | gzip > "$DUMP_FILE"
echo "[✔] Database: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

# ── Env file backup ────────────────────────────────────────────
ENV_BACKUP="$BACKUP_DIR/env_${DATE}.backup"
cp "$APP_DIR/.env.production" "$ENV_BACKUP"
chmod 600 "$ENV_BACKUP"
echo "[✔] Env: $ENV_BACKUP"

# ── Keep only last 7 backups ───────────────────────────────────
ls -t "$BACKUP_DIR"/gpsdb_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f || true
ls -t "$BACKUP_DIR"/env_*.backup   2>/dev/null | tail -n +8 | xargs rm -f || true
echo "[✔] Old backups pruned (keeping 7)"

echo "[$(date)] Backup complete. Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
