#!/bin/bash
# ================================================================
# GPS SaaS Platform v3 — Automated Setup Script
# ================================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     GPS SaaS Platform v3 — Setup Script              ║"
echo "║     Includes: Device Tester, Live Map, All Features  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Prerequisites ────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker first."
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || error "Docker Compose not found."
ok "Docker found"

# ── Generate secrets ────────────────────────────────────────
info "Generating secrets..."
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/+=')
REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d '\n/+=')

# Create .env if not exists
if [ ! -f .env ]; then
cat > .env << ENVEOF
NODE_ENV=production
PORT=5024
DB_HOST=postgres
DB_PORT=5432
DB_NAME=gps_saas
DB_USER=gps_admin
DB_PASSWORD=${DB_PASSWORD}
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
CORS_ORIGIN=*
TCP_PORT=5023
BCRYPT_ROUNDS=12
ENVEOF
ok ".env created with secure secrets"
else
  warn ".env already exists, keeping current values"
fi

# ── Build & start ───────────────────────────────────────────
info "Starting Docker services..."
if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker compose"
fi

$DC down --remove-orphans 2>/dev/null || true
$DC up -d --build

# ── Wait for PostgreSQL ─────────────────────────────────────
info "Waiting for PostgreSQL..."
for i in $(seq 1 40); do
  if $DC exec -T postgres pg_isready -U gps_admin -d gps_saas >/dev/null 2>&1; then
    ok "PostgreSQL ready"
    break
  fi
  if [ $i -eq 40 ]; then error "PostgreSQL failed to start"; fi
  sleep 2
done

# ── Run migrations ──────────────────────────────────────────
info "Running database migrations..."
sleep 5
$DC exec -T backend node -e "
const db = require('./src/models');
db.connectDB().then(() => {
  console.log('DB connected');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null && ok "Database synced" || warn "DB sync warning (may already exist)"

# ── Set admin password ─────────────────────────────────────
info "Setting admin password..."
$DC exec -T backend node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://gps_admin:${DB_PASSWORD}@postgres:5432/gps_saas' });
async function run() {
  const hash = await bcrypt.hash('Admin@123!', 12);
  await pool.query(\"UPDATE users SET password = \$1 WHERE email IN ('admin@gps.local','superadmin@gps.local')\", [hash]);
  console.log('Admin password set');
  await pool.end();
}
run().catch(e => console.error(e.message));
" 2>/dev/null && ok "Admin password: Admin@123!" || warn "Password already set"

# ── Health check ────────────────────────────────────────────
info "Checking services..."
sleep 3
curl -sf http://localhost:5024/api/health >/dev/null 2>&1 && ok "Backend API: http://localhost:5024" || warn "Backend starting..."

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ GPS SaaS Platform v3 — READY!                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Client Portal:  http://YOUR_IP:5025                 ║"
echo "║  Admin Panel:    http://YOUR_IP:5026                 ║"
echo "║  Backend API:    http://YOUR_IP:5024                 ║"
echo "║  TCP (Devices):  YOUR_IP:5023                        ║"
echo "║                                                      ║"
echo "║  Login: admin@gps.local / Admin@123!                 ║"
echo "║                                                      ║"
echo "║  📡 Testing without hardware?                        ║"
echo "║  → Admin → Device Tester (in sidebar)                ║"
echo "║  → Add device in Devices page first!                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
