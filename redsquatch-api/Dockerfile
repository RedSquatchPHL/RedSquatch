FROM node:18-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Coolify's own health-check probe runs curl/wget via `docker exec`, separate
# from the HEALTHCHECK instruction below — without this, the probe fails
# immediately even when the app itself is healthy (confirmed 2026-08-07).
# uploads/ holds real user-uploaded files (Demand Form attachments) — must be
# mounted as a persistent volume in Coolify (map to the existing host path so
# current files carry over), not left as image-baked/ephemeral storage.
RUN apt-get update && apt-get install -y --no-install-recommends curl wget \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p uploads \
  && groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m apiuser \
  && chown -R apiuser:nodejs /app
USER apiuser

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "index.js"]
