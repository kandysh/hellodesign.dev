# Deploying Hello Design to Railway

This guide walks through deploying all five services on [Railway](https://railway.app).

---

## Overview

| Service | Type | Dockerfile |
|---------|------|------------|
| `postgres` | Railway plugin | — |
| `redis` | Railway plugin | — |
| `api` | Node.js (Hono) | `Dockerfile.api` |
| `worker` | Node.js (BullMQ) | `Dockerfile.worker` |
| `web` | Nginx (Vite SPA) | `Dockerfile.web` |

---

## Prerequisites

- Railway account + CLI: `npm install -g @railway/cli && railway login`
- Repo pushed to GitHub (Railway deploys from Git)
- An OpenAI API key

---

## Step 1 — Create a new Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select `hellodesign.dev`
3. **Do not** auto-deploy yet; click **Empty project** instead (you'll add services manually)

---

## Step 2 — Add managed infrastructure

### PostgreSQL

1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway auto-sets `DATABASE_URL` as a shared variable — note the value

### Redis

1. Click **+ New** → **Database** → **Add Redis**
2. Railway auto-sets `REDIS_URL` — note the value

---

## Step 3 — Deploy the API service

1. Click **+ New** → **GitHub Repo** → select your repo
2. In service settings:
   - **Root Directory**: `/` (leave blank — repo root)
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.api`
3. **Generate a domain** (e.g. `api-production.up.railway.app`) — you'll need it for the web service
4. Add the following **environment variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (link to Postgres plugin variable) |
| `REDIS_URL` | (link to Redis plugin variable) |
| `BETTER_AUTH_SECRET` | Random 32+ char string (e.g. `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://<your-api-domain>.railway.app` |
| `WEB_URL` | `https://<your-web-domain>.railway.app` (set after step 5) |
| `ENCRYPTION_KEY` | Random 32+ char string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `NODE_ENV` | `production` |

> **Tip:** Use Railway's **"Link variable"** feature to reference `DATABASE_URL` and `REDIS_URL` directly from the plugin services.

5. Click **Deploy**. The first deploy runs DB migrations automatically.

---

## Step 4 — Deploy the Worker service

1. Click **+ New** → **GitHub Repo** → same repo
2. Service settings:
   - **Root Directory**: `/`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.worker`
3. Environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (link to Postgres plugin) |
| `REDIS_URL` | (link to Redis plugin) |
| `OPENAI_API_KEY` | Your OpenAI key |
| `NODE_ENV` | `production` |

4. Click **Deploy**

---

## Step 5 — Deploy the Web service

`VITE_API_URL` is **baked into the JavaScript bundle at build time** — it must be set as a Docker **build argument**, not a runtime env var.

1. Click **+ New** → **GitHub Repo** → same repo
2. Service settings:
   - **Root Directory**: `/`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.web`
3. Under **Build Arguments** (not Environment Variables):

| Build Arg | Value |
|-----------|-------|
| `VITE_API_URL` | `https://<your-api-domain>.railway.app` |

4. **Generate a domain** for the web service
5. Go back to the **api service** → update `WEB_URL` to the web domain → redeploy
6. Click **Deploy**

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

## Environment Variable Reference

### API service

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_SECRET` | Session signing secret (keep secret) |
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

### Web service (build arguments)

| Build Arg | Description |
|-----------|-------------|
| `VITE_API_URL` | Public URL of the API service |

---

## Re-deploying after code changes

Railway auto-deploys on `git push` to your connected branch. No manual steps needed after initial setup.

To trigger a manual redeploy: Railway UI → service → **Redeploy**.

---

## Generating secrets

```bash
# BETTER_AUTH_SECRET and ENCRYPTION_KEY
openssl rand -base64 32
```
