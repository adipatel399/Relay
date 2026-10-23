FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY web ./web
ENV NODE_ENV=production RELAY_HOST=0.0.0.0 RELAY_PORT=4320
RUN mkdir .relay && chown -R node:node /app
USER node
VOLUME /app/.relay
EXPOSE 4320
CMD ["node","server/index.js"]
