# TURON Production Architecture

This project is not local-first in production.

## Runtime Topology

- Telegram Mini App opens the Vercel frontend.
- Vercel frontend calls the AWS backend through `https://turonkafe.duckdns.org`.
- AWS terminates HTTPS through Nginx/Caddy/Certbot and proxies to the Node backend on `127.0.0.1:3000`.
- Node/Fastify backend connects to Supabase Postgres through Prisma.
- Supabase stores the database, and optionally public storage assets.
- BullMQ courier assignment requires Redis reachable from AWS.
- Telegram bot runs from the backend runtime, controlled by `RUN_TELEGRAM_BOT`.

## URL Contract

Frontend production API:

```txt
VITE_API_URL=https://turonkafe.duckdns.org
```

Backend public URL:

```txt
https://turonkafe.duckdns.org
```

Mini App URL opened by Telegram:

```txt
WEB_APP_URL=https://turon-miniapp.vercel.app
```

The frontend must not use `localhost` in production. `localhost` is only allowed by Vite during local development.

## AWS Backend

The backend process listens internally:

```txt
PORT=3000
API_HOST=0.0.0.0
```

PM2 runs:

```bash
cd /home/ubuntu/TURON
pnpm --filter @turon/backend start:api
```

Health check:

```bash
curl -i http://127.0.0.1:3000/health
curl -i https://turonkafe.duckdns.org/health
```

Both must return JSON with `status: "ok"`.

## Vercel Frontend

Vercel must have these environment variables:

```txt
VITE_API_URL=https://turonkafe.duckdns.org
VITE_TELEGRAM_BOT_NAME=turonkafebot
VITE_MAPS_PROVIDER=yandex
VITE_MAP_API_KEY=...
VITE_MAP_LANGUAGE=uz_UZ
```

After changing any `VITE_*` variable, redeploy Vercel. These values are compiled into the frontend bundle.

## Supabase

Backend `.env` on AWS must use Supabase URLs:

```txt
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?...sslmode=require
DIRECT_URL=postgresql://...db...supabase.co:5432/postgres?sslmode=require
```

`DATABASE_URL` is runtime pooler. `DIRECT_URL` is for migrations.

## Redis / BullMQ

`bullmq` and `ioredis` are real runtime dependencies. They must be installed on AWS.

If `REDIS_URL` is configured, Redis must be reachable from AWS:

```bash
pnpm --filter @turon/backend exec node -e "await import('bullmq'); await import('ioredis'); console.log('queue deps ok')"
```

## CORS

Backend CORS must allow the Vercel production origin:

```txt
CORS_ORIGIN=https://turon-miniapp.vercel.app
```

If a custom Vercel domain is added later, append it comma-separated.

## Deploy Order

Backend:

```bash
cd /home/ubuntu/TURON
git pull origin main
pnpm install
pnpm --filter @turon/backend build
pm2 restart turon-backend --update-env
curl -fsS http://127.0.0.1:3000/health
curl -fsS https://turonkafe.duckdns.org/health
```

Frontend:

1. Confirm Vercel env variables.
2. Redeploy production.
3. Open Telegram Mini App from the bot.

## Secret Rule

Never commit real `.env`, `.env.production`, bot tokens, Supabase passwords, JWT secrets, or private API keys. Public repo secrets must be rotated immediately.
