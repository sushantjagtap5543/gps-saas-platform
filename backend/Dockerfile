FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p logs invoices

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
