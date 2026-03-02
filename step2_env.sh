#!/bin/bash
# STEP 2: Remove old .env files and write fresh .env.production
cd /home/ubuntu/gps-saas-platform

echo "[→] Removing old .env files..."
rm -f .env .env.production .env.local .env.development .env.staging
rm -f .env.test .env.backup .env.bak .env.old .env.example .env.sample
rm -f .env.template .env.prod .env.copy
echo "[✔] Old .env files removed"

echo "[→] Generating secrets..."
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 12)
SESSION_SECRET=$(openssl rand -hex 24)
echo "[✔] Secrets generated"

echo "[→] Writing .env.production..."
cat > .env.production << ENVEOF
# GPS SaaS Platform — Auto-generated $(date)
# DO NOT EDIT — re-run setup to regenerate

NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=gpsdb
POSTGRES_USER=gpsuser
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://gpsuser:${DB_PASSWORD}@postgres:5432/gpsdb

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
REFRESH_EXPIRES_IN=30d

SESSION_SECRET=${SESSION_SECRET}

TCP_PORT=5000
CORS_ORIGIN=*

ADMIN_EMAIL=admin@gps.local
ADMIN_PASSWORD=Admin@123!

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gpstracker.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
ENVEOF

ln -sf .env.production .env
echo "[✔] .env.production written"
echo "[✔] .env -> .env.production symlinked"

# Protect from git
grep -qxF ".env" .gitignore 2>/dev/null || echo ".env" >> .gitignore
grep -qxF ".env.*" .gitignore 2>/dev/null || echo ".env.*" >> .gitignore
grep -qxF "DEPLOYMENT_INFO.txt" .gitignore 2>/dev/null || echo "DEPLOYMENT_INFO.txt" >> .gitignore
echo "[✔] .gitignore updated"

# Save passwords immediately
cat > DEPLOYMENT_INFO.txt << INFOEOF
GPS SaaS — Deployment Info — $(date)

DB_PASSWORD        = ${DB_PASSWORD}
REDIS_PASSWORD     = ${REDIS_PASSWORD}
JWT_SECRET         = ${JWT_SECRET}
JWT_REFRESH_SECRET = ${JWT_REFRESH_SECRET}

Login: admin@gps.local / Admin@123!
INFOEOF
echo "[✔] Passwords saved to DEPLOYMENT_INFO.txt"
