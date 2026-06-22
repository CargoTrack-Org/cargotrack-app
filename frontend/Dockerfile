# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Node.js builder produces the optimised static bundle.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# npm install (not npm ci) — no package-lock.json committed yet.
# Once package-lock.json is committed, change back to: npm ci
RUN npm install

COPY . .

# VITE_API_BASE_URL is baked into the JS bundle at build time.
# /api routes are proxied by nginx at runtime using $CORE_SERVICE_URL.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# nginx:alpine is the minimal web server image (~25 MB compressed).
# We run nginx as a non-root user by using the official unprivileged port pattern.
FROM nginx:1.27-alpine AS runtime

# ── Security: patch CVE-2026-31789 ───────────────────────────────────────────
# nginx:1.27-alpine ships with libcrypto3/libssl3 3.3.3-r0 which has a
# CRITICAL heap buffer overflow (CVE-2026-31789). Upgrade to patched 3.3.7-r0.
# Pinned to the two affected packages only to minimise layer size increase.
RUN apk upgrade --no-cache libcrypto3 libssl3

# ── Security: non-root nginx PID file ────────────────────────────────────────
# nginx writes its master process PID to /run/nginx.pid by default.
# /run is root-owned; this container runs as nginx (UID 101) — no write access.
# Redirect the PID file to /tmp which is writable by all users.
RUN sed -i 's|pid  /run/nginx.pid;|pid  /tmp/nginx.pid;|' /etc/nginx/nginx.conf

# Copy built static assets from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy nginx config template (envsubst substitutes service URLs at startup)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/templates/nginx.conf.template

# Drop privileges
USER nginx

EXPOSE 8080

# At container start:
# 1. envsubst substitutes $CORE_SERVICE_URL and $DOCUMENT_SERVICE_URL in the nginx config template
# 2. nginx starts serving on port 8080
CMD ["sh", "-c", \
  "envsubst '$CORE_SERVICE_URL $DOCUMENT_SERVICE_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
   nginx -g 'daemon off;'"]
