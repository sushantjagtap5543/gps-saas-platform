FROM node:20-alpine

# Install curl for healthcheck and wget as fallback
RUN apk add --no-cache curl wget

WORKDIR /app

COPY package*.json ./
RUN npm install --production --silent

COPY . .

# Create required directories
RUN mkdir -p logs invoices

EXPOSE 3000

# Longer start-period: DB + model sync can take 30-60s on first boot
HEALTHCHECK --interval=20s --timeout=10s --start-period=90s --retries=5 \
  CMD wget -qO- http://localhost:3000/health | grep -q "OK\|DEGRADED" || exit 1

CMD ["node", "src/server.js"]
