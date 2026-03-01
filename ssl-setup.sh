#!/bin/bash
# Usage: bash ssl-setup.sh yourdomain.com
set -e
DOMAIN="${1:-}"
[ -z "$DOMAIN" ] && { echo "Usage: bash ssl-setup.sh yourdomain.com"; exit 1; }
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "[→] Installing certbot..."
sudo apt-get install -y -q certbot
echo "[→] Stopping nginx to free port 80..."
docker compose -f "$APP_DIR/docker-compose.yml" stop nginx 2>/dev/null || true
echo "[→] Obtaining certificate for $DOMAIN ..."
sudo certbot certonly --standalone --non-interactive --agree-tos \
  --register-unsafely-without-email -d "$DOMAIN"
mkdir -p "$APP_DIR/nginx/ssl"
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/ssl/"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$APP_DIR/nginx/ssl/"
sudo chown "$USER:$USER" "$APP_DIR/nginx/ssl/"*.pem
chmod 600 "$APP_DIR/nginx/ssl/"*.pem
echo "[✔] Certificates installed to nginx/ssl/"
echo ""
echo "Now uncomment the HTTPS server block in nginx/nginx.conf"
echo "and also add 'return 301 https://\$host\$request_uri;' in the port 80 block."
echo "Then restart nginx:"
echo "  docker compose restart nginx"
echo ""
# Auto-renewal cron
cat > /tmp/certbot-renew.sh << RENEW
#!/bin/bash
docker compose -f $APP_DIR/docker-compose.yml stop nginx
certbot renew --quiet --standalone
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   $APP_DIR/nginx/ssl/
docker compose -f $APP_DIR/docker-compose.yml start nginx
RENEW
sudo mv /tmp/certbot-renew.sh /etc/cron.monthly/gps-certbot-renew
sudo chmod +x /etc/cron.monthly/gps-certbot-renew
echo "[✔] Auto-renewal configured"
