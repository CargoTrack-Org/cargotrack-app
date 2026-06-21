#!/bin/sh
set -e

# Build DATABASE_URL from individual parts if not already set.
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${DATABASE_HOST:-localhost}"
  DB_PORT="${DATABASE_PORT:-5432}"
  DB_NAME="${DATABASE_NAME:-cargotrack}"
  DB_USER="${DATABASE_USER:-cargotrack}"
  DB_PASS="${DATABASE_PASSWORD:-cargotrack123}"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  export DATABASE_URL
  echo "[core-service] DATABASE_URL constructed (host: ${DB_HOST}:${DB_PORT})"
fi

# Core service is the schema owner — it runs all migrations.
echo "[core-service] Running Prisma migrations..."
npx prisma migrate deploy

echo "[core-service] Starting..."
node dist/index.js
