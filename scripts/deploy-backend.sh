#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[deploy] Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "[deploy] Verifying backend runtime dependencies..."
pnpm --filter @turon/backend exec node -e "await import('bullmq'); await import('ioredis'); console.log('runtime deps ok')"

echo "[deploy] Building backend..."
pnpm --filter @turon/backend build

echo "[deploy] Restarting PM2 process..."
pm2 restart turon-backend --update-env

echo "[deploy] Waiting for API health..."
sleep 3
curl -fsS http://127.0.0.1:3000/health

echo
echo "[deploy] Backend deploy completed."
