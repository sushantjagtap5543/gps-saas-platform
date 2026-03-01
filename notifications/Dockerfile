FROM node:20
WORKDIR /app
COPY package.json .
RUN npm install
COPY worker.js .
CMD ["node", "worker.js"]