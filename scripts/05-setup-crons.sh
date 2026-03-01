#!/bin/bash
# ============================================================
# GPS SaaS — Install Cron Jobs
# Sets up backup and monitoring cron jobs
# Usage: bash 05-setup-crons.sh
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up cron jobs..."

# Add cron jobs (idempotent — removes old ones first)
crontab -l 2>/dev/null | grep -v 'gps-saas' > /tmp/existing_crons.txt || true

cat >> /tmp/existing_crons.txt <<EOF

# GPS SaaS — Daily backup at 02:00
0 2 * * * $SCRIPT_DIR/backup.sh >> ~/backups/backup.log 2>&1

# GPS SaaS — Health monitor every 5 minutes
*/5 * * * * $SCRIPT_DIR/monitor.sh >> /tmp/gps-health.log 2>&1

# GPS SaaS — Docker cleanup weekly (Sunday 03:00)
0 3 * * 0 docker system prune -f >> /tmp/gps-docker-cleanup.log 2>&1
EOF

crontab /tmp/existing_crons.txt
rm /tmp/existing_crons.txt

echo "[✔] Cron jobs installed:"
crontab -l | grep 'gps-saas'
echo ""
echo "Done!"
