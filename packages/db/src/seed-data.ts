import type { RubricConfig } from "@sysdesign/shared"
import { DEFAULT_RUBRIC } from "@sysdesign/shared"

interface QuestionSeed {
  title: string
  prompt: string
  difficulty: "EASY" | "MEDIUM" | "HARD"
  category: string
  estimatedMins: number
  hints: string[]
  coverageChecklist: string[]
  rubric: RubricConfig
  referenceSolution?: string
}

const question = (
  title: string,
  prompt: string,
  difficulty: QuestionSeed["difficulty"],
  category: string,
  estimatedMins: number,
  hints: string[],
  coverageChecklist: string[],
  referenceSolution: string,
): QuestionSeed => ({
  title,
  prompt,
  difficulty,
  category,
  estimatedMins,
  hints,
  coverageChecklist,
  rubric: DEFAULT_RUBRIC,
  referenceSolution,
})

const originalQuestions: QuestionSeed[] = [
  {
    title: "Design a URL Shortener",
    prompt: `Design a scalable URL shortening service like bit.ly or TinyURL.

Your system should support:
- Shortening long URLs to 7-character aliases
- Redirecting short URLs to originals with < 10ms latency
- 100M new URLs per day, 10B redirects per day
- Custom aliases (optional)
- Analytics (click counts, referrers)

Discuss your data model, API design, storage choices, caching strategy, and how you'd handle the scale requirements.`,
    difficulty: "MEDIUM" as const,
    category: "distributed-systems",
    estimatedMins: 45,
    hints: [
      "Think about the encoding scheme for short codes",
      "Consider read vs write ratio (heavy read)",
      "How would you handle cache invalidation?",
      "What happens when the same long URL is submitted twice?",
    ],
    coverageChecklist: [
      "Short code generation algorithm",
      "Database schema (URL mappings)",
      "Caching layer for redirects",
      "API design (shorten + redirect endpoints)",
      "Scale estimate (storage, QPS)",
      "Handling collisions in short codes",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "caching"
          ? { ...d, weight: 0.2 }
          : d.id === "db_design"
            ? { ...d, weight: 0.2 }
            : d.id === "scalability"
              ? { ...d, weight: 0.15 }
              : d.id === "trade_offs"
                ? { ...d, weight: 0.1 }
                : d,
      ),
    },
  },
  {
    title: "Design Twitter's News Feed",
    prompt: `Design the home timeline / news feed for a Twitter-like social platform.

Requirements:
- 300M active users, each following up to 1000 accounts
- Timeline shows tweets from followed users, reverse chronological
- Tweets are posted at 5,000/second
- Timeline reads at 300,000/second
- Media attachments (images, videos)

Cover: data model, fan-out strategy (push vs pull), caching, storage for media, and how to handle celebrity accounts with millions of followers.`,
    difficulty: "HARD" as const,
    category: "distributed-systems",
    estimatedMins: 60,
    hints: [
      "Fan-out on write vs fan-out on read — what are the trade-offs?",
      "Celebrity problem: users with 10M+ followers",
      "Pre-computed timelines vs real-time assembly",
      "How does media storage differ from tweet storage?",
    ],
    coverageChecklist: [
      "Fan-out strategy (push/pull/hybrid)",
      "Timeline cache design",
      "Celebrity/high-follower-count handling",
      "Media storage (CDN, blob storage)",
      "Data model (tweets, follows, timeline)",
      "Write amplification trade-offs",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "scalability"
          ? { ...d, weight: 0.25 }
          : d.id === "caching"
            ? { ...d, weight: 0.2 }
            : d.id === "trade_offs"
              ? { ...d, weight: 0.15 }
              : d,
      ),
    },
  },
  {
    title: "Design a Rate Limiter",
    prompt: `Design a distributed rate limiter that can be used as a middleware layer for any API service.

Requirements:
- Support multiple rate limiting algorithms (token bucket, sliding window)
- Work across multiple API server instances (distributed)
- Per-user and per-IP limiting
- 1M requests/second across the system
- Sub-millisecond latency for the check
- Allow burst traffic within limits

Discuss data storage, consistency guarantees, the algorithms you'd implement, and how to handle edge cases like clock skew.`,
    difficulty: "MEDIUM" as const,
    category: "distributed-systems",
    estimatedMins: 40,
    hints: [
      "Redis vs in-memory — what are the trade-offs?",
      "Token bucket vs sliding window log vs fixed window",
      "Atomic operations to avoid race conditions",
      "What happens when Redis is down?",
    ],
    coverageChecklist: [
      "Rate limiting algorithm selection and justification",
      "Distributed state storage",
      "Atomic counter operations",
      "Failure handling (Redis unavailable)",
      "API design for the middleware",
      "Clock synchronization concerns",
    ],
    rubric: DEFAULT_RUBRIC,
  },
  {
    title: "Design a Distributed Cache (Redis-like)",
    prompt: `Design a distributed in-memory caching system similar to Redis or Memcached.

Requirements:
- Support GET, SET, DEL, EXPIRE operations
- 10TB total cache capacity across the cluster
- Sub-millisecond read/write latency (p99 < 1ms)
- 99.99% availability
- Support pub/sub messaging
- Eviction when memory is full

Discuss your data partitioning strategy, replication model, eviction policies, consistency guarantees, and how you'd handle node failures.`,
    difficulty: "MEDIUM" as const,
    category: "caching",
    estimatedMins: 40,
    hints: [
      "Consistent hashing for data distribution across nodes",
      "LRU vs LFU eviction — which workloads suit each?",
      "How does Redis handle persistence (RDB vs AOF)?",
      "Master-replica replication vs cluster mode",
    ],
    coverageChecklist: [
      "Data partitioning strategy (consistent hashing)",
      "Eviction policy (LRU/LFU/TTL)",
      "Replication and failover",
      "Persistence options (in-memory vs durable)",
      "Pub/sub or keyspace notifications",
      "Memory management and fragmentation",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "caching"
          ? { ...d, weight: 0.3 }
          : d.id === "fault_tolerance"
            ? { ...d, weight: 0.2 }
            : d.id === "scalability"
              ? { ...d, weight: 0.15 }
              : d.id === "trade_offs"
                ? { ...d, weight: 0.1 }
                : d,
      ),
    },
  },
  {
    title: "Design a Notification System",
    prompt: `Design a scalable notification delivery system supporting push, email, and SMS.

Requirements:
- 10M+ users
- Deliver push (mobile/web), email, and SMS notifications
- 100M notifications/day
- Users can set preferences (channel, quiet hours, opt-outs)
- Notification types: transactional (OTP, order update) and marketing (promotions)
- Delivery guarantees: at-least-once for transactional, best-effort for marketing
- Track delivery status and open rates

Design the ingestion pipeline, message routing, third-party provider integration, and retry logic.`,
    difficulty: "MEDIUM" as const,
    category: "messaging",
    estimatedMins: 35,
    hints: [
      "Separate transactional vs marketing pipelines",
      "How do you handle provider failures (Twilio, SendGrid, FCM)?",
      "Preference service — how to check them at scale without bottlenecks",
      "Idempotency keys to prevent duplicate sends",
    ],
    coverageChecklist: [
      "Notification ingestion and routing pipeline",
      "User preference and opt-out storage",
      "Third-party provider abstraction + fallback",
      "At-least-once delivery with idempotency",
      "Retry and dead-letter queue strategy",
      "Delivery status tracking and analytics",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "fault_tolerance"
          ? { ...d, weight: 0.25 }
          : d.id === "scalability"
            ? { ...d, weight: 0.2 }
            : d.id === "api_design"
              ? { ...d, weight: 0.15 }
              : d,
      ),
    },
  },
  {
    title: "Design a Search Autocomplete System",
    prompt: `Design the search autocomplete (typeahead) feature for a large e-commerce or search platform.

Requirements:
- Return top 10 suggestions within 100ms of each keystroke
- 10M unique search queries per day
- Suggestions ranked by popularity and personalization
- Support prefix matching and fuzzy matching
- Handle seasonal trends (suggestions change over time)
- Mobile and web clients

Design your data collection pipeline, trie or inverted index structure, ranking algorithm, and caching strategy.`,
    difficulty: "EASY" as const,
    category: "databases",
    estimatedMins: 25,
    hints: [
      "Trie vs inverted index — compare for prefix search",
      "How do you update popularity counts without locking?",
      "Cache the top-K results per prefix",
      "Aggregation pipeline: raw logs → frequency table → trie rebuild",
    ],
    coverageChecklist: [
      "Data collection and frequency aggregation pipeline",
      "Trie or prefix index data structure",
      "Top-K ranking per prefix",
      "Caching layer for hot prefixes",
      "Incremental vs full index refresh strategy",
      "Personalization signals",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "db_design"
          ? { ...d, weight: 0.25 }
          : d.id === "caching"
            ? { ...d, weight: 0.2 }
            : d.id === "scalability"
              ? { ...d, weight: 0.15 }
              : d,
      ),
    },
  },
  {
    title: "Design an Object Storage System (S3-like)",
    prompt: `Design a distributed object storage service similar to Amazon S3.

Requirements:
- Store billions of objects up to 5TB each
- 99.999999999% (11 nines) durability
- 99.99% availability
- Support multi-part upload for large files
- Versioning, lifecycle policies, access control (bucket policies, ACLs)
- Serve objects globally with low latency via CDN integration

Explain your data placement strategy, erasure coding vs replication, metadata management, and how you'd handle concurrent writes.`,
    difficulty: "HARD" as const,
    category: "storage",
    estimatedMins: 55,
    hints: [
      "Metadata vs actual object storage — separate planes",
      "Erasure coding (RS codes) vs 3× replication — durability vs cost",
      "Consistent hashing to place objects across storage nodes",
      "How does S3 handle strong read-after-write consistency?",
    ],
    coverageChecklist: [
      "Metadata service design (object index)",
      "Object placement and data distribution",
      "Erasure coding or replication for durability",
      "Multi-part upload coordination",
      "Access control (bucket policies, ACLs, presigned URLs)",
      "Garbage collection for deleted/overwritten objects",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "fault_tolerance"
          ? { ...d, weight: 0.25 }
          : d.id === "db_design"
            ? { ...d, weight: 0.2 }
            : d.id === "scalability"
              ? { ...d, weight: 0.2 }
              : d.id === "trade_offs"
                ? { ...d, weight: 0.1 }
                : d,
      ),
    },
  },
  {
    title: "Design a Chat System (WhatsApp-like)",
    prompt: `Design a real-time messaging system supporting 1-on-1 and group chats.

Requirements:
- 2 billion users, 100M daily active users
- 100 billion messages per day
- 1-on-1 and group chats (up to 1000 members)
- End-to-end encryption for 1-on-1
- Message delivery: sent → delivered → read receipts
- Offline message storage, media attachments
- Real-time presence (online/typing indicators)

Cover connection management, message fan-out, storage schema, media handling, and presence system design.`,
    difficulty: "HARD" as const,
    category: "messaging",
    estimatedMins: 60,
    hints: [
      "WebSocket connection management and load balancing",
      "Message fan-out for large groups vs 1-on-1",
      "How to store message history efficiently (append-only log)?",
      "Offline queuing — what happens when recipient is offline?",
    ],
    coverageChecklist: [
      "WebSocket / long-poll connection layer",
      "Message routing and fan-out for group chats",
      "Message storage schema (chat log)",
      "Delivery and read receipt tracking",
      "Media upload and CDN distribution",
      "Presence and typing indicator system",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "scalability"
          ? { ...d, weight: 0.25 }
          : d.id === "fault_tolerance"
            ? { ...d, weight: 0.2 }
            : d.id === "db_design"
              ? { ...d, weight: 0.15 }
              : d.id === "api_design"
                ? { ...d, weight: 0.1 }
                : d,
      ),
    },
  },
  {
    title: "Design an API Gateway",
    prompt: `Design a production-grade API Gateway that sits in front of a microservices backend.

Requirements:
- Route requests to 50+ downstream microservices
- 500K requests/second at peak
- Features: authentication/authorization, rate limiting, request routing, load balancing, SSL termination, request/response transformation, circuit breaking
- Service discovery integration
- Observability: logs, metrics, distributed tracing

Discuss your routing model, plugin architecture, how you'd handle cross-cutting concerns, and failure isolation between services.`,
    difficulty: "MEDIUM" as const,
    category: "api-design",
    estimatedMins: 40,
    hints: [
      "Plugin/middleware pipeline pattern for cross-cutting concerns",
      "How to keep routing config in sync with service discovery (Consul, etcd)?",
      "Circuit breaker per downstream service",
      "JWT validation at the gateway vs delegating to services",
    ],
    coverageChecklist: [
      "Request routing and service discovery",
      "Authentication and authorization layer",
      "Rate limiting per client/service",
      "Circuit breaker and retry logic",
      "Request/response transformation",
      "Observability integration (tracing, metrics)",
    ],
    rubric: {
      ...DEFAULT_RUBRIC,
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) =>
        d.id === "api_design"
          ? { ...d, weight: 0.3 }
          : d.id === "fault_tolerance"
            ? { ...d, weight: 0.2 }
            : d.id === "scalability"
              ? { ...d, weight: 0.15 }
              : d.id === "trade_offs"
                ? { ...d, weight: 0.1 }
                : d,
      ),
    },
  },
]

const additionalQuestions: QuestionSeed[] = [
  question(
    "Design a Ride-Hailing Dispatch System",
    `Design the dispatch and trip lifecycle for a ride-hailing service in 50 cities.

Requirements:
- Match a rider to a nearby available driver in under 5 seconds
- Handle 20,000 ride requests per second at peak
- Drivers send location updates every 2 seconds
- Support cancellation, rematching, and trip state recovery
- Keep rider and driver location data private

Explain geospatial indexing, matching, trip state, and failure handling.`,
    "HARD",
    "real-time-systems",
    55,
    [
      "How would you partition location data by geography?",
      "What should happen when a driver goes offline during matching?",
    ],
    [
      "Geospatial candidate search",
      "Atomic driver reservation",
      "Trip state machine",
      "Location freshness and privacy",
      "Regional failure handling",
    ],
    `Partition drivers by city and geospatial cell, such as H3 or geohash, and maintain a short-lived location record plus an availability index. A request searches nearby cells, filters stale or incompatible drivers, then scores candidates by pickup time and fairness. Reserve a driver with an atomic compare-and-set lease so two dispatchers cannot assign the same car. Store each trip as a durable state machine with idempotent transitions; publish events through an outbox to rider and driver clients. Location updates are ephemeral, encrypted in transit, access-scoped, and deleted on a short retention schedule. If a region or matching worker fails, expire leases and retry from the last durable trip state.`,
  ),
  question(
    "Design a Payment Processing Platform",
    `Design a payment platform that accepts card payments for online merchants.

Requirements:
- 5,000 payment attempts per second at peak
- Never charge a customer twice for one checkout
- Support authorization, capture, refund, and dispute states
- Recover safely from timeouts at the acquiring bank
- Keep a complete, auditable financial record

Cover APIs, idempotency, ledger design, and reconciliation.`,
    "HARD",
    "payments",
    60,
    [
      "What does a timeout mean when the provider may have processed the charge?",
      "Why should a ledger be append-only?",
    ],
    [
      "Idempotent payment API",
      "Explicit payment state machine",
      "Double-entry ledger",
      "Provider timeout recovery",
      "Reconciliation and audit",
    ],
    `Create a payment intent with a merchant-scoped idempotency key and persist it before calling a processor. Model authorization, capture, refund, and dispute as explicit states and append-only events; never infer success from a client timeout. Send provider requests with a stable provider idempotency key and reconcile uncertain results by querying the provider before retrying. Record money in an immutable double-entry ledger using integer minor units and a currency code, then derive balances from entries. Use an outbox to publish state changes after commit. A scheduled reconciliation compares internal transactions with processor reports, routes mismatches to an operations queue, and preserves the original records for audit.`,
  ),
  question(
    "Design a Video Streaming Service",
    `Design an on-demand video platform for 100 million monthly viewers.

Requirements:
- Store 10 million source videos
- Support adaptive playback on phones, TVs, and browsers
- Serve 20 million concurrent viewers globally
- Publish a new upload within 10 minutes
- Protect private and paid content

Describe ingest, transcoding, storage, delivery, and playback authorization.`,
    "HARD",
    "media-platforms",
    55,
    ["Separate the upload path from playback traffic.", "How do manifests select a bitrate?"],
    [
      "Upload and ingest workflow",
      "Asynchronous transcoding",
      "Origin and CDN layout",
      "Adaptive bitrate playback",
      "Entitlement and signed access",
    ],
    `Accept resumable uploads into a quarantine bucket, validate media metadata, and enqueue a durable transcode job. Workers produce a ladder of codecs and resolutions plus HLS or DASH segments; retries are idempotent by asset and profile. Store immutable renditions in object storage behind a CDN, with regional origins and cache keys that include the rendition. Playback first checks entitlement and returns a short-lived signed manifest URL or token; segment requests are then served at the edge. Track processing state separately from playback availability so partial encodes are never published. Use per-title encoding for popular content, lifecycle policies for cold originals, and metrics for startup time, rebuffering, and rendition errors.`,
  ),
  question(
    "Design a Collaborative Document Editor",
    `Design a browser-based editor where teams edit the same document at once.

Requirements:
- 50,000 concurrent editing sessions
- Show another user's change within 300 ms
- Recover edits after browser or server failure
- Support comments, cursors, and version history
- Resolve concurrent edits without losing either user's work

Discuss document operations, synchronization, persistence, and offline behavior.`,
    "HARD",
    "collaboration",
    60,
    [
      "Compare operational transformation and CRDTs.",
      "What is durable before acknowledging an edit?",
    ],
    [
      "Concurrency model",
      "Realtime session routing",
      "Durable operation log",
      "Offline synchronization",
      "Version history and access control",
    ],
    `Represent edits as operations against a versioned document and choose either a CRDT for decentralized/offline merging or operational transformation behind a sequenced server. A document session is routed to one logical collaboration shard, which validates permissions, assigns operation sequence numbers, and broadcasts compact updates over WebSockets. Persist accepted operations to a replicated log before acknowledging them, then periodically snapshot materialized document state. Clients keep a local operation queue and reconcile it after reconnect using version vectors or the server sequence. Store comments and presence separately from document content; presence can be ephemeral. Retain named snapshots and audit events, and enforce document authorization at both connection and operation time.`,
  ),
  question(
    "Design a Metrics and Alerting Platform",
    `Design a multi-tenant metrics service for infrastructure teams.

Requirements:
- Ingest 5 million samples per second
- Query recent metrics in under 2 seconds
- Retain high-resolution data for 30 days and aggregates for 2 years
- Evaluate 100,000 alert rules every minute
- Prevent one tenant from exhausting shared capacity

Cover ingestion, storage, query execution, and alert delivery.`,
    "HARD",
    "observability",
    55,
    ["How do labels affect index cardinality?", "Which data can be downsampled?"],
    [
      "Batch ingestion and backpressure",
      "Time-series partitioning",
      "Cardinality controls",
      "Downsampling and query path",
      "Alert deduplication and isolation",
    ],
    `Expose a batched, authenticated write API and partition samples by tenant and time window. Validate labels and enforce per-tenant cardinality budgets before indexing; excessive unique labels can overwhelm storage. Write recent data to a horizontally sharded time-series store with compressed columnar blocks and a sparse label index. Compact older blocks into coarser rollups, then expire raw data according to retention. Queries fan out only to relevant time partitions and merge bounded results. Evaluate alert rules in tenant-isolated workers with deterministic windows, deduplicate firing states, and route notifications through a durable queue with retry and silence support. Apply quotas, admission control, and per-tenant query budgets to protect shared capacity.`,
  ),
  question(
    "Design a Distributed Job Scheduler",
    `Design a scheduler that runs customer jobs across a fleet of workers.

Requirements:
- Schedule one-time and recurring jobs
- Dispatch 100,000 jobs per second
- Retry failures with backoff and dead-letter visibility
- Avoid duplicate side effects when workers crash
- Support cancellation and per-customer concurrency limits

Explain persistence, claiming, retries, and worker coordination.`,
    "HARD",
    "infrastructure",
    50,
    [
      "How do you recover a job whose worker disappears?",
      "What delivery guarantee can you actually provide?",
    ],
    [
      "Durable job state",
      "Partitioned due-time index",
      "Lease-based claiming",
      "Retry and dead-letter policy",
      "Fairness and idempotency",
    ],
    `Persist jobs with a state, due time, tenant, attempt count, and idempotency token. Partition the due-time index by shard and scan bounded time buckets, claiming work with a short lease and atomic state transition. Workers heartbeat while executing; an expired lease returns the job to the ready state. Delivery is at least once, so require an idempotency key for side-effecting handlers and document that exactly-once execution is not guaranteed. Apply exponential backoff with jitter, cap attempts, and move exhausted jobs to a visible dead-letter queue. Recurring schedules advance from a durable schedule cursor, while cancellation and per-tenant concurrency are checked at claim time.`,
  ),
  question(
    "Design a Multi-Tenant Feature Flag Service",
    `Design a feature flag service used by web and mobile applications.

Requirements:
- Evaluate a flag locally in under 1 ms
- Push updates to clients within 30 seconds
- Support percentage rollouts and user targeting
- Keep configuration isolated across organizations
- Continue serving the last known configuration during outages

Discuss evaluation, propagation, consistency, and auditability.`,
    "MEDIUM",
    "product-architecture",
    40,
    [
      "Should every flag evaluation call a central service?",
      "How do you keep a percentage cohort stable?",
    ],
    [
      "SDK-local evaluation",
      "Versioned config propagation",
      "Stable rollout hashing",
      "Tenant authorization",
      "Audit and stale-config behavior",
    ],
    `Store flag definitions as versioned, tenant-scoped configuration and evaluate them in an SDK from a signed local snapshot. Targeting rules should be deterministic and ordered; percentage rollout uses a stable hash of flag key and subject ID so a user does not move between cohorts. Publish version changes through a regional event stream and let SDKs poll as a fallback. Clients keep the last verified snapshot and expose its age, allowing applications to fail open or closed by flag policy during a control-plane outage. Require audited changes, staged rollout, and rollback. Keep evaluation payloads minimal and prevent secrets or sensitive personal attributes from being embedded in rules.`,
  ),
  question(
    "Design an Identity and Session Service",
    `Design authentication and session management for a consumer application.

Requirements:
- 50 million accounts and 100,000 sign-ins per second at peak
- Support password, passkey, and social sign-in
- Revoke a compromised session immediately
- Protect account recovery from takeover
- Keep login availability independent of product APIs

Describe identity storage, tokens, session checks, and recovery.`,
    "HARD",
    "security",
    55,
    [
      "What must be checked on every request for immediate revocation?",
      "How do you limit password-guessing attacks?",
    ],
    [
      "Credential storage and verification",
      "Short-lived access and revocable sessions",
      "Abuse throttling",
      "Recovery safeguards",
      "Independent availability and audit",
    ],
    `Keep account identity and credential records in a dedicated service, with passwords stored only as a slow salted hash and passkeys represented by public keys. Issue short-lived signed access tokens and track refresh sessions by opaque, rotated identifiers; check a revocation epoch or session record where immediate logout is required. Rate-limit by account, network, and device signals, and add progressive challenges rather than revealing whether an account exists. Recovery requires a verified channel, short-lived single-use tokens, and notifications to existing channels. Separate the identity data plane from product APIs, encrypt sensitive fields, audit privileged changes, and provide key rotation and incident revocation procedures.`,
  ),
  question(
    "Design a Ticket Booking System",
    `Design ticket booking for concerts and sports events with high-demand onsales.

Requirements:
- Sell 5 million seats across many venues
- Handle 1 million users arriving for one sale at once
- Never sell one seat twice
- Hold a selected seat for 8 minutes
- Recover payment failures without losing the seat or charging twice

Cover queueing, seat inventory, holds, payment, and fairness.`,
    "HARD",
    "transactions",
    55,
    [
      "Where is the single source of truth for seat ownership?",
      "How should a hold expire during a payment request?",
    ],
    [
      "Virtual waiting room",
      "Atomic seat hold",
      "Hold expiry and renewal",
      "Idempotent checkout",
      "Fairness and reconciliation",
    ],
    `Place a rate-controlled waiting room in front of each sale and issue signed queue tokens. Keep seat inventory in a transactional store partitioned by event; selecting seats atomically changes them from available to held with an owner and expiry. A purchase request uses an idempotency key and transitions the hold to payment-pending before calling the processor. If payment succeeds, finalize the sale; if the response is uncertain, query the processor before releasing inventory. A lease reaper returns abandoned holds to available, but must compare the hold version to avoid expiring a completed sale. Use queue fairness, bot controls, and a reconciliation job to compare orders with payment records.`,
  ),
  question(
    "Design a Marketplace Search and Ranking System",
    `Design product search for a marketplace with 100 million listings.

Requirements:
- Search results return in under 200 ms at p95
- Index listing updates within one minute
- Support filters, typo tolerance, and relevance ranking
- Prevent stale or out-of-stock items from dominating results
- Support regional language and currency differences

Explain indexing, query flow, ranking, and freshness.`,
    "MEDIUM",
    "search",
    45,
    [
      "How can the search index lag without serving invalid inventory?",
      "Which filters belong in the index?",
    ],
    [
      "Change capture and index pipeline",
      "Shard and replica strategy",
      "Filters and ranking features",
      "Inventory freshness",
      "Regionalization and experimentation",
    ],
    `Publish listing changes through a transactional outbox and update a horizontally sharded search index asynchronously. Index searchable text, category, price, availability hints, and regional fields, while keeping the listing database authoritative. Queries apply tenant or region filters and structured facets before ranking lexical relevance, quality, and personalization. Inventory is volatile, so recheck the top candidates against a fast availability service or filter using a short-lived stock cache before rendering. Use replicas for read scale, bounded fanout, and query timeouts. Measure click and conversion outcomes with offline relevance sets and controlled experiments, and keep index versions so a bad ranking rollout can be reversed.`,
  ),
  question(
    "Design a Webhook Delivery Service",
    `Design a webhook platform that sends merchant events to customer endpoints.

Requirements:
- Deliver 2 million events per minute
- Retry temporary failures for up to 24 hours
- Preserve ordering for each endpoint where possible
- Prevent one slow endpoint from blocking other customers
- Let customers inspect and replay delivery attempts

Describe event capture, signing, retries, and isolation.`,
    "MEDIUM",
    "messaging",
    40,
    [
      "How do retries avoid duplicating customer side effects?",
      "How do you isolate a slow destination?",
    ],
    [
      "Transactional event capture",
      "Per-endpoint queues",
      "Signature and replay protection",
      "Backoff and dead-lettering",
      "Inspection and replay",
    ],
    `Capture business events in an outbox in the same transaction as the state change, then fan them into endpoint-specific queues. Assign a stable event ID, sign the body with a rotating endpoint secret, and include a timestamp so receivers can reject replays. Deliver at least once; document that consumers must deduplicate by event ID. Retry network failures and 5xx responses with exponential backoff and jitter for a bounded period, while treating permanent 4xx responses according to policy. Partition by endpoint to preserve local ordering and limit concurrency so one slow target cannot block others. Keep an auditable attempt log, support manual replay, and disable endpoints that repeatedly fail.`,
  ),
  question(
    "Design a Secrets Management Service",
    `Design a service that stores and distributes application secrets to workloads.

Requirements:
- Serve 100,000 workloads across regions
- Rotate credentials without downtime
- Restrict access by workload identity and environment
- Audit every read and policy change
- Remain available during a regional control-plane outage

Explain encryption, authorization, caching, and rotation.`,
    "HARD",
    "security",
    50,
    ["Where are encryption keys held?", "How can rotation avoid breaking active clients?"],
    [
      "Envelope encryption and key hierarchy",
      "Workload identity and policy",
      "Audited access",
      "Versioned rotation",
      "Regional cache and revocation",
    ],
    `Encrypt each secret with a data-encryption key and wrap that key with a regional key-encryption key backed by an HSM or managed KMS. Authenticate workloads through short-lived identities and authorize reads with environment-scoped policies. Return versioned secret values over mutually authenticated TLS and audit access without logging the value. Rotation creates a new version, distributes it to authorized workloads, waits for adoption, and only then revokes the old version; applications should support overlapping credentials. Regional agents can cache encrypted values and short-lived authorization decisions to survive control-plane outages, with bounded staleness and a revocation channel. Separate policy administration from runtime reads and require approval for high-impact changes.`,
  ),
  question(
    "Design a Package Registry",
    `Design a public package registry for software libraries.

Requirements:
- Store 200 million immutable package versions
- Handle 100,000 downloads per second
- Support metadata search and dependency resolution
- Detect malware and prevent package-name takeover
- Keep publishing available while downloads scale independently

Cover publishing, storage, metadata, and supply-chain safety.`,
    "MEDIUM",
    "developer-platforms",
    45,
    [
      "Separate immutable package blobs from mutable metadata.",
      "What checks happen before a version becomes public?",
    ],
    [
      "Publish authentication and validation",
      "Immutable blob storage",
      "Metadata and dependency index",
      "CDN download path",
      "Provenance and malware controls",
    ],
    `Authenticate publishers with scoped tokens and reserve package ownership through verified namespaces. A publish creates an immutable version blob addressed by a cryptographic digest, while metadata and dependency edges live in a transactional database. Validate archive structure, size, signatures, provenance, and malware scans before marking a version available. Replicate blobs to object storage and serve downloads through a CDN; keep metadata APIs independently scalable and cache popular manifests. Make version publication idempotent and append an audit record for owner and policy changes. Add quarantine and takedown states that remove a package from resolution without rewriting historical artifacts.`,
  ),
  question(
    "Design a Data Warehouse Ingestion Pipeline",
    `Design a warehouse pipeline that ingests product events and powers analytics.

Requirements:
- Ingest 2 TB of events per day
- Make fresh data queryable within 5 minutes
- Support schema evolution and late-arriving events
- Keep raw data for 2 years
- Allow backfills without double-counting metrics

Describe ingestion, storage layout, transformations, and data quality.`,
    "HARD",
    "data-platforms",
    50,
    ["How should consumers handle duplicate events?", "Why keep both raw and modeled data?"],
    [
      "Durable event log",
      "Schema registry and evolution",
      "Partitioned lake storage",
      "Idempotent transforms",
      "Quality checks and backfills",
    ],
    `Accept events through a partitioned durable log with producer IDs, event IDs, and schema versions. Land the original payload in immutable object storage partitioned by event date and tenant, then transform it into columnar files and warehouse tables. Consumers deduplicate by event ID and use watermarks to account for late events. A schema registry enforces compatible evolution and quarantines invalid records. Orchestrate incremental jobs with checkpoints and idempotent output partitions; a backfill writes a new model version or replaces an affected partition atomically. Publish freshness, volume, null-rate, and referential-integrity checks alongside lineage so analysts can identify incomplete data.`,
  ),
  question(
    "Design an E-Commerce Inventory Service",
    `Design inventory reservation for a retailer with 20 million products.

Requirements:
- Process 10,000 checkouts per second during promotions
- Never confirm more units than are available
- Support warehouses, stores, and regional availability
- Release abandoned checkout reservations
- Continue checkout during partial warehouse outages

Discuss stock accounting, reservation, and fulfillment consistency.`,
    "HARD",
    "commerce",
    50,
    [
      "Distinguish on-hand, reserved, and available inventory.",
      "Can availability be eventually consistent while checkout is strict?",
    ],
    [
      "Inventory ledger",
      "Atomic reservation",
      "Reservation expiry",
      "Multi-warehouse allocation",
      "Reconciliation and outage behavior",
    ],
    `Track inventory movements in an append-only ledger and maintain an aggregate per SKU and location. Search can use an eventually consistent availability projection, but checkout must atomically reserve against the authoritative available quantity. Give every reservation an idempotency key and expiry; payment confirmation converts it to allocated stock, while cancellation or timeout releases it. Allocate across warehouses with explicit routing rules and version checks rather than a global transaction across all locations. If a warehouse is unreachable, exclude its stock from promises and degrade availability conservatively. Reconcile ledger movements against physical counts and fulfillment events, and expose oversell metrics for operations.`,
  ),
  question(
    "Design an Online Code Execution Platform",
    `Design a platform that runs untrusted code for programming exercises.

Requirements:
- Execute 100,000 submissions per hour
- Support multiple languages and compiler versions
- Enforce CPU, memory, and wall-clock limits
- Prevent code from reaching internal services or other users' data
- Return partial output and test results as execution proceeds

Explain isolation, scheduling, and result streaming.`,
    "HARD",
    "security",
    55,
    ["Which boundaries isolate the submitted process?", "How do you prevent resource exhaustion?"],
    [
      "Untrusted workload isolation",
      "Network and filesystem restrictions",
      "Resource quotas",
      "Queue and worker lifecycle",
      "Streaming and cleanup",
    ],
    `Store the submission and enqueue a job with a pinned language image and resource limits. Run each attempt in a short-lived microVM or hardened sandbox with a read-only root filesystem, isolated user namespace, seccomp profile, no ambient credentials, and outbound networking disabled. Apply CPU, memory, process-count, and wall-clock limits at the host boundary. Workers stream bounded stdout and test events through a per-job channel while persisting the final result. Use ephemeral storage, destroy the sandbox after completion, and scrub temporary artifacts. Separate queue pools by language and workload size, and enforce per-user quotas to prevent denial of service.`,
  ),
  question(
    "Design a Multi-Region Configuration Service",
    `Design a configuration service for applications deployed in three regions.

Requirements:
- Read configuration in under 5 ms
- Push updates to active clients within 15 seconds
- Support staged rollout and rollback
- Preserve availability during a region partition
- Make conflicting writes visible and resolvable

Explain consistency, replication, client caching, and change control.`,
    "MEDIUM",
    "distributed-systems",
    40,
    [
      "Can the read path avoid a global consensus round trip?",
      "How should concurrent edits be handled?",
    ],
    [
      "Versioned configuration",
      "Regional read replicas",
      "Change propagation",
      "Partition behavior",
      "Rollout and audit",
    ],
    `Store each configuration as an immutable version with an active pointer and audit metadata. Commit writes through a home region or consensus-backed control plane, then replicate versions asynchronously to regional read stores. Clients read from a local cache and subscribe to change notifications, with polling for missed updates. During a partition, regions continue serving the last committed version and reject or queue writes rather than creating silent conflicts. Rollouts move the active pointer by cohort, include an automatic health gate, and can be reverted to an earlier version. Expose version age and propagation lag so operators know when a region is stale.`,
  ),
]

const originalReferenceSolutions: Record<string, string> = {
  "Design a URL Shortener": `Use a stateless redirect API backed by a cache and a durable key-value store. Generate aliases with a collision-resistant ID or allocate them from a sequence encoded in a URL-safe alphabet; enforce uniqueness in the database. Write each mapping once, then cache hot aliases with bounded TTLs and invalidate on edits. Separate redirect reads from analytics: append compact click events to a stream and aggregate asynchronously so analytics never delays the redirect. Use regional caches and route misses to the nearest healthy region. Validate destination URLs, rate-limit creation, and support custom aliases through conditional writes. Define deletion and expiration semantics before choosing retention and cache invalidation policies.`,
  "Design Twitter's News Feed": `Store posts durably and use a hybrid fan-out model. Push new post IDs into precomputed timelines for ordinary accounts, but pull posts from very high-follower accounts at read time to avoid massive write amplification. A feed request merges recent IDs, removes duplicates, fetches post metadata in batches, and applies visibility rules. Cache a bounded recent timeline per user and invalidate through asynchronous events. Store media in object storage and serve it through a CDN. Partition posts by author and time, and retain a follow graph optimized for both follower and following lookups. Monitor feed freshness, fan-out lag, and celebrity pull cost; degrade to a chronological mixed feed if ranking is unhealthy.`,
  "Design a Rate Limiter": `Use a token bucket for burst tolerance and a sliding window counter where stricter fairness is required. Keep counters in Redis with an atomic Lua script that checks and updates state in one operation; shard by a stable hash of tenant and rule. Cache static policy locally, but keep distributed consumption authoritative for shared limits. Define behavior for Redis failure: high-risk APIs fail closed, while low-risk reads may use a conservative local fallback. Return remaining capacity and reset time in headers. Bound key cardinality, expire inactive buckets, and protect the limiter itself with timeouts and circuit breakers. Measure rejected requests and hot keys, then allow policy changes to propagate through versioned configuration.`,
  "Design a Distributed Cache (Redis-like)": `Partition keys consistently across nodes and replicate each shard to a failover replica. Clients discover topology from a control plane and route operations directly to the responsible shard. Keep the common GET and SET path in memory, with explicit TTL and eviction policy; use persistence snapshots or an append-only log according to recovery needs. Replication can be asynchronous for low latency, with documented loss bounds, or synchronous for stronger durability at added cost. Rebalance by copying ranges and dual-reading during cutover. Apply backpressure when memory is near capacity, isolate large values, and expose hit rate, eviction, replication lag, and tail latency per shard.`,
  "Design a Notification System": `Accept notification requests through an authenticated API and persist them to an outbox before publishing to a durable queue. A preference service filters channel, quiet hours, and opt-outs before fan-out. Partition by recipient and channel, then use separate worker pools for email, push, and SMS so provider slowness is isolated. Assign an idempotency key and delivery state to each attempt; retry transient provider errors with jitter and move exhausted messages to a dead-letter queue. Batch where providers support it and enforce per-user and global quotas. Track accepted, delivered, bounced, and opened events, but keep analytics off the send path. Store only necessary content and respect retention and deletion requests.`,
  "Design a Search Autocomplete System": `Build a prefix index from a stream of query and catalog updates. For a moderate catalog, a trie or finite-state transducer stores normalized prefixes and top completions; shard by leading characters or language. Precompute popular completions offline and keep a compact, versioned index in memory for low-latency reads. Apply a small personalization rerank using recent context, while filtering restricted or stale items against a current catalog signal. Debounce client requests and cache common prefixes at the edge. Update the index incrementally and publish complete snapshots atomically. Track zero-result rate, latency, and selection quality, and provide locale-aware normalization and typo tolerance.`,
  "Design an Object Storage System (S3-like)": `Expose a metadata API for bucket, object, version, and multipart-upload operations, while storing immutable object chunks in replicated blob storage. Divide objects into fixed-size blocks with checksums and a manifest; place replicas across failure domains and repair under-replicated blocks asynchronously. Commit metadata only after the required durable copies exist, and use version IDs for overwrite and delete semantics. Authenticate every request and authorize at bucket and object scope; support signed URLs with short expiry. Scale reads through caches and regional replicas, and use erasure coding for colder data. Lifecycle policies transition or expire versions, while audit logs record access and administrative changes.`,
  "Design a Chat System (WhatsApp-like)": `Route each conversation to an ordered message partition and assign a durable sequence number per conversation. Persist messages before acknowledging, then fan out to online participants over WebSockets and queue push notifications for offline devices. Use client-generated idempotency IDs to deduplicate retries. Keep delivery and read receipts as compact per-user cursors rather than rewriting message rows. Store recent history in a low-latency database and archive older media in object storage. Reconnect clients with a last-seen sequence and replay missed messages. Use end-to-end encryption if required, which changes server-side search and moderation capabilities; separate presence from durable state and expire it quickly.`,
  "Design an API Gateway": `Place a stateless gateway behind a load balancer and use a versioned route table to select upstream services. Authenticate tokens, authorize scopes, validate request shape, and enforce tenant-aware rate limits before forwarding. Set strict timeouts, bounded retries only for idempotent requests, and circuit breakers per upstream. Keep request transformation and policy execution lightweight; move expensive workflows into services. Propagate trace IDs and emit structured latency and error metrics without logging secrets. Deploy multiple zones with health-based routing and a safe configuration rollout. Define graceful degradation for unavailable services and return consistent errors. Use service discovery and mTLS between the gateway and internal backends.`,
}

for (const item of originalQuestions) {
  item.referenceSolution = originalReferenceSolutions[item.title]
}

export const questions: QuestionSeed[] = [...originalQuestions, ...additionalQuestions]
