# ─────────────────────────────────────────────────────────────
# Attendance Management System — API container
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production dependencies for a slim runtime image.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Run as the non-root `node` user that ships with the base image.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER node

EXPOSE 5000

# Container-level health check hitting the API's /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
