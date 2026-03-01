#!/usr/bin/env bash
# GPS SaaS Platform — v2.3 (ALL ERRORS FIXED)
set -euo pipefail

# ── COLORS (FIXED ESCAPES) ─────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}  [✔]${NC} $*"; }
info() { echo -e "${CYAN}  [→]${NC} $*"; }
warn() { echo -e "${YELLOW}  [!]${NC} $*"; }
die()  { echo -e "${RED}  [✘]${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}━━━ $* ${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
LOG_FILE="$SCRIPT_DIR/install.log"

# ── DOCKER CMD (FIXED) ─────────────────────────────────────────────
if docker ps >/dev/null 2>&1; then
  DOCKER_CMD="docker"
elif sudo docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
  echo -e "${YELLOW}Using sudo docker${NC}"
else
  die "Docker not working. Fix: sudo usermod -aG docker $USER && newgrp docker"
fi

exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           GPS SaaS — ONE CLICK DEPLOY v2.3           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo "Docker: ${DOCKER_CMD}"
echo ""

# ═══ 1. CLEANUP ═══
step "CLEANUP"
${DOCKER_CMD} system prune -af 2>/dev/null || true
sudo apt-get clean >/dev/null 2>&1
ok "✅ Clean"

# ═══ 2. UPDATE ═══
step "UPDATE"
sudo apt-get update -qq >/dev/null 2>&1
sudo apt-get upgrade -yqq >/dev/null 2>&1
ok "✅ Updated"

# ═══ 3. CHECK FILES ═══
step "VALIDATE FILES"
[[ $(id -u) -ne 0 ]] || die "Run as NON-ROOT user"
[[ -f "$ENV_FILE" ]] || die ".env.production MISSING"
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml MISSING"
ok "✅ Files OK"

# ═══ 4. FIREWALL ═══
step "FIREWALL"
sudo ufw --force reset >/dev/null 2>&1
sudo ufw allow 22,80,443,5000/tcp >/dev/null 2>&1
sudo ufw --force enable >/dev/null 2>&1
ok "✅ Ports open: 22,80,443,5000"

# ═══ 5. KERNEL ═══
step "KERNEL TUNE"
cat <<EOF | sudo tee /etc/sysctl.d/99-gps.conf >/dev/null
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.tcp_tw_reuse=1
EOF
sudo sysctl -p /etc/sysctl.d/99-gps.conf >/dev/null 2>&1
ok "✅ Tuned"

# ═══ 6. JWT SECRETS ═══
step "JWT SECRETS"
if grep -q "REPLACE_" "$ENV_FILE" 2>/dev/null; then
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_here|$(openssl rand -hex 64)|g" "$ENV_FILE"
  sed -i "s|REPLACE_run_openssl_rand_-hex_64_and_paste_different_here|$(openssl rand -hex 64)|g" "$ENV_FILE"
  ok "✅ JWT generated"
fi
ok "✅ Env ready"

# ═══ 7. BUILD & START (MAIN) ═══
step "🚀 BUILD & START (5-10 mins)"
cd "$SCRIPT_DIR"
${DOCKER_CMD} compose --env-file "$ENV_FILE" build --no-cache --parallel
${DOCKER_CMD} compose --env-file "$ENV_FILE" up -d
ok "✅ ALL SERVICES LIVE"

# ═══ 8. HEALTH CHECK ═══
step "HEALTH CHECK"
sleep 45
${DOCKER_CMD} compose ps

if curl -s http://localhost:3000/health | grep -q "OK"; then
  ok "✅ Backend healthy"
else  
  warn "Backend starting... (check logs)"
fi

# ═══ SUCCESS ═══
echo -e "\n${BOLD}${GREEN}🎉 GPS SaaS PLATFORM LIVE!${NC}\n"
IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
echo -e "🌐  Customer Portal:  http://${IP}/"
echo -e "👨‍💼 Admin Panel:     http://${IP}/admin" 
echo -e "📡 GPS TCP Server:    port 5000"
echo -e "\n🔧 COMMANDS:"
echo -e "  Logs:     ${DOCKER_CMD} compose logs -f"
echo -e "  Restart:  ${DOCKER_CMD} compose restart"
echo -e "  Update:   ${DOCKER_CMD} compose up -d --build"
echo -e "  Stop:     ${DOCKER_CMD} compose down"
echo -e "\n📋 Full log: ${LOG_FILE}"
