#!/bin/bash
# GPS SaaS — hotfix: auth middleware export + duplicate register
# Run from ~/gps-saas-platform

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] FATAL: $1${NC}"; exit 1; }

[ -f backend/src/middleware/auth.middleware.js ] || fail "Run from ~/gps-saas-platform directory"

# ── Fix 1: auth.middleware.js — export as named { authenticate } ──
cat > backend/src/middleware/auth.middleware.js << 'EOF'
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ message: msg });
  }
};

module.exports = { authenticate };
EOF
ok "auth.middleware.js fixed (named export)"

# ── Fix 2: billing.routes.js — uses raw `auth` import ──
sed -i 's/const auth    = require("..\/middleware\/auth.middleware");/const { authenticate: auth } = require("..\/middleware\/auth.middleware");/' \
    backend/src/routes/billing.routes.js
ok "billing.routes.js fixed"

# ── Fix 3: auth.controller.js — remove duplicate exports.register ──
# Keep first register, rename second to selfRegister
python3 - << 'PYEOF'
import re

with open("backend/src/controllers/auth.controller.js", "r") as f:
    content = f.read()

# Find the second exports.register and rename it to exports.selfRegister
parts = content.split("exports.register")
if len(parts) == 3:
    # parts[0] = before first, parts[1] = first body, parts[2] = second body
    fixed = "exports.register".join(parts[:2]) + "exports.selfRegister" + parts[2]
    with open("backend/src/controllers/auth.controller.js", "w") as f:
        f.write(fixed)
    print("[✔] auth.controller.js fixed (duplicate register renamed to selfRegister)")
else:
    print(f"[!] Found {len(parts)-1} exports.register — skipping (manual check needed)")
PYEOF

# ── Rebuild backend only ──
echo ""
warn "Rebuilding backend container only (~40 seconds)..."

if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

$DC build --no-cache backend
$DC up -d --no-deps backend

echo ""
warn "Waiting for backend to start..."
for i in $(seq 1 20); do
    sleep 3
    if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
        ok "Backend is healthy!"
        break
    fi
    printf "."
done
echo ""

if ! curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    warn "Backend not yet healthy — last 20 log lines:"
    $DC logs --tail=20 backend
fi

echo ""
ok "Hotfix complete. Run: $DC ps"
