FROM node:20-alpine

RUN apk add --no-cache curl wget

WORKDIR /app

COPY package*.json ./
RUN npm install --production --silent

COPY . .

# Create required runtime directories
RUN mkdir -p logs invoices

EXPOSE 5024

HEALTHCHECK --interval=20s --timeout=10s --start-period=90s --retries=5 \
  CMD wget -qO- http://localhost:5024/health | grep -q '"status"' || exit 1

CMD ["node", "src/server.js"]
