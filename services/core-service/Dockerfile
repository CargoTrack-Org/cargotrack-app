# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Full Node.js image with all build tools. Produces the compiled dist/ and
# Prisma-generated client. Nothing from this stage leaks into the runtime image.
FROM node:20-alpine AS builder

# Prisma schema engine requires OpenSSL (used at generate time)
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first (layer-cached when package.json unchanged)
COPY package*.json ./
# npm install (not npm ci) — no package-lock.json committed yet.
# Once package-lock.json is committed, change back to: npm ci
RUN npm install

# Generate Prisma client for the target architecture
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Minimal Alpine image — no build tools, no source code, no dev dependencies.
# Only the compiled output, production node_modules, Prisma binaries, and entrypoint.
FROM node:20-alpine AS runtime

# OpenSSL required by Prisma query engine at runtime
RUN apk add --no-cache openssl

# ── Security: non-root user ───────────────────────────────────────────────────
# Runs the application as an unprivileged user. Satisfies CIS Benchmark L1.
# UID 1001 is used so it never conflicts with host uid 1000.
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy compiled application from builder
COPY --from=builder --chown=appuser:appgroup /app/dist        ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma      ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Copy and permission the entrypoint script
COPY --chown=appuser:appgroup entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Drop privileges — all subsequent instructions and the container process
# run as appuser (UID 1001), never as root.
USER appuser

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
