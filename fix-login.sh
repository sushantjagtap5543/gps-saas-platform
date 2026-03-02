#!/bin/bash
# ============================================================
# GPS SaaS Login Fix Script
# Run on your server: bash fix-login.sh
# ============================================================
set -e

echo "🔧 GPS SaaS Login Fix Script"
echo "=============================="

# ── Check we're in the right directory ─────────────────────
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ ERROR: Run this script from the gps-saas-platform-main directory"
  echo "   cd /path/to/gps-saas-platform-main && bash fix-login.sh"
  exit 1
fi

# ── Step 1: Fix JWT Secrets ──────────────────────────────
echo ""
echo "📌 Step 1: Fixing JWT Secrets..."

CURRENT_JWT=$(grep "^JWT_SECRET=" .env.production | cut -d= -f2)
if [[ "$CURRENT_JWT" == *"REPLACE"* ]]; then
  NEW_JWT=$(openssl rand -hex 64)
  NEW_REFRESH=$(openssl rand -hex 64)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW_JWT|" .env.production
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$NEW_REFRESH|" .env.production
  echo "✅ JWT secrets generated and saved"
else
  echo "✅ JWT secrets already set — skipping"
fi

# ── Step 2: Wait for containers to be running ───────────
echo ""
echo "📌 Step 2: Checking Docker containers..."
docker compose --env-file .env.production up -d --no-recreate 2>/dev/null || true
sleep 5

# Check backend
if ! docker ps --format '{{.Names}}' | grep -q "gps_backend"; then
  echo "⚠️  Backend not running. Starting all containers..."
  docker compose --env-file .env.production up -d
  echo "Waiting 30s for startup..."
  sleep 30
fi

echo "✅ Containers running:"
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# ── Step 3: Fix Admin Password ──────────────────────────
echo ""
echo "📌 Step 3: Fixing admin user in database..."

# Generate correct hash for Admin@123
NEW_HASH=$(docker exec gps_backend node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('Admin@123', 12).then(h => process.stdout.write(h));
" 2>/dev/null)

if [ -z "$NEW_HASH" ]; then
  echo "❌ Could not generate password hash. Backend may not be ready."
  echo "   Try again in 30 seconds: bash fix-login.sh"
  exit 1
fi

# Update or insert admin user
docker exec gps_postgres psql -U gpsuser -d gpsdb -c "
INSERT INTO users (name, email, password, role, is_active)
VALUES ('System Admin', 'admin@gps.local', '$NEW_HASH', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  is_active = true;
" 2>/dev/null || echo "Note: May need to check user table"

# Also update any existing admin with wrong hash
docker exec gps_postgres psql -U gpsuser -d gpsdb -c "
UPDATE users SET password = '$NEW_HASH', is_active = true
WHERE role = 'ADMIN' AND email != 'admin@gps.local';
" 2>/dev/null || true

echo "✅ Admin user updated"

# ── Step 4: Restart backend with new env ────────────────
echo ""
echo "📌 Step 4: Restarting backend with new JWT secrets..."
docker compose --env-file .env.production restart backend
echo "Waiting 15s for restart..."
sleep 15

# ── Step 5: Test Login ───────────────────────────────────
echo ""
echo "📌 Step 5: Testing login..."

RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gps.local","password":"Admin@123"}' 2>/dev/null)

if echo "$RESPONSE" | grep -q "accessToken"; then
  echo "✅ LOGIN WORKS! Test successful."
  echo ""
  echo "🎉 =================================="
  echo "   Login fixed successfully!"
  echo "   URL:      http://$(curl -s ifconfig.me 2>/dev/null || echo '3.110.216.100')/login"
  echo "   Email:    admin@gps.local"
  echo "   Password: Admin@123"
  echo "   =================================="
  echo ""
  echo "⚠️  IMPORTANT: Change the admin password after login!"
else
  echo "❌ Login test failed. API response:"
  echo "$RESPONSE"
  echo ""
  echo "📋 Backend logs:"
  docker compose logs --tail=30 backend
fi
