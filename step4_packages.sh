#!/bin/bash
# STEP 4: Update package.json files and Dockerfiles
cd /home/ubuntu/gps-saas-platform

echo "[→] Removing node_modules and lock files..."
find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
find . -name "package-lock.json" -delete 2>/dev/null || true
find . -name "yarn.lock" -delete 2>/dev/null || true
echo "[✔] node_modules removed"

echo "[→] Writing backend/package.json..."
cat > backend/package.json << 'EOF'
{
  "name": "gps-backend",
  "version": "2.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "bcrypt":                 "^5.1.1",
    "bcryptjs":               "^2.4.3",
    "compression":            "^1.7.4",
    "cors":                   "^2.8.5",
    "dotenv":                 "^16.4.5",
    "express":                "^4.19.2",
    "express-rate-limit":     "^7.3.1",
    "helmet":                 "^7.1.0",
    "ioredis":                "^5.4.1",
    "joi":                    "^17.13.3",
    "jsonwebtoken":           "^9.0.2",
    "morgan":                 "^1.10.0",
    "pdfkit":                 "^0.15.0",
    "pg":                     "^8.12.0",
    "pg-hstore":              "^2.3.4",
    "prom-client":            "^15.1.3",
    "razorpay":               "^2.9.5",
    "sequelize":              "^6.37.3",
    "socket.io":              "^4.7.5",
    "uuid":                   "^10.0.0",
    "winston":                "^3.13.0"
  },
  "devDependencies": { "nodemon": "^3.1.4" }
}
EOF
echo "[✔] backend/package.json"

echo "[→] Writing tcp-server/package.json..."
cat > tcp-server/package.json << 'EOF'
{
  "name": "gps-tcp-server",
  "version": "2.0.0",
  "main": "src/server.js",
  "scripts": { "start": "node src/server.js" },
  "dependencies": {
    "dotenv":  "^16.4.5",
    "ioredis": "^5.4.1",
    "pg":      "^8.12.0"
  }
}
EOF
echo "[✔] tcp-server/package.json"

if [ -f notifications/package.json ]; then
cat > notifications/package.json << 'EOF'
{
  "name": "gps-notifications",
  "version": "2.0.0",
  "main": "worker.js",
  "scripts": { "start": "node worker.js" },
  "dependencies": {
    "dotenv":     "^16.4.5",
    "ioredis":    "^5.4.1",
    "nodemailer": "^6.9.14"
  }
}
EOF
echo "[✔] notifications/package.json"
fi

echo "[→] Writing backend/Dockerfile..."
cat > backend/Dockerfile << 'EOF'
FROM node:20-alpine
RUN apk add --no-cache curl wget python3 make g++
WORKDIR /app
COPY package.json ./
RUN rm -f package-lock.json yarn.lock && npm install --production --no-fund --no-audit
COPY . .
RUN mkdir -p logs invoices
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=10s --start-period=120s --retries=6 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status"' || exit 1
CMD ["node", "src/server.js"]
EOF
echo "[✔] backend/Dockerfile"

echo "[→] Writing tcp-server/Dockerfile..."
cat > tcp-server/Dockerfile << 'EOF'
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json ./
RUN rm -f package-lock.json yarn.lock && npm install --production --no-fund --no-audit
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
EOF
echo "[✔] tcp-server/Dockerfile"

if [ -f notifications/Dockerfile ]; then
cat > notifications/Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN rm -f package-lock.json yarn.lock && npm install --production --no-fund --no-audit
COPY . .
CMD ["node", "worker.js"]
EOF
echo "[✔] notifications/Dockerfile"
fi

echo "[→] Creating SSL cert..."
mkdir -p nginx/ssl logs backend/logs
if [ ! -f nginx/ssl/nginx.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/nginx.key \
        -out nginx/ssl/nginx.crt \
        -subj "/C=IN/ST=MH/L=Mumbai/O=GPS/CN=localhost" 2>/dev/null
    echo "[✔] SSL cert created"
fi

echo ""
echo "[✔] STEP 4 COMPLETE — Ready to build"
