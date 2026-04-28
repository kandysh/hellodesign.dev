# Deploying Hello Design to Railway

This guide walks through deploying all five services on [Railway](https://railway.app) using **Railpack** (no Dockerfiles needed).

---

## Overview

| Service | Type | Config file |
|---------|------|-------------|
| `postgres` | Railway plugin | — |
| `redis` | Railway plugin | — |
| `api` | Node.js (Hono) | `apps/api/railway.toml` |
| `worker` | Node.js (BullMQ) | `apps/worker/railway.toml` |
| `web` | Vite SPA | `apps/web/railway.toml` |

Each service has a `railway.toml` that tells Railway exactly how to build and start it. **Push to GitHub → Railway auto-deploys. No manual builder config required.**

---

## Step 1 — Import the monorepo

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select `hellodesign.dev`
3. Railway auto-detects it as a pnpm monorepo and stages services — **confirm and create the project**

---

## Step 2 — Add managed infrastructure

### PostgreSQL
1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway auto-creates `DATABASE_URL` — reference it in service variables

### Redis
1. Click **+ New** → **Database** → **Add Redis**
2. Railway auto-creates `REDIS_URL` — reference it in service variables

---

## Step 3 — Configure the API service

1. Open the `api` service → **Settings**
2. Set **Config file path**: `/apps/api/railway.toml`
3. Set **Root directory**: `/` (repo root — required for pnpm workspace)
4. **Generate a domain** (you'll need it for the web service)
5. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (link from Postgres plugin) |
| `REDIS_URL` | (link from Redis plugin) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://<your-api-domain>.railway.app` |
| `WEB_URL` | `https://<your-web-domain>.railway.app` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | Your OpenAI key |
| `NODE_ENV` | `production` |

6. **Deploy** — DB migrations run automatically via `preDeployCommand`

---

## Step 4 — Configure the Worker service

1. Open the `worker` service → **Settings**
2. Set **Config file path**: `/apps/worker/railway.toml`
3. Set **Root directory**: `/`
4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (link from Postgres plugin) |
| `REDIS_URL` | (link from Redis plugin) |
| `OPENAI_API_KEY` | Your OpenAI key |
| `NODE_ENV` | `production` |

5. **Deploy**

---

## Step 5 — Configure the Web service

> `VITE_API_URL` is baked into the JS bundle at build time — set it as a **regular service variable** (Railpack makes all env vars available during build).

1. Open the `web` service → **Settings**
2. Set **Config file path**: `/apps/web/railway.toml`
3. Set **Root directory**: `/`
4. **Generate a domain** for the web service
5. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://<your-api-domain>.railway.app` |
| `NODE_ENV` | `production` |

6. Go back to the **api service** → set `WEB_URL` to the web domain → redeploy
7. **Deploy**

---

## Step 6 — Verify

```bash
# API health check
curl https://<api-domain>.railway.app/health
# → {"ok":true}

# Open the web app
open https://<web-domain>.railway.app
```

---

## Auto-deploy on push

Railway auto-deploys each service when relevant files change, thanks to `watchPatterns` in each `railway.toml`. A change in `apps/api/**` only triggers the API rebuild — not worker or web.

---

## Environment Variable Reference

### API service

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `BETTER_AUTH_URL` | Full URL of the API service (for OAuth callbacks) |
| `WEB_URL` | Full URL of the web service (CORS allow-origin) |
| `ENCRYPTION_KEY` | Key used to encrypt stored API keys |
| `OPENAI_API_KEY` | OpenAI key for AI evaluation agents |
| `GOOGLE_CLIENT_ID` | _(optional)_ Google OAuth |
| `GOOGLE_CLIENT_SECRET` | _(optional)_ Google OAuth |
| `GITHUB_CLIENT_ID` | _(optional)_ GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | _(optional)_ GitHub OAuth |
| `NODE_ENV` | `production` |
| `PORT` | Injected by Railway automatically |

### Worker service

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI key for AI evaluation agents |
| `NODE_ENV` | `production` |

### Web service

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public URL of the API service (baked in at build time) |
| `NODE_ENV` | `production` |

---

## Generating secrets

```bash
# BETTER_AUTH_SECRET and ENCRYPTION_KEY
openssl rand -base64 32
```

