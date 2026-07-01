FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/package.json
COPY src/package.json ./src/package.json
RUN npm install --omit=dev && npm install --prefix server --omit=dev && npm install --prefix src --omit=dev
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "run", "start"]
