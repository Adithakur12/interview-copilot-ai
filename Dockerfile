FROM node:20-alpine
WORKDIR /app

# better-sqlite3 still needed for dev fallback; add build deps
RUN apk add --no-cache python3 make g++

# Copy package files first for layer caching
COPY package.json ./
COPY server/package.json ./server/package.json
COPY src/package.json ./src/package.json
RUN npm install --omit=dev && npm install --prefix server --omit=dev && npm install --prefix src

# Copy source and build frontend
COPY . .
RUN npm run build

# Render (and all cloud platforms) dynamically inject PORT.
# No EXPOSE needed — it's metadata only and has no effect.
CMD ["npm", "run", "start"]
