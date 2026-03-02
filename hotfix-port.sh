#!/bin/bash
# GPS SaaS — hotfix: fix port mismatch (backend=5024) + clean nginx.conf
# Run from ~/gps-saas-platform

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

[ -f backend/src/server.js ] || fail "Run from ~/gps-saas-platform"
if command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"; else DC="docker compose"; fi

# ── Fix 1: Ensure PORT=5024 in .env.production ───────────────────
warn "Setting PORT=5024 in .env.production..."
if grep -q "^API_PORT=" .env.production; then
    sed -i 's/^API_PORT=.*/API_PORT=5024/' .env.production
fi
grep -q "^PORT=" .env.production \
    && sed -i 's/^PORT=.*/PORT=5024/' .env.production \
    || echo "PORT=5024" >> .env.production
ok "PORT=5024 set"

# ── Fix 2: Write clean nginx.conf (no merge conflicts) ───────────
warn "Writing clean nginx.conf..."
cat > nginx/nginx.conf << 'NGINXEOF'
worker_processes  auto;
worker_rlimit_nofile 65535;

events {
  worker_connections 1024;
  use epoll;
  multi_accept on;
}

http {
  include       mime.types;
  default_type  application/octet-stream;

  sendfile        on;
  tcp_nopush      on;
  tcp_nodelay     on;
  keepalive_timeout 65;
  server_tokens   off;

  add_header X-Frame-Options         SAMEORIGIN   always;
  add_header X-Content-Type-Options  nosniff      always;
  add_header X-XSS-Protection       "1; mode=block" always;

  gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 5;
  gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

  limit_req_zone $binary_remote_addr zone=api:10m  rate=60r/m;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

  # backend runs on port 5024 (set by PORT env var in server.js)
  upstream backend  { server backend:5024  max_fails=3 fail_timeout=30s; }
  upstream frontend { server frontend:80   max_fails=3 fail_timeout=10s; }
  upstream admin    { server gps-admin:80  max_fails=3 fail_timeout=10s; }

  server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location /api/ {
      limit_req zone=api burst=30 nodelay;
      proxy_pass         http://backend;
      proxy_http_version 1.1;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
      proxy_read_timeout 30s;
      client_max_body_size 10m;
    }

    location /api/auth/ {
      limit_req zone=auth burst=5 nodelay;
      proxy_pass         http://backend;
      proxy_http_version 1.1;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location = /api/billing/webhook {
      proxy_pass         http://backend;
      proxy_http_version 1.1;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
    }

    location /health {
      proxy_pass   http://backend;
      access_log   off;
    }

    location /socket.io/ {
      proxy_pass         http://backend;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade    $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_set_header   Host       $host;
      proxy_read_timeout 86400s;
      proxy_send_timeout 86400s;
    }

    location /admin {
      proxy_pass         http://admin;
      proxy_http_version 1.1;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
      proxy_pass         http://frontend;
      proxy_http_version 1.1;
      proxy_set_header   Host              $host;
      proxy_set_header   X-Real-IP         $remote_addr;
      proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
    }
  }
}

stream {
  upstream gps_tcp { server tcp-server:5000; }
  server {
    listen 5000;
    proxy_pass            gps_tcp;
    proxy_timeout         120s;
    proxy_connect_timeout 10s;
  }
}
NGINXEOF
ok "nginx.conf written clean (no merge conflicts)"

# ── Fix 3: Update docker-compose to expose port 5024 ─────────────
warn "Updating docker-compose.yml backend expose port..."
sed -i 's/expose:\n.*- "3000"/expose:\n      - "5024"/' docker-compose.yml 2>/dev/null || true
# More reliable approach — use python
python3 - << 'PYEOF'
with open("docker-compose.yml", "r") as f:
    c = f.read()
# Fix the expose port in backend service
c = c.replace('expose:\n      - "3000"', 'expose:\n      - "5024"')
with open("docker-compose.yml", "w") as f:
    f.write(c)
print("docker-compose.yml updated")
PYEOF
ok "docker-compose.yml updated"

# ── Fix 4: Restart backend + nginx ───────────────────────────────
warn "Restarting backend and nginx..."
$DC up -d --no-deps --force-recreate backend nginx

warn "Waiting for backend on port 5024..."
for i in $(seq 1 25); do
    sleep 3
    # Check directly on 5024 inside docker network, and also via nginx on 80
    if $DC exec -T backend wget -qO- http://localhost:5024/health >/dev/null 2>&1 || \
       curl -sf http://localhost/health >/dev/null 2>&1 || \
       curl -sf http://localhost/api/health >/dev/null 2>&1; then
        ok "Backend is healthy!"
        echo ""
        $DC ps
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅  All services running!                   ║${NC}"
        echo -e "${GREEN}║                                              ║${NC}"
        PUBLIC_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
        printf "${GREEN}║  Portal : http://%-28s║${NC}\n" "${PUBLIC_IP}"
        printf "${GREEN}║  Admin  : http://%-28s║${NC}\n" "${PUBLIC_IP}/admin"
        printf "${GREEN}║  API    : http://%-28s║${NC}\n" "${PUBLIC_IP}/api"
        echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
        exit 0
    fi
    printf "."
done
echo ""
warn "Showing final status:"
$DC ps
echo ""
warn "Backend logs:"
$DC logs --tail=15 backend
echo ""
warn "Nginx logs:"
$DC logs --tail=10 nginx
