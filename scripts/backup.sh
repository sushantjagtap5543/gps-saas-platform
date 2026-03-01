#!/bin/bash
# Daily database backup — add to crontab: 0 2 * * * /path/to/backup.sh
set -e
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker compose exec -T postgres pg_dump -U gpsuser gpsdb | gzip > $BACKUP_DIR/gpsdb_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: gpsdb_$DATE.sql.gz"
