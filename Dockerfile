# backend/Dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

ENV PORT=8080

CMD ["node", "index.mjs"]