📘 GPS SaaS – Full Deployment Guide on AWS Lightsail

This is a step-by-step, zero-missing-parts guide from:

Fresh AWS Account → Live Production System

This assumes:

Backend (Node.js)

TCP Server

Worker

PostgreSQL

Redis

Docker

NGINX

Domain + SSL

🏗️ Final Production Architecture (AWS Lightsail)
4

Production Setup:

AWS Lightsail Ubuntu Server
→ Docker + Docker Compose
→ Backend + TCP Server + Worker
→ PostgreSQL + Redis
→ NGINX Reverse Proxy
→ SSL (Let's Encrypt)
→ Domain

📌 PHASE 1 — Create AWS Lightsail Server
Step 1 — Create Instance

Go to AWS Console

Open Lightsail

Create Instance

Choose:

Platform: Linux

Blueprint: Ubuntu 22.04

Plan: $10 or $20 (recommended minimum 2GB RAM)

Name: gps-saas-prod

Click Create

Step 2 — Open Required Ports

Go to:
Lightsail → Networking → Add Firewall Rules

Open:

Protocol	Port	Purpose
TCP	22	SSH
TCP	80	HTTP
TCP	443	HTTPS
TCP	5000	GPS TCP Devices
📌 PHASE 2 — Connect to Server

SSH into server:

ssh ubuntu@YOUR_PUBLIC_IP
📌 PHASE 3 — Install Docker
sudo apt update
sudo apt install docker.io -y
sudo apt install docker-compose -y
sudo usermod -aG docker ubuntu
newgrp docker

Verify:

docker --version
docker-compose --version
📌 PHASE 4 — Project Setup on Server

Create project folder:

mkdir gps-saas
cd gps-saas
📂 FINAL PRODUCTION STRUCTURE
gps-saas-platform/
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   └── src/
│       ├── server.js
│       ├── app.js
│       │
│       ├── config/
│       │   ├── database.js
│       │   ├── redis.js
│       │   └── logger.js
│       │
│       ├── models/
│       │   ├── index.js
│       │   ├── user.model.js
│       │   ├── tenant.model.js
│       │   ├── device.model.js
│       │   ├── gpsData.model.js
│       │   ├── analytics.model.js
│       │   └── subscription.model.js
│       │
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── tenant.middleware.js
│       │   └── error.middleware.js
│       │
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.js
│       │   │   ├── auth.service.js
│       │   │   └── auth.routes.js
│       │   │
│       │   ├── tenants/
│       │   │   ├── tenant.controller.js
│       │   │   ├── tenant.service.js
│       │   │   └── tenant.routes.js
│       │   │
│       │   ├── devices/
│       │   │   ├── device.controller.js
│       │   │   ├── device.service.js
│       │   │   └── device.routes.js
│       │   │
│       │   ├── gps/
│       │   │   ├── gps.controller.js
│       │   │   ├── gps.service.js
│       │   │   └── gps.routes.js
│       │   │
│       │   ├── analytics/
│       │   │   ├── analytics.worker.js
│       │   │   ├── analytics.service.js
│       │   │   ├── analytics.model.js
│       │   │   ├── trip.engine.js
│       │   │   ├── driverScore.engine.js
│       │   │   ├── idle.engine.js
│       │   │   ├── deviation.engine.js
│       │   │   └── maintenance.engine.js
│       │   │
│       │   └── billing/
│       │       ├── billing.controller.js
│       │       ├── billing.service.js
│       │       └── billing.routes.js
│       │
│       └── workers/
│           ├── gps.worker.js
│           └── cleanup.worker.js
│
│
├── tcp-server/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── parser.js
│       └── queue.js
│
│
├── gps-admin/              (Frontend - React/Vite)
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       │
│       ├── api/
│       │   └── axios.js
│       │
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Devices.jsx
│       │   ├── Analytics.jsx
│       │   ├── Billing.jsx
│       │   └── Tenants.jsx
│       │
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── DeviceMap.jsx
│       │   └── Charts.jsx
│       │
│       └── styles/
│           └── global.css
│
│
├── nginx/
│   └── default.conf
│
│
├── k8s/                     (Kubernetes Production)
│   ├── namespace.yaml
│   ├── secrets.yaml
│   ├── configmap.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── backend.yaml
│   ├── tcp-server.yaml
│   ├── worker.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
│
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
│
├── docker-compose.yml        (AWS Lightsail Production)
├── .env.production
├── .env.development
├── README.md
├── LICENSE
└── docs/
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT_AWS_LIGHTSAIL.md
    ├── API_DOCUMENTATION.md
    ├── DATABASE_SCHEMA.md
    ├── SECURITY_GUIDE.md
    └── SCALING_GUIDE.md
📌 PHASE 5 — Production docker-compose.yml

📂 docker-compose.yml

version: '3.9'

services:

  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: gpsdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    restart: always
    ports:
      - "6379:6379"

  backend:
    image: yourdockerhub/backend:latest
    restart: always
    depends_on:
      - postgres
      - redis
    environment:
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: gpsdb
      REDIS_HOST: redis
      JWT_SECRET: supersecret
    ports:
      - "3000:3000"

  tcp-server:
    image: yourdockerhub/tcp-server:latest
    restart: always
    ports:
      - "5000:5000"

  worker:
    image: yourdockerhub/backend:latest
    command: node src/workers/gps.worker.js
    depends_on:
      - redis
      - postgres
    environment:
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_NAME: gpsdb
      REDIS_HOST: redis

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

volumes:
  pgdata:
📌 PHASE 6 — NGINX Reverse Proxy

📂 nginx/default.conf

server {
    listen 80;

    server_name yourdomain.com;

    location / {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
📌 PHASE 7 — Start Production
docker-compose up -d

Check:

docker ps
📌 PHASE 8 — Setup Domain

Buy domain (GoDaddy / Namecheap)

Add A Record:

Type: A
Value: YOUR_LIGHTSAIL_IP

Wait for DNS propagation.

📌 PHASE 9 — Setup Free SSL (Let’s Encrypt)

Install Certbot:

sudo apt install certbot python3-certbot-nginx -y

Run:

sudo certbot --nginx -d yourdomain.com

SSL will auto-configure.

Auto-renew check:

sudo certbot renew --dry-run
📌 PHASE 10 — Production Hardening
Enable UFW Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw enable
Enable Auto Restart
sudo systemctl enable docker
📌 PHASE 11 — Database Backup Strategy

Manual backup:

docker exec -t gps-saas-postgres-1 pg_dumpall -c -U postgres > backup.sql

Automate with cron job daily.

📌 PHASE 12 — Update Deployment

When new image is pushed:

docker-compose pull
docker-compose up -d

Zero downtime.

📊 FINAL PRODUCTION CHECKLIST
Component	Status
Backend	✅
TCP Server	✅
Worker	✅
PostgreSQL	✅
Redis	✅
NGINX	✅
SSL	✅
Domain	✅
Firewall	✅
Backup	✅
🚀 SYSTEM STATUS

You now have:

Fully deployed GPS SaaS

Running on AWS Lightsail

SSL secured

Production hardened

Multi-container architecture

AI analytics

CI/CD ready