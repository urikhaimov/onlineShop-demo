# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN NX_DAEMON=false npx nx build api --configuration=production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# NxAppWebpackPlugin generates a trimmed package.json — install prod deps from it
COPY --from=builder /app/dist/apps/api/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist/apps/api .

EXPOSE 3000
# Railway injects PORT; APP_PORT is what the NestJS app reads
CMD ["node", "main.js"]
