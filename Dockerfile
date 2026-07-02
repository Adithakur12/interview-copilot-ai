FROM node:20-alpine
WORKDIR /app

# better-sqlite3 needs build tools + Python (for native compilation) in alpine
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY server/package.json ./server/package.json
COPY src/package.json ./src/package.json
RUN npm install --omit=dev && npm install --prefix server --omit=dev && npm install --prefix src

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "run", "start"]
