#!/bin/bash
# Daily DB backup — add to crontab: 0 2 * * * ~/gps-saas-platform/scripts/backup.sh
set -e

# Detect compose command
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "[$(date)] Starting backup..."
$DC exec -T postgres pg_dump -U gpsuser gpsdb | gzip > $BACKUP_DIR/gpsdb_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "[$(date)] Backup done: $BACKUP_DIR/gpsdb_$DATE.sql.gz"
ls -lh $BACKUP_DIR/
