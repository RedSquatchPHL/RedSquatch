# ---- deps: install once, cached across builds unless package*.json change ----
FROM node:18-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:18-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked in at build time — Next.js inlines NEXT_PUBLIC_* vars into the client
# bundle, so this must be a build arg, not just a runtime env var.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV DOCKER_BUILD=1
RUN npm run build

# ---- runner ----
FROM node:18-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Coolify's own health-check probe runs curl/wget via `docker exec`, separate
# from the HEALTHCHECK instruction below — without this, the probe fails
# immediately even when the app itself is healthy (confirmed 2026-08-07).
RUN apt-get update && apt-get install -y --no-install-recommends curl wget \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Docker auto-sets HOSTNAME to the container ID; Next.js standalone's
# server.js reads that var to decide its bind address, so without this
# override it can end up unreachable at localhost/127.0.0.1 (confirmed
# 2026-08-07 — app booted fine but the health probe got connection refused).
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
