import "dotenv/config";
import { db } from "./index.js";
import { DEFAULT_RUBRIC } from "@sysdesign/shared";

const questions = [
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
];

async function seed() {
  console.log("Seeding database...");

  for (const q of questions) {
    const existing = await db.question.findFirst({ where: { title: q.title } });
    if (existing) {
      console.log(`  ↩ Skipping "${q.title}" (already exists)`);
      continue;
    }
    await db.question.create({
      data: {
        title: q.title,
        prompt: q.prompt,
        difficulty: q.difficulty,
        category: q.category,
        estimatedMins: q.estimatedMins,
        hints: q.hints,
        coverageChecklist: q.coverageChecklist,
        rubric: q.rubric as object,
        isPublished: true,
      },
    });
    console.log(`  ✓ Created "${q.title}"`);
  }

  console.log("Seeding complete");
  await db.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
