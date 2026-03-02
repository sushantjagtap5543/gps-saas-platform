#!/bin/bash
# STEP 6: Set admin password and show deployment info
cd /home/ubuntu/gps-saas-platform

if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    DC="docker compose"
fi

echo "[→] Setting admin password..."
sleep 2

$DC exec -T backend node - << 'JSEOF'
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, { logging: false });
(async () => {
  try {
    await seq.authenticate();
    const hash = await bcrypt.hash('Admin@123!', 12);
    const [, meta] = await seq.query(
      "UPDATE users SET password=:h WHERE email IN ('admin@gps.local','superadmin@gps.local')",
      { replacements: { h: hash } }
    );
    console.log('[✔] Admin password set to: Admin@123!');
    await seq.close();
  } catch(e) {
    console.log('[!] Note:', e.message);
    process.exit(0);
  }
})();
JSEOF

echo ""
echo "[→] Final service status:"
$DC ps

echo ""
PUBLIC_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅  GPS SaaS Platform — SETUP COMPLETE!            ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
printf "║   🌐 Portal  → http://%-29s║\n" "${PUBLIC_IP}"
printf "║   🔧 Admin   → http://%-29s║\n" "${PUBLIC_IP}/admin"
printf "║   📡 API     → http://%-29s║\n" "${PUBLIC_IP}/api"
printf "║   🛰  TCP     → %-34s║\n" "${PUBLIC_IP}:5000"
echo "║                                                      ║"
echo "║   👤 admin@gps.local  /  Admin@123!                  ║"
echo "║                                                      ║"
echo "║   📋 cat DEPLOYMENT_INFO.txt   (all passwords)       ║"
echo "║   📊 docker compose logs -f    (live logs)           ║"
echo "╚══════════════════════════════════════════════════════╝"
