#!/bin/bash
# ============================================================
# GPS SaaS — Step 4: SSL Certificate Setup (Let's Encrypt)
# Run AFTER DNS A record points to this server
# Usage: bash 04-ssl-setup.sh yourdomain.com
# ============================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
die()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  # Try reading from env file
  if [ -f "$APP_DIR/.env.production" ]; then
    DOMAIN=$(grep '^DOMAIN=' "$APP_DIR/.env.production" | cut -d'=' -f2)
  fi
fi
[ -z "$DOMAIN" ] && die "Usage: bash 04-ssl-setup.sh yourdomain.com"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   GPS SaaS — SSL Certificate Setup              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
info "Domain: $DOMAIN"

# ── Check DNS resolves to this server ─────────────────────────
MY_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
DNS_IP=$(dig +short "$DOMAIN" | tail -1 || nslookup "$DOMAIN" 2>/dev/null | grep Address | tail -1 | awk '{print $2}' || echo "")

if [ -n "$DNS_IP" ] && [ "$DNS_IP" != "$MY_IP" ]; then
  warn "DNS check: $DOMAIN → $DNS_IP, this server → $MY_IP"
  warn "DNS may not point to this server yet. SSL may fail."
  read -rp "Continue anyway? (y/N): " CONT
  [[ "$CONT" != "y" && "$CONT" != "Y" ]] && die "Aborted. Fix DNS first."
fi

# ── Install certbot ───────────────────────────────────────────
info "Installing certbot..."
sudo apt-get install -y -q certbot
log "Certbot installed"

# ── Stop nginx temporarily for standalone mode ────────────────
info "Stopping nginx to free port 80..."
cd "$APP_DIR"
docker compose -f docker-compose.2gb.yml stop nginx 2>/dev/null || true

# ── Get certificate ───────────────────────────────────────────
info "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  -d "$DOMAIN"

# ── Copy certificates ─────────────────────────────────────────
info "Installing certificates..."
mkdir -p "$APP_DIR/nginx/ssl"
sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "$APP_DIR/nginx/ssl/"
sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"   "$APP_DIR/nginx/ssl/"
sudo chown ubuntu:ubuntu "$APP_DIR/nginx/ssl/"*.pem
chmod 600 "$APP_DIR/nginx/ssl/"*.pem
log "Certificates installed to nginx/ssl/"

# ── Enable HTTPS in nginx.conf ────────────────────────────────
info "Enabling HTTPS server block in nginx.conf..."
NGINX_CONF="$APP_DIR/nginx/nginx.conf"

# Uncomment the HTTPS server block
python3 -c "
import re, sys

with open('$NGINX_CONF', 'r') as f:
    content = f.read()

# Replace the HTTPS server block comment markers
content = content.replace(
    \"  # HTTPS_SERVER_BLOCK_START\",
    \"  # HTTPS enabled\"
)

# Uncomment all lines between HTTPS markers
lines = content.split('\n')
in_https_block = False
result = []
for line in lines:
    if '# HTTPS_BEGIN' in line:
        in_https_block = True
        continue
    elif '# HTTPS_END' in line:
        in_https_block = False
        continue
    elif in_https_block and line.startswith('  #'):
        # Uncomment
        result.append(line[4:] if line.startswith('  # ') else line[3:])
    else:
        result.append(line)

with open('$NGINX_CONF', 'w') as f:
    f.write('\n'.join(result))
print('nginx.conf updated')
" 2>/dev/null || warn "Could not auto-edit nginx.conf — see DEPLOYMENT.md for manual steps"

# ── Restart nginx ─────────────────────────────────────────────
info "Restarting nginx with SSL..."
docker compose -f docker-compose.2gb.yml up -d nginx
sleep 3

# ── Test HTTPS ────────────────────────────────────────────────
if curl -sf "https://${DOMAIN}/health" | grep -q '"status"' 2>/dev/null; then
  log "HTTPS working!"
else
  warn "HTTPS test did not return expected response — check nginx logs:"
  echo "  docker compose -f docker-compose.2gb.yml logs nginx"
fi

# ── Set up auto-renewal ───────────────────────────────────────
info "Setting up certificate auto-renewal..."
cat > /tmp/certbot-renew.sh <<RENEW
#!/bin/bash
# Renew Let's Encrypt certificate
cd $APP_DIR
docker compose -f docker-compose.2gb.yml stop nginx
certbot renew --quiet --standalone
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem   nginx/ssl/
docker compose -f docker-compose.2gb.yml start nginx
RENEW
sudo mv /tmp/certbot-renew.sh /etc/cron.monthly/gps-certbot-renew
sudo chmod +x /etc/cron.monthly/gps-certbot-renew
log "Auto-renewal configured (runs monthly)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           SSL CONFIGURED ✅                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Customer Portal: https://${DOMAIN}"
echo "  Admin Panel:     https://${DOMAIN}/admin/"
echo ""
