#!/bin/bash
# ============================================================
# GPS SaaS — Health Monitor
# Checks all services, memory, disk, and auto-restarts failed ones
# Usage: bash monitor.sh          (one-time check)
#        bash monitor.sh --watch  (run every 30s)
# ============================================================
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE="docker compose -f $APP_DIR/docker-compose.2gb.yml"
WATCH_MODE="${1:-}"

check_once() {
  clear 2>/dev/null || true
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   GPS SaaS — System Health  $(date '+%H:%M:%S')             ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  # ── Memory ─────────────────────────────────────────────────
  TOTAL=$(free -m | awk '/^Mem:/{print $2}')
  USED=$(free -m  | awk '/^Mem:/{print $3}')
  FREE=$(free -m  | awk '/^Mem:/{print $4}')
  SWAP_USED=$(free -m | awk '/^Swap:/{print $3}')
  MEM_PCT=$((USED * 100 / TOTAL))

  MEM_COLOR=$GREEN
  [ $MEM_PCT -gt 75 ] && MEM_COLOR=$YELLOW
  [ $MEM_PCT -gt 90 ] && MEM_COLOR=$RED

  echo -e "Memory: ${MEM_COLOR}${USED}MB / ${TOTAL}MB (${MEM_PCT}%)${NC}  Swap used: ${SWAP_USED}MB"
  echo ""

  # ── Disk ───────────────────────────────────────────────────
  DISK_PCT=$(df / | awk 'NR==2{print $5}' | tr -d '%')
  DISK_COLOR=$GREEN
  [ $DISK_PCT -gt 75 ] && DISK_COLOR=$YELLOW
  [ $DISK_PCT -gt 90 ] && DISK_COLOR=$RED
  echo -e "Disk:   ${DISK_COLOR}${DISK_PCT}% used${NC}"
  echo ""

  # ── Containers ─────────────────────────────────────────────
  echo "Services:"
  SERVICES="postgres redis backend tcp-server notifications frontend gps-admin nginx"
  ALL_HEALTHY=true

  for SVC in $SERVICES; do
    STATUS=$($COMPOSE ps --status running "$SVC" 2>/dev/null | grep -c "$SVC" || echo "0")
    if [ "$STATUS" -gt 0 ]; then
      echo -e "  ${GREEN}✔${NC} $SVC"
    else
      echo -e "  ${RED}✘${NC} $SVC  — RESTARTING..."
      $COMPOSE up -d "$SVC" 2>/dev/null || true
      ALL_HEALTHY=false
    fi
  done
  echo ""

  # ── API Health ─────────────────────────────────────────────
  HEALTH=$(curl -sf http://localhost:3000/health 2>/dev/null || echo '{"status":"UNREACHABLE"}')
  STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "?")
  PG=$(echo "$HEALTH"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('postgres','?'))" 2>/dev/null || echo "?")
  RD=$(echo "$HEALTH"     | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('redis','?'))" 2>/dev/null || echo "?")

  COLOR=$GREEN
  [ "$STATUS" = "DEGRADED" ]    && COLOR=$YELLOW
  [ "$STATUS" = "UNREACHABLE" ] && COLOR=$RED

  echo -e "API Health: ${COLOR}${STATUS}${NC}  |  postgres: ${PG}  |  redis: ${RD}"
  echo ""

  # ── Memory warning actions ──────────────────────────────────
  if [ $MEM_PCT -gt 85 ]; then
    echo -e "${RED}⚠ HIGH MEMORY — Running Docker prune...${NC}"
    docker system prune -f --filter "until=1h" > /dev/null 2>&1 || true
  fi

  if [ $DISK_PCT -gt 85 ]; then
    echo -e "${RED}⚠ HIGH DISK — Pruning old images and logs...${NC}"
    docker image prune -f > /dev/null 2>&1 || true
    journalctl --vacuum-size=100M > /dev/null 2>&1 || true
  fi

  $ALL_HEALTHY && echo -e "${GREEN}All services healthy ✅${NC}" || echo -e "${YELLOW}Some services were restarted${NC}"
}

if [ "$WATCH_MODE" = "--watch" ]; then
  echo "Watching... (Ctrl+C to stop)"
  while true; do
    check_once
    sleep 30
  done
else
  check_once
fi
