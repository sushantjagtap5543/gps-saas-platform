#!/bin/bash
# ============================================================
# GPS SaaS — Diagnose Issues
# Collects logs and status for troubleshooting
# Usage: bash diagnose.sh [service_name]
# ============================================================
CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[→]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $APP_DIR/docker-compose.2gb.yml"
SERVICE="${1:-}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GPS SaaS — Diagnostics  $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "System:"
uname -a
echo "Memory: $(free -h | grep Mem)"
echo "Swap:   $(free -h | grep Swap)"
echo "Disk:   $(df -h / | tail -1)"
echo ""

info "Docker:"
docker --version
docker compose version
echo ""

info "Containers:"
$COMPOSE ps
echo ""

info "Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || true
echo ""

if [ -n "$SERVICE" ]; then
  info "Logs for $SERVICE (last 100 lines):"
  $COMPOSE logs --tail=100 "$SERVICE"
else
  info "Recent backend logs (last 50 lines):"
  $COMPOSE logs --tail=50 backend
  echo ""
  info "Recent nginx logs (last 20 lines):"
  $COMPOSE logs --tail=20 nginx
fi

echo ""
info "API Health:"
curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || echo "Backend not responding"
echo ""

info "Redis:"
$COMPOSE exec -T redis redis-cli info memory 2>/dev/null | grep -E "used_memory_human|maxmemory_human" || echo "Redis not responding"
echo ""

info "Network ports:"
ss -tlnp | grep -E "80|443|3000|5000|5432|6379" || netstat -tlnp 2>/dev/null | grep -E "80|443|3000|5000" || true
