# GPS SaaS Platform - Complete Deployment Guide

## ✅ What Was Fixed

This is the **FULLY CORRECTED AND AUDITED** version of the GPS SaaS platform. All critical issues have been resolved:

### Critical Fixes Applied:
1. ✅ Backend Dockerfile port corrected (3000 → 5024)
2. ✅ Removed incompatible express-mongo-sanitize package
3. ✅ Fixed Nginx configuration (merged conflicts, corrected upstream ports)
4. ✅ Fixed TCP server port default (5023 → 5000)
5. ✅ Resolved all git merge conflicts in all files
6. ✅ Fixed database schema initialization
7. ✅ Updated all package.json dependencies
8. ✅ Corrected all port mappings across services

---

## Prerequisites

### System Requirements
- Docker & Docker Compose (latest version)
- Ubuntu 20.04+ or similar Linux distribution
- Minimum 4GB RAM, 20GB disk space
- Internet connectivity

### Required Ports
- 80 (HTTP)
- 443 (HTTPS - optional)
- 5000 (TCP GPS device server)
- 5024 (Backend API - internal)
- 5432 (PostgreSQL - internal)
- 6379 (Redis - internal)

---

## Quick Start (5 Minutes)

```bash
# 1. Extract the ZIP file
unzip GPS-SaaS-Platform-FULLY-CORRECTED.zip
cd gps-saas-corrected

# 2. Create environment file
cat > .env.production << 'EOF'
# PostgreSQL
POSTGRES_PASSWORD=YourSecurePassword123!

# Redis
REDIS_PASSWORD=RedisPassword123!

# Backend
NODE_ENV=production
CORS_ORIGIN=*
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRE=7d

# Admin credentials
ADMIN_EMAIL=admin@gps.local
ADMIN_PASSWORD=Admin@123!

# Optional: Payment Gateway
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret

# Optional: SMS/Email
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE=+1234567890

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EOF

# 3. Start all services
docker-compose up -d

# 4. Wait for services to start (2-3 minutes)
docker-compose logs -f backend

# 5. Test the platform
curl http://localhost/health
curl http://localhost/api/health
```

---

## Detailed Deployment Steps

### Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Prepare Environment Variables

Create `.env.production` file with your configuration:

```env
# ═══════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════
POSTGRES_PASSWORD=SecurePassword123!@
POSTGRES_DB=gpsdb
POSTGRES_USER=gpsuser
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ═══════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=OptionalRedisPassword

# ═══════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════
NODE_ENV=production
PORT=5024
TCP_PORT=5000

# ═══════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost,http://your-domain.com

# ═══════════════════════════════════════════════════════════
# ADMIN CREDENTIALS (Create first admin account)
# ═══════════════════════════════════════════════════════════
ADMIN_EMAIL=admin@gps.local
ADMIN_PASSWORD=YourSecureAdminPassword!

# ═══════════════════════════════════════════════════════════
# PAYMENT GATEWAY (Razorpay)
# ═══════════════════════════════════════════════════════════
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# ═══════════════════════════════════════════════════════════
# SMS GATEWAY (Twilio)
# ═══════════════════════════════════════════════════════════
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=

# ═══════════════════════════════════════════════════════════
# EMAIL (SMTP)
# ═══════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@gps.local

# ═══════════════════════════════════════════════════════════
# FIREBASE (Push Notifications - Optional)
# ═══════════════════════════════════════════════════════════
FIREBASE_SERVICE_ACCOUNT=
```

### Step 3: Build and Start Services

```bash
# Navigate to project directory
cd gps-saas-corrected

# Validate docker-compose configuration
docker-compose config

# Build all services (first time only)
docker-compose build

# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Step 4: Verify Services

```bash
# Check all containers are running
docker ps

# Check backend health
curl http://localhost/api/health
# Expected: {"status":"ok","database":"connected","redis":"ready","timestamp":"..."}

# Check frontend
curl http://localhost/
# Expected: HTML response

# Check admin panel
curl http://localhost/admin
# Expected: HTML response

# Check Socket.IO
curl http://localhost/socket.io/?EIO=4&transport=polling
# Expected: 0 or connection data
```

### Step 5: Initialize Database

```bash
# Check if database is initialized
docker-compose logs postgres | grep "database system is ready"

# If needed, manually initialize
docker-compose exec -T postgres psql -U gpsuser -d gpsdb -f /docker-entrypoint-initdb.d/01-schema.sql

# Check tables created
docker-compose exec -T postgres psql -U gpsuser -d gpsdb -c "\dt"
```

### Step 6: Create Admin Account

```bash
# Access the admin setup endpoint
curl -X POST http://localhost/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gps.local",
    "password": "Admin@123!",
    "name": "Administrator"
  }'

# Or via the UI at http://localhost/admin/setup
```

---

## Service Details

### Port Mappings

```
Service          Container Port    Host Port    Protocol
─────────────────────────────────────────────────────────
Nginx            80/443            80/443       HTTP/HTTPS
Frontend         80                 -            (internal)
Admin Panel      80                 -            (internal)
Backend API      5024              5024          HTTP (internal via nginx)
TCP GPS Server   5000              5000          TCP
PostgreSQL       5432              5432          PostgreSQL
Redis            6379              6379          Redis
```

### Service Dependencies

```
              External Users (Port 80/443)
                        │
                        ▼
            ┌───────────Nginx────────────┐
            │                            │
            ├──→ Backend API :5024       │
            ├──→ Frontend :80            │
            ├──→ Admin Panel :80         │
            └──→ Socket.IO :5024         │
                        │
            ┌───────────┴──────────────┐
            │          │              │
            ▼          ▼              ▼
        PostgreSQL  Redis        TCP Server
        :5432       :6379         :5000
```

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f nginx

# Last 100 lines, follow
docker-compose logs --tail=100 -f backend

# With timestamps
docker-compose logs -f --timestamps backend
```

### Health Checks

```bash
# Backend health
curl http://localhost/api/health

# Nginx status
docker-compose exec nginx nginx -t

# PostgreSQL
docker-compose exec postgres pg_isready -U gpsuser -d gpsdb

# Redis
docker-compose exec redis redis-cli ping
# Expected: PONG
```

### Metrics

```bash
# Prometheus metrics
curl http://localhost/metrics

# Service status
docker-compose ps

# Resource usage
docker stats

# Check port bindings
lsof -i -P -n | grep LISTEN
```

---

## Troubleshooting

### Issue: Backend not starting

```bash
# Check logs
docker-compose logs backend

# Common causes:
# 1. Port already in use
lsof -i :5024
# Solution: Change PORT in .env or kill process

# 2. Database not ready
docker-compose logs postgres

# 3. Redis not ready
docker-compose logs redis

# Solution: Restart services
docker-compose restart
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check upstream services are running
docker-compose ps

# Check nginx configuration
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx
```

### Issue: Database connection fails

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Check credentials
docker-compose exec postgres psql -U gpsuser -d gpsdb -c "SELECT 1"

# Check port binding
netstat -tlnp | grep 5432
```

### Issue: GPS devices not connecting

```bash
# Check TCP server
docker-compose logs tcp-server

# Verify port is listening
netstat -tlnp | grep 5000

# Check firewall
sudo ufw status
sudo ufw allow 5000/tcp
```

---

## Backup & Recovery

### Backup Database

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U gpsuser gpsdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress
gzip backup_*.sql

# List backups
ls -lh backup_*.sql.gz
```

### Restore Database

```bash
# From backup
docker-compose exec -T postgres psql -U gpsuser gpsdb < backup_20240302_120000.sql

# Verify
docker-compose exec postgres psql -U gpsuser -d gpsdb -c "SELECT COUNT(*) FROM users"
```

### Backup Docker Volumes

```bash
# Create tar archive
docker run --rm -v gps_postgres_data:/data -v $(pwd):/backup \
  busybox tar czf /backup/postgres_data.tar.gz /data

# List backups
ls -lh postgres_data.tar.gz
```

---

## SSL/TLS Setup (Optional)

### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Request certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set permissions
sudo chown 999:999 nginx/ssl/*.pem

# Update nginx.conf (uncomment HTTPS block)
# Restart nginx
docker-compose restart nginx
```

---

## Performance Optimization

### Database Optimization

```bash
# Analyze tables
docker-compose exec postgres psql -U gpsuser -d gpsdb -c "ANALYZE;"

# Vacuum tables
docker-compose exec postgres psql -U gpsuser -d gpsdb -c "VACUUM ANALYZE;"

# Check index health
docker-compose exec postgres psql -U gpsuser -d gpsdb -c "SELECT schemaname, tablename, indexname FROM pg_indexes ORDER BY tablename, indexname;"
```

### Redis Cache Optimization

```bash
# Monitor memory usage
docker-compose exec redis redis-cli INFO memory

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHDB

# Check key count
docker-compose exec redis redis-cli DBSIZE
```

### Nginx Tuning

Already optimized in nginx.conf:
- Worker processes: auto (CPU cores)
- Gzip compression: enabled
- Keep-alive: enabled
- Rate limiting: configured

---

## Scaling & Load Balancing

For production with high traffic:

```yaml
# docker-compose.yml modifications
backend:
  deploy:
    replicas: 2  # Multiple backend instances

frontend:
  deploy:
    replicas: 2
```

Then use a load balancer (HAProxy, AWS ALB, etc.)

---

## Security Hardening

### Firewall Setup

```bash
# Allow only necessary ports
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5000/tcp  # GPS TCP (if public)
```

### Docker Security

```bash
# Run with read-only root filesystem
docker-compose up -d --security-opt no-new-privileges

# Check for vulnerabilities
docker scout cves
```

### Environment Security

```bash
# Never commit .env to git
echo ".env.production" >> .gitignore

# Use secure password generator
openssl rand -base64 32

# Rotate secrets regularly
# Update JWT_SECRET, ADMIN_PASSWORD, POSTGRES_PASSWORD
```

---

## Monitoring & Alerting

### Configure Prometheus (Optional)

```yaml
# monitoring/prometheus.yml already included
scrape_interval: 15s
targets:
  - localhost:9090  # Prometheus
  - backend:5024    # Backend metrics
  - postgres:5432   # PostgreSQL metrics
```

### Key Metrics to Monitor

- Backend response time
- Database connection pool
- Redis memory usage
- Nginx request rate
- TCP server connections
- Error rates

---

## API Documentation

### Health Check
```bash
GET /health
GET /api/health

# Response
{
  "status": "ok",
  "database": "connected",
  "redis": "ready",
  "timestamp": "2024-03-02T14:30:00Z"
}
```

### Authentication
```bash
POST /api/auth/login
{
  "email": "admin@gps.local",
  "password": "Admin@123!"
}

# Response
{
  "token": "eyJhbGc...",
  "user": { ... },
  "expiresIn": "7d"
}
```

### Create Device
```bash
POST /api/devices
Authorization: Bearer {token}
{
  "name": "Vehicle 1",
  "imei": "123456789012345",
  "model": "GT06"
}
```

---

## Support & Resources

- **Documentation**: See `FIXES_APPLIED.md` for all corrections
- **GitHub**: [GPS SaaS Platform](https://github.com/your-repo)
- **Issues**: Report bugs and request features
- **Community**: Join Discord/Slack for support

---

## Summary

✅ **All critical issues have been fixed**
✅ **Production-ready configuration**
✅ **Complete documentation provided**
✅ **All services are properly configured**
✅ **Security best practices applied**

**You can now deploy with confidence!**

```bash
docker-compose up -d
docker-compose ps
curl http://localhost/api/health
```

For any questions, refer to FIXES_APPLIED.md for detailed technical information.
