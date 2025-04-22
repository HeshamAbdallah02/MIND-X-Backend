FROM node:23-alpine

# 1. App directory
WORKDIR /app

# 2. Install dependencies
COPY package*.json ./
RUN npm ci --production

# 3. Copy source
COPY . .

# 4. Build (if you’re using Babel/TS)
# RUN npm run build

# 5. Expose port & start
ENV PORT=5000
EXPOSE 5000
CMD ["npm", "start"]