# ─────────────────────────────────────────────────────────────
# Stage 1 — build the Vite bundle
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Build-time API base URL. Leave empty to call the API on the same origin
# (the Nginx config below proxies /api and /socket.io to the server container).
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2 — serve the static bundle with Nginx
# ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# SPA-aware config with reverse proxy for the API and WebSocket.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
