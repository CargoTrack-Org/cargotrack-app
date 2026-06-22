# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
# npm install (not npm ci) — no package-lock.json committed yet.
# Once package-lock.json is committed, change back to: npm ci
RUN npm install

# document-service reads DB via Prisma but does NOT run migrations
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

# ── Security: non-root user ───────────────────────────────────────────────────
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/dist        ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma      ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

COPY --chown=appuser:appgroup entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 4001

ENTRYPOINT ["./entrypoint.sh"]
