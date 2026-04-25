import { db } from "./index.js"
import { DEFAULT_RUBRIC } from "@sysdesign/shared"

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
        d.id === "caching" ? { ...d, weight: 0.2 } :
        d.id === "db_design" ? { ...d, weight: 0.2 } :
        d.id === "scalability" ? { ...d, weight: 0.15 } :
        d.id === "trade_offs" ? { ...d, weight: 0.1 } :
        d,
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
        d.id === "scalability" ? { ...d, weight: 0.25 } :
        d.id === "caching" ? { ...d, weight: 0.2 } :
        d.id === "trade_offs" ? { ...d, weight: 0.15 } :
        d,
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
]

async function seed() {
  console.log("🌱 Seeding database...")

  for (const q of questions) {
    const existing = await db.question.findFirst({ where: { title: q.title } })
    if (existing) {
      console.log(`  ↩ Skipping "${q.title}" (already exists)`)
      continue
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
    })
    console.log(`  ✓ Created "${q.title}"`)
  }

  console.log("✅ Seeding complete")
  await db.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
