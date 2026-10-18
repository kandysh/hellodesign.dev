# Hello Design launch-readiness checklist

Updated October 19, 2026 against the October 18 full code review.

## Status key

- `[x]` Implemented and supported by local verification.
- `[~]` Implementation is present; CI, database-backed, browser, or production-like verification remains.
- `[ ]` Work or a launch decision remains open.

This checklist tracks implementation separately from runtime proof. The project is **not launch-ready** while any public-launch blocker or required runtime gate below remains open.

## Critical findings

| Item | Status | Done | Still needed |
| --- | --- | --- | --- |
| C1 — rubric weights and score bounds | `[~]` | Seed data is normalized and scoring normalizes defensively; unit tests cover normalization and every seeded rubric. | Run the PostgreSQL seed/content integration test in CI and confirm migrated production data is re-seeded or migrated. |
| C2 — dangling and parallel tool calls | `[x]` | Every unanswered tool call is closed; reply and risk tools handle parallel calls. Mock-model tests cover immediate satisfaction, parallel calls, and delayed replies. | The full API/worker E2E test still needs to run with its PostgreSQL and Redis services. |
| C3 — validate model scores | `[x]` | Scores are bounded and must contain each rubric dimension exactly once; malformed or incomplete output gets one correction attempt and then fails clearly. | The live service E2E path is still awaiting CI. |
| C4 — SSRF through provider URL | `[x]` | Provider endpoints are restricted to approved public hosts; redirects are rejected and model requests have a timeout. | Recheck this policy if custom provider URLs are introduced. |
| C5 — unsafe secret defaults and key rotation | `[~]` | Production services reject missing or weak secrets; encryption keys are separate and versioned, and a rotation command is present. Compose keeps data services private by default. | Run the documented key-rotation procedure against a production-like database and confirm deployment secrets are configured. |
| C6 — deep worker slot starvation and reply race | `[ ]` | The short-term reply race mitigation, configurable concurrency, and admission cap are implemented. The selected long-term design is a versioned PostgreSQL graph checkpoint with a transactional continuation outbox; the draft spec now defines per-round compare-and-set handling, dispatcher/worker leases, retry idempotency, and event deduplication. | Review and approve the written spec, then write and review the implementation plan before coding. Implement the checkpoint/outbox flow and verify reply/timeout races, crash recovery, deletion cleanup, and the 20-concurrent deep-evaluation load case. |
| C7 — rate limits and abuse controls | `[x]` | Redis-backed limits cover evaluation, key validation, and community writes; identities use account/session/IP and trusted proxy hops are configurable. Focused tests pass. | Confirm the deployed proxy-hop count and tune limits from real traffic. |
| C8 — provider-specific model defaults | `[x]` | Shared defaults select tool-capable models for OpenAI and OpenRouter; the UI derives the provider from the saved key. Unit tests cover the defaults. | Validate provider/model availability with production keys. |

## High-priority findings

| Item | Status | Done | Still needed |
| --- | --- | --- | --- |
| H1 — event and database write volume | `[~]` | Reasoning chunks are buffered; event publishing checks submission existence periodically; message writes are grouped by turn. | Measure a real evaluation’s query and row volume before launch. |
| H2 — retry idempotency | `[~]` | Agent messages upsert by submission and sequence; retry startup clears the event buffer. | Exercise a real worker retry with PostgreSQL and Redis in CI. |
| H3 — WebSocket errors, ownership and origin | `[x]` | Async handler errors are caught and cleaned up; origin, ownership, reply state, and reply length are checked. Focused origin tests pass. | The full E2E WebSocket path remains service-dependent. |
| H4 — API error display | `[x]` | A shared typed API client consistently surfaces the API `error` field and includes credentials. Client tests pass. | None identified. |
| H5 — client WebSocket lifecycle | `[~]` | The submission hook reconnects with backoff and polls submission state/messages after disconnects. | Verify reconnect and recovery in a browser against a running API/worker. |
| H6 — input limits and schemas | `[x]` | API body, answer, diagram, and community inputs have explicit limits and schemas. Focused parser/schema tests pass. | Confirm limits fit real user submissions after launch traffic begins. |
| H7 — verification and password reset | `[~]` | Email verification and password-reset flows use the Resend provider and have dedicated UI routes. | Configure a verified production sender and exercise both email flows end to end. |
| H8 — retention, indexes and query costs | `[~]` | Guest cleanup is scheduled for 30 days; owner indexes, aggregate stats, cursor pagination, and deletion cascades are present. | Run cleanup, pagination, and cascade integration checks on PostgreSQL. Set final retention periods in the public policy. |
| H9 — containers and deployment | `[~]` | API/worker build JavaScript bundles and run as non-root; migrations use a one-off Compose service; readiness checks cover Postgres/Redis; nginx provides same-origin API/WebSocket proxying and security headers. | Build all three images and smoke-test the Compose stack in Docker or CI. Review deployment-specific secrets and proxy configuration. |
| H10 — stale generated Prisma client | `[~]` | Generated client output is ignored and removed from version control; CI generates it before checks. The unsafe casts were removed. | Confirm generation and typechecks in remote CI. |
| H11 — tests and CI | `[~]` | GitHub Actions configures PostgreSQL and Redis, applies migrations/seeds, and runs tests, checks, builds, and Docker builds. | The workflow has not yet completed on GitHub; remote CI could not be queried from this environment. |

## Medium-priority findings

- `[x]` Stats use UTC consistently; AI requests set timeouts, token limits, and retry limits; risk flags are capped.
- `[x]` Community responses select public fields explicitly; admins cannot edit author text; search has a trigram index migration.
- `[x]` System prompts are not stored as message text; prompt version metadata is stored; trace events expose tool names without raw inputs.
- `[x]` Worker logging is structured; API and nginx set security headers; dependency/config cleanup is included.
- `[x]` The interview URL redirects to the question workspace; social metadata and a sitemap are present.
- `[~]` The app stylesheet directly loads Geist and Geist Mono; the production bundle also emits Assistant font assets, so confirm the final number of fonts loaded before closing the font-loading item.
- `[x]` The large question workspace now uses `useDraft` and `useSubmissionStream`; API calls use a shared client for normal requests.
- `[ ]` Styling still mixes utility classes, CSS variables, and inline styles. Consolidating the styling system remains a quality task from P2.
- `[~]` Frontend reconnect, server-derived key state, and route flows compile, but still need browser-level verification.

## Public-launch prerequisites

- `[x]` A no-key `/demo` page is available.
- `[~]` The seed catalog defines 26 questions with reference solutions; the PostgreSQL catalog integration test has not run locally.
- `[~]` Guest-to-account claiming, guest-data clearing, and account deletion are implemented; the PostgreSQL cascade integration test remains unrun.
- `[ ]` Supply and publish the legal business/operator name.
- `[ ]` Supply a monitored privacy/legal contact route.
- `[ ]` Choose and publish the governing jurisdiction.
- `[ ]` Choose and publish retention periods for accounts, submissions, guest data, and moderation records.

The legal details above were answered as **undecided** and remain launch blockers in the public legal page and README.

## Verification recorded October 19, 2026

- API, worker, and web TypeScript checks passed.
- Biome checked 168 files with no issues.
- Direct test run: 37 total, 33 passed, 0 failed, 4 skipped. The skipped tests require PostgreSQL/Redis and include the full API/worker E2E test.
- API, worker, and web production builds passed. The web build reports large lazy-loaded chunks; the build still exits successfully.
- Docker image builds and the remote GitHub Actions run remain unverified. The local environment has no Docker CLI, and the remote workflow could not be queried.
- The test suite was run directly through the installed `tsx` binary because local pnpm is 11.25.0 while the repository pins 9.15.4; CI uses the pinned version.

## Next steps to close the goal

1. Run the configured GitHub Actions workflow and resolve any failures, especially the PostgreSQL/Redis integration and end-to-end tests.
2. Review the C6 design spec at `docs/superpowers/specs/2026-10-19-c6-nonblocking-followups-design.md`; after approval, plan and implement the PostgreSQL checkpoint plus continuation outbox, then run the 20-concurrent deep-evaluation load test.
3. Build and smoke-test the API, worker, and web Docker images in CI or an environment with Docker.
4. Configure production email, database, Redis, encryption/auth secrets, public URLs, and trusted proxy hops; run key rotation and account/email flows against that configuration.
5. Obtain the four legal-policy details above and publish the finalized Terms and Privacy pages.
