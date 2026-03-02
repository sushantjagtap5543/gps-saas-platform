#!/bin/bash
# GPS SaaS — fix-env.sh
# Deletes ALL broken .env files and writes a clean .env.production
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

[ -f backend/src/server.js ] || fail "Run this from ~/gps-saas-platform"

# ── Step 1: Delete ALL .env files (including conflicted ones) ────
warn "Removing all .env files..."
find . -maxdepth 2 -name ".env*" -type f -delete 2>/dev/null || true
rm -f .env .env.production .env.local .env.bak .env.old 2>/dev/null || true
ok "All .env files removed"

# ── Step 2: Generate secrets ─────────────────────────────────────
warn "Generating secrets..."
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 12)
SESSION_SECRET=$(openssl rand -hex 24)
GRAFANA_PASSWORD=$(openssl rand -hex 12)
ok "Secrets generated"

# ── Step 3: Write clean .env.production ──────────────────────────
warn "Writing clean .env.production..."

cat > .env.production << ENVEOF
# GPS SaaS Platform — Auto-generated on $(date)
# DO NOT EDIT manually — re-run fix-env.sh to regenerate

NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info

# ── PostgreSQL ──────────────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=gpsdb
POSTGRES_USER=gpsuser
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://gpsuser:${DB_PASSWORD}@postgres:5432/gpsdb

# ── Redis ───────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
REFRESH_EXPIRES_IN=30d

# ── Session ─────────────────────────────────────────────────────
SESSION_SECRET=${SESSION_SECRET}

# ── App ─────────────────────────────────────────────────────────
TCP_PORT=5000
CORS_ORIGIN=*
BCRYPT_ROUNDS=12
OVERSPEED_LIMIT=100

# ── Admin ───────────────────────────────────────────────────────
ADMIN_EMAIL=admin@gps.local
ADMIN_PASSWORD=Admin@123!

# ── Email (fill in to enable alerts) ────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gpstracker.com

# ── Razorpay (fill in to enable payments) ───────────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# ── Firebase (optional — push notifications) ────────────────────
FIREBASE_SERVICE_ACCOUNT=

# ── Monitoring ──────────────────────────────────────────────────
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}
ENVEOF

ok ".env.production written"

# ── Step 4: Create symlink ────────────────────────────────────────
ln -sf .env.production .env
ok ".env → .env.production symlinked"

# ── Step 5: Protect from git ─────────────────────────────────────
grep -qxF ".env"     .gitignore 2>/dev/null || echo ".env"     >> .gitignore
grep -qxF ".env.*"   .gitignore 2>/dev/null || echo ".env.*"   >> .gitignore
ok ".gitignore updated"

# ── Step 6: Save passwords ───────────────────────────────────────
cat > DEPLOYMENT_INFO.txt << INFOEOF
GPS SaaS — Generated $(date)
DB Password    : ${DB_PASSWORD}
Redis Password : ${REDIS_PASSWORD}
JWT Secret     : ${JWT_SECRET}
Admin Login    : admin@gps.local / Admin@123!
INFOEOF
ok "Passwords saved to DEPLOYMENT_INFO.txt"

# ── Step 7: Apply all code fixes ─────────────────────────────────
warn "Applying code fixes..."

# Fix auth middleware export
cat > backend/src/middleware/auth.middleware.js << 'EOF'
const jwt = require("jsonwebtoken");
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Authorization header missing" });
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
  }
};
module.exports = { authenticate };
EOF
ok "auth.middleware.js fixed"

# Fix geofence.routes.js
sed -i 's|const auth = require("../../middleware/auth.middleware");|const { authenticate: auth } = require("../../middleware/auth.middleware");|' \
    backend/src/modules/geofence/geofence.routes.js 2>/dev/null || true

# Fix branding.routes.js auth + rbac imports
sed -i 's|const auth   = require("../../middleware/auth.middleware");|const { authenticate: auth } = require("../../middleware/auth.middleware");|' \
    backend/src/modules/branding/branding.routes.js 2>/dev/null || true
sed -i 's|const rbac   = require("../../middleware/rbac.middleware");|const { authorize: rbac } = require("../../middleware/rbac.middleware");|' \
    backend/src/modules/branding/branding.routes.js 2>/dev/null || true

# Fix billing.routes.js
sed -i 's|const auth    = require("../middleware/auth.middleware");|const { authenticate: auth } = require("../middleware/auth.middleware");|' \
    backend/src/routes/billing.routes.js 2>/dev/null || true

# Fix GpsHistory model missing primaryKey
sed -i 's/id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },/id:        { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },/' \
    backend/src/models/index.js 2>/dev/null || true

ok "All code fixes applied"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✔  .env.production created cleanly!    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Now run:  bash setup.sh                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
