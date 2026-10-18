# Hello Design

Practice system design with a web workspace and AI evaluations. The application has three services:

- **Web** — Vite and React frontend
- **API** — Fastify API, authentication, and submission endpoints
- **Worker** — BullMQ jobs for AI follow-ups and evaluations

PostgreSQL stores application data and Redis backs the job queue. The services and shared code use a small pnpm workspace; the internal packages contain code used by more than one service.

## Local development

Requirements: Node.js 20+, pnpm 9.15.4, and Docker Compose.

1. Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` to separate random values of at least 32 characters. Do not use the example placeholders in production.
2. Install dependencies and start PostgreSQL and Redis with local-only host ports:

   ```sh
   pnpm install
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
   ```

3. Generate the database client, apply migrations, and start the three services:

   ```sh
   pnpm db:generate
   pnpm db:migrate
   pnpm dev
   ```

The web app runs at `http://localhost:3000` and the API at `http://localhost:3001`.
Add your own AI provider key in Settings to run evaluations.

The `/demo` page shows a prewritten sample evaluation without an account or provider key. The seed
library contains 26 system-design questions with reference solutions; a reference solution becomes
available to its owner after the evaluation completes.

Signed-in users can publish completed answers to the community. Publishing includes the answer,
diagram, question title, account name, and publication date. Evaluation feedback and scores are
included only when the publisher opts in. Community members can comment, vote, and report content.

To grant the moderator role to an existing account after applying migrations, run:

```sh
pnpm --filter @sysdesign/db admin:set -- moderator@example.com
```

## Public launch blockers

The Terms and Privacy pages are beta drafts. Do not announce a broad public launch until the
operator supplies and publishes all four business-specific details below:

- Legal business or operator name
- A monitored privacy and legal contact route
- Governing jurisdiction
- Retention periods for account, submission, guest, and moderation data

These values are undecided and intentionally remain marked as launch blockers in the legal page.

## Run the full stack with Docker

Set strong, separate `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, a verified Resend
`RESEND_API_KEY`/`AUTH_EMAIL_FROM`, and the public `WEB_URL` and `BETTER_AUTH_URL`
in `.env`. Leave `VITE_API_URL` blank so the browser uses the same-origin nginx
proxy. Then run:

```sh
docker compose up --build
```

Compose applies migrations in a one-off `migrate` service before starting the API.
Postgres and Redis are private to the Compose network; the local override publishes
their ports only on loopback for development. The web container serves the frontend
and proxies `/api` and WebSocket traffic to the API on the same origin.

The API accepts direct OpenAI keys and OpenRouter endpoints at `https://openrouter.ai/api/v1`. Other custom hosts are rejected to prevent server-side request forgery. Set `TRUST_PROXY_HOPS` to the actual proxy count; Compose uses one nginx hop, while direct local Node/Vite development uses `0`.

New encrypted provider keys use a version prefix. To rotate keys, configure `ENCRYPTION_KEY_V2`, set `ENCRYPTION_KEY_VERSION=v2`, then run `pnpm --filter @sysdesign/db db:rotate-keys` while both keys remain configured. The command safely skips records already on v2; after it completes, keep the v1 secret in the deployment history for recovery, then remove it from the active environment.

## Workspace commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start web, API, and worker in watch mode |
| `pnpm build` | Build the three services |
| `pnpm typecheck` | Type-check the three services |
| `pnpm lint` | Lint the three services |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create/apply a development migration |
| `pnpm db:deploy` | Apply committed migrations |
| `pnpm db:seed` | Seed the question library |
