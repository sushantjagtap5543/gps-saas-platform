#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  GPS SaaS — Complete Fix Script
#  Fixes: old Docker, missing docker-compose, JWT placeholders
#
#  HOW TO RUN ON YOUR SERVER:
#  wget -O fix.sh https://YOUR_URL/INSTALL-DOCKER-AND-FIX.sh
#  chmod +x fix.sh && sudo bash fix.sh
# ════════════════════════════════════════════════════════════════

set -e
cd ~

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     GPS SaaS — Docker Install & Fix Script       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Show current Docker version ──────────────────────
echo "▶ Current Docker version:"
docker --version 2>/dev/null || echo "Docker not found at all"
echo ""

# ── STEP 2: Remove old Docker if present ─────────────────────
echo "▶ Removing old Docker packages..."
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# ── STEP 3: Install latest Docker CE (official method) ────────
echo ""
echo "▶ Installing latest Docker CE..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release wget openssl

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker apt repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker ubuntu 2>/dev/null || sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker

echo ""
echo "▶ New Docker version:"
docker --version
docker compose version
echo ""

# ── STEP 4: Fix firewall ──────────────────────────────────────
echo "▶ Configuring firewall..."
sudo apt-get install -y ufw 2>/dev/null || true
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable
echo ""

# ── STEP 5: Find project directory ───────────────────────────
echo "▶ Looking for gps-saas-platform directory..."
PROJ=""
for d in ~/gps-saas-platform ~/gps-saas ~/deploy ~/gps ~/platform; do
  if [ -f "$d/docker-compose.yml" ]; then
    PROJ="$d"
    break
  fi
done

if [ -z "$PROJ" ]; then
  echo ""
  echo "⚠️  Could not find docker-compose.yml."
  echo "   Please tell me the path to your project folder."
  echo "   Then re-run: cd YOUR_PROJECT_FOLDER && bash ~/fix.sh"
  echo ""
  # Check current directory
  if [ -f "docker-compose.yml" ]; then
    PROJ=$(pwd)
    echo "   Found docker-compose.yml in current directory: $PROJ"
  else
    echo "   Listing home directory:"
    ls -la ~/ | head -20
    exit 1
  fi
fi

echo "✅ Found project at: $PROJ"
cd "$PROJ"

# ── STEP 6: Fix .env.production — generate real JWT secrets ───
echo ""
echo "▶ Checking .env.production..."
ENVFILE=".env.production"
[ ! -f "$ENVFILE" ] && ENVFILE=".env"

if [ ! -f "$ENVFILE" ]; then
  echo "❌ No .env file found. Creating from template..."
  cat > .env.production << 'ENVEOF'
NODE_ENV=production
API_PORT=3000
TCP_PORT=5000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=gpsdb
POSTGRES_USER=gpsuser
POSTGRES_PASSWORD=GpsSecure@2024!
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=PLACEHOLDER
JWT_REFRESH_SECRET=PLACEHOLDER
CORS_ORIGIN=*
RAZORPAY_KEY=rzp_test_xxxxxxxxxxxxxxxxxx
RAZORPAY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OVERSPEED_LIMIT=100
GRAFANA_PASSWORD=Admin@Grafana2024
LOG_LEVEL=info
ENVEOF
  ENVFILE=".env.production"
fi

# Auto-fix JWT placeholders
if grep -q "PLACEHOLDER\|REPLACE_WITH\|CHANGE_ME\|5e884898" "$ENVFILE" 2>/dev/null; then
  echo "⚠️  JWT secrets are placeholders — auto-generating real ones..."
  JWT1=$(openssl rand -hex 64)
  JWT2=$(openssl rand -hex 64)
  # Use temp file to avoid sed issues on different systems
  python3 -c "
import re, sys
content = open('$ENVFILE').read()
content = re.sub(r'^JWT_SECRET=.*', 'JWT_SECRET=$JWT1', content, flags=re.MULTILINE)
content = re.sub(r'^JWT_REFRESH_SECRET=.*', 'JWT_REFRESH_SECRET=$JWT2', content, flags=re.MULTILINE)
open('$ENVFILE', 'w').write(content)
print('JWT secrets updated')
" 2>/dev/null || {
    # Fallback if python3 not available
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT1|" "$ENVFILE"
    sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT2|" "$ENVFILE"
    echo "JWT secrets updated (sed)"
  }
  echo "✅ JWT_SECRET:         ${JWT1:0:20}..."
  echo "✅ JWT_REFRESH_SECRET: ${JWT2:0:20}..."
else
  echo "✅ JWT secrets already set"
fi

# ── STEP 7: Write fixed scripts ───────────────────────────────
echo ""
echo "▶ Writing fixed scripts..."

mkdir -p scripts

cat > scripts/diagnose.sh << 'DIAGEOF'
#!/bin/bash
# GPS SaaS Diagnostic — works with any Docker/compose version

echo "=== Docker Info ==="
docker --version
docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "compose not found"

# Detect compose command
DC=""
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
fi

if [ -z "$DC" ]; then
  echo ""
  echo "❌ docker-compose not installed. Run this script first:"
  echo "   sudo bash ~/fix.sh"
  exit 1
fi

echo "Using: $DC"
echo ""

echo "=== Container Status ==="
$DC ps

echo ""
echo "=== Backend Last 100 Lines ==="
$DC logs backend 2>&1 | tail -100

echo ""
echo "=== PostgreSQL Status ==="
$DC exec -T postgres pg_isready -U gpsuser -d gpsdb 2>&1 || echo "POSTGRES NOT READY"

echo ""
echo "=== Redis Status ==="
$DC exec -T redis redis-cli ping 2>&1 || echo "REDIS NOT READY"

echo ""
echo "=== Health Endpoint ==="
curl -s http://localhost:3000/health 2>/dev/null || wget -qO- http://localhost:3000/health 2>/dev/null || echo "BACKEND NOT RESPONDING"

echo ""
echo "=== Env File Check ==="
ENVFILE=".env.production"
[ -f ".env" ] && ENVFILE=".env"
echo "File: $ENVFILE"
grep "^POSTGRES_DB\|^POSTGRES_USER\|^POSTGRES_HOST\|^REDIS_HOST" "$ENVFILE" 2>/dev/null
if grep -q "PLACEHOLDER\|REPLACE_WITH\|CHANGE_ME\|5e884898" "$ENVFILE" 2>/dev/null; then
  echo "JWT_SECRET: ❌ STILL PLACEHOLDER — run: sudo bash ~/fix.sh"
else
  echo "JWT_SECRET: ✅ Custom value set"
fi
DIAGEOF

cat > scripts/fix-and-restart.sh << 'FIXEOF'
#!/bin/bash
# GPS SaaS — Fix & Restart (works with Docker compose v1 and v2)
set -e

# Detect compose
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ docker-compose not found. Run: sudo bash ~/fix.sh"
  exit 1
fi

echo "Using: $DC"
echo ""
echo "════════════════════════════════════"
echo "  GPS SaaS — Fix & Restart"
echo "════════════════════════════════════"

$DC down --remove-orphans 2>/dev/null || true

# Check JWT
ENVFILE=".env.production"
[ -f ".env" ] && ENVFILE=".env"
if grep -q "PLACEHOLDER\|REPLACE_WITH\|CHANGE_ME\|5e884898" "$ENVFILE" 2>/dev/null; then
  echo "⚠️  Fixing JWT secrets..."
  JWT1=$(openssl rand -hex 64)
  JWT2=$(openssl rand -hex 64)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT1|" "$ENVFILE"
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT2|" "$ENVFILE"
  echo "✅ JWT secrets generated"
fi

echo "→ Building backend..."
$DC build --no-cache backend

echo "→ Starting postgres + redis..."
$DC up -d postgres redis
echo "→ Waiting 40s for postgres..."
sleep 40
$DC exec -T postgres pg_isready -U gpsuser -d gpsdb && echo "✅ Postgres ready" || echo "⚠️ Postgres not ready yet"

echo "→ Starting all services..."
$DC up -d
sleep 10

echo ""
echo "→ Status:"
$DC ps

echo ""
echo "→ Health check:"
curl -s http://localhost:3000/health 2>/dev/null || wget -qO- http://localhost:3000/health 2>/dev/null || echo "Not ready yet — wait 60s then check: $DC logs backend"

echo ""
echo "════════════════════════════════════"
echo "  Useful commands:"
echo "  $DC ps"
echo "  $DC logs backend -f"
echo "  $DC logs backend 2>&1 | tail -50"
echo "════════════════════════════════════"
FIXEOF

chmod +x scripts/diagnose.sh scripts/fix-and-restart.sh
echo "✅ Scripts fixed"

# ── STEP 8: Stop old broken containers if any ─────────────────
echo ""
echo "▶ Stopping any existing containers..."
docker compose down --remove-orphans 2>/dev/null || \
  docker-compose down --remove-orphans 2>/dev/null || \
  docker ps -q | xargs -r docker stop 2>/dev/null || true

# ── STEP 9: Build and start ───────────────────────────────────
echo ""
echo "▶ Building and starting all services..."
echo "  (This takes 3-5 minutes on first run)"
echo ""

docker compose up -d --build 2>/dev/null || docker-compose up -d --build

# ── STEP 10: Wait and check ───────────────────────────────────
echo ""
echo "▶ Waiting 60 seconds for all services to start..."
sleep 60

echo ""
echo "▶ Container status:"
docker compose ps 2>/dev/null || docker-compose ps

echo ""
echo "▶ Health check:"
curl -s http://localhost:3000/health 2>/dev/null || \
  wget -qO- http://localhost:3000/health 2>/dev/null || \
  echo "Not ready — run: docker compose logs backend 2>&1 | tail -50"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ DONE!                                        ║"
echo "║                                                  ║"
echo "║  Next commands to use:                           ║"
echo "║  docker compose ps                               ║"
echo "║  docker compose logs backend 2>&1 | tail -50    ║"
echo "║  ./scripts/diagnose.sh                          ║"
echo "║  ./scripts/fix-and-restart.sh                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
