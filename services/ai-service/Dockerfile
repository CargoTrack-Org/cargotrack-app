# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
# npm install (not npm ci) — no package-lock.json committed yet.
# npm ci requires a lock file; npm install generates one.
# Once package-lock.json is committed, this can be changed back to: npm ci
RUN npm install

# Prisma client generation (ai-service reads DB but does NOT run migrations)
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Copy knowledge base JSON catalogs into dist/ explicitly.
# tsc only emits .js files — JSON catalogs must be copied separately.
# Without this, KnowledgeBase.initialize() fails with ENOENT and every
# shipment silently falls back to INTERNATIONAL-GENERIC risk scoring.
RUN mkdir -p dist/knowledge/catalogs
COPY src/knowledge/catalogs/ dist/knowledge/catalogs/

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

# ── Security: non-root user ───────────────────────────────────────────────────
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Application binaries from builder
COPY --from=builder --chown=appuser:appgroup /app/dist        ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma      ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

COPY --chown=appuser:appgroup entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 4002

ENTRYPOINT ["./entrypoint.sh"]
