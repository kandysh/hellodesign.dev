# Hello Design

Practice system design with a web workspace and AI evaluations. The application has three services:

- **Web** — Vite and React frontend
- **API** — Fastify API, authentication, and submission endpoints
- **Worker** — BullMQ jobs for AI follow-ups and evaluations

PostgreSQL stores application data and Redis backs the job queue. The services and shared code use a small pnpm workspace; the internal packages contain code used by more than one service.

## Local development

Requirements: Node.js 20+, pnpm 9.15.4, and Docker Compose.

1. Copy `.env.example` to `.env` and set `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` to unique random values.
2. Install dependencies and start PostgreSQL and Redis:

   ```sh
   pnpm install
   docker compose up -d postgres redis
   ```

3. Generate the database client, apply migrations, and start the three services:

   ```sh
   pnpm db:generate
   pnpm db:migrate
   pnpm dev
   ```

The web app runs at `http://localhost:3000` and the API at `http://localhost:3001`.
Add your own AI provider key in Settings to run evaluations.

## Run the full stack with Docker

Set `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, and `VITE_API_URL` in `.env`, then run:

```sh
docker compose up --build
```

For a remotely accessed deployment, set `VITE_API_URL` to the API's public HTTPS URL before building the web image. It is embedded in the frontend bundle at build time.

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
