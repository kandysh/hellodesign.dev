import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  Search,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Filter,
  GitFork,
} from "lucide-react"

export const Route = createFileRoute("/community/")({ component: CommunityPage })

// ── Static mock data ──────────────────────────────────────────────────────────

interface CommunityPost {
  id: string
  title: string
  author: string
  authorInitials: string
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  aiScore: number
  upvotes: number
  comments: number
  timeAgo: string
}

const POSTS: CommunityPost[] = [
  {
    id: "global-video-cdn",
    title: "Design Netflix Global Video CDN",
    author: "Alex Mercer",
    authorInitials: "AM",
    category: "networking",
    difficulty: "Hard",
    tags: ["CDN", "Video Streaming", "AWS CloudFront"],
    aiScore: 94,
    upvotes: 342,
    comments: 18,
    timeAgo: "2 days ago",
  },
  {
    id: "distributed-rate-limiter",
    title: "Distributed Rate Limiter",
    author: "Sarah Chen",
    authorInitials: "SC",
    category: "caching",
    difficulty: "Medium",
    tags: ["Redis", "Token Bucket", "API Gateway"],
    aiScore: 87,
    upvotes: 210,
    comments: 9,
    timeAgo: "5 days ago",
  },
  {
    id: "event-streaming-analytics",
    title: "Global Event Streaming for Real-time Analytics",
    author: "David Kim",
    authorInitials: "DK",
    category: "messaging",
    difficulty: "Hard",
    tags: ["Kafka", "Flink", "ClickHouse"],
    aiScore: 91,
    upvotes: 289,
    comments: 14,
    timeAgo: "1 week ago",
  },
  {
    id: "url-shortener",
    title: "URL Shortener at Scale",
    author: "Priya Patel",
    authorInitials: "PP",
    category: "databases",
    difficulty: "Easy",
    tags: ["Base62", "MySQL", "Redis Cache"],
    aiScore: 82,
    upvotes: 156,
    comments: 6,
    timeAgo: "2 weeks ago",
  },
  {
    id: "distributed-cache",
    title: "Distributed Cache with Consistent Hashing",
    author: "James Rodriguez",
    authorInitials: "JR",
    category: "caching",
    difficulty: "Medium",
    tags: ["Memcached", "Consistent Hashing", "Replication"],
    aiScore: 88,
    upvotes: 195,
    comments: 11,
    timeAgo: "3 weeks ago",
  },
  {
    id: "notification-system",
    title: "Large-Scale Push Notification System",
    author: "Mei Lin",
    authorInitials: "ML",
    category: "messaging",
    difficulty: "Medium",
    tags: ["APNs", "FCM", "Kafka", "WebSockets"],
    aiScore: 85,
    upvotes: 178,
    comments: 7,
    timeAgo: "1 month ago",
  },
]

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const
const CATEGORIES = [
  { slug: "networking", label: "Networking" },
  { slug: "caching", label: "Caching" },
  { slug: "messaging", label: "Messaging" },
  { slug: "databases", label: "Databases" },
  { slug: "storage", label: "Storage" },
  { slug: "distributed-systems", label: "Distributed Systems" },
]

function difficultyStyle(d: string): React.CSSProperties {
  if (d === "Hard") return {
    background: "rgba(255,180,171,0.1)",
    color: "var(--app-red)",
    border: "1px solid rgba(255,180,171,0.2)",
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
  }
  if (d === "Medium") return {
    background: "rgba(251,191,36,0.1)",
    color: "var(--app-amber)",
    border: "1px solid rgba(251,191,36,0.2)",
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
  }
  return {
    background: "rgba(78,222,163,0.1)",
    color: "var(--app-green)",
    border: "1px solid rgba(78,222,163,0.2)",
    borderRadius: 6,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
  }
}

function scoreColor(score: number): string {
  if (score >= 85) return "var(--app-green)"
  if (score >= 70) return "var(--app-amber)"
  return "var(--app-red)"
}

function matchesFilters(
  post: CommunityPost,
  query: string,
  difficulty: string | null,
  category: string | null,
): boolean {
  const q = query.toLowerCase()
  const matchQ =
    !query ||
    post.title.toLowerCase().includes(q) ||
    post.tags.some((t) => t.toLowerCase().includes(q))
  const matchD = !difficulty || post.difficulty === difficulty
  const matchC = !category || post.category === category
  return matchQ && matchD && matchC
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CommunityPage() {
  const [query, setQuery] = useState("")
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  const filtered = POSTS.filter((p) => matchesFilters(p, query, difficulty, category))

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}>
      {/* ── Page Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "var(--app-fg)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Community Solutions
        </h1>
        <p style={{ color: "var(--app-subtle)", fontSize: 14, maxWidth: 560 }}>
          Explore real-world system designs reviewed by AI and peer architects. Discover patterns for
          scaling, fault tolerance, and data engineering.
        </p>
      </div>

      {/* ── Search + Filters ─────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search
            size={14}
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--app-muted)", pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search architectures (e.g. Rate Limiter, Kafka…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              borderRadius: 10,
              color: "var(--app-fg)",
              padding: "10px 16px 10px 36px",
              fontSize: 14,
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(128,131,255,0.5)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border)" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={13} style={{ color: "var(--app-muted)", flexShrink: 0 }} />

          {/* Difficulty filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d
              const base = difficultyStyle(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(difficulty === d ? null : d)}
                  style={{
                    ...(active ? base : {
                      background: "transparent",
                      border: "1px solid var(--app-border)",
                      color: "var(--app-subtle)",
                      borderRadius: 6,
                      padding: "2px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                    }),
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "all 0.15s",
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Category filter */}
          <select
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            style={{
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              borderRadius: 10,
              color: "var(--app-fg)",
              padding: "8px 12px",
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <p style={{ marginBottom: 24, fontSize: 12, color: "var(--app-muted)" }}>
        {filtered.length} solution{filtered.length !== 1 ? "s" : ""}{" "}
        {difficulty || category || query ? "matching filters" : "from the community"}
      </p>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          borderRadius: 12, border: "1px dashed var(--app-border)",
          padding: "64px 24px", textAlign: "center",
        }}>
          <p style={{ color: "var(--app-muted)", marginBottom: 8, fontSize: 14 }}>No solutions match your filters</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setDifficulty(null); setCategory(null) }}
            style={{
              background: "transparent", border: "none",
              color: "var(--app-indigo)", fontSize: 13, cursor: "pointer",
              textDecoration: "underline", padding: 0,
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article
      style={{
        background: "var(--app-surface-2)",
        border: "1px solid var(--app-border)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--app-muted)" }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--app-border)" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 24px", flex: 1 }}>
        {/* Author + Score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid var(--app-indigo-glow)",
              color: "var(--app-indigo)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {post.authorInitials}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--app-fg)", lineHeight: 1 }}>{post.author}</p>
              <p style={{ marginTop: 3, fontSize: 11, color: "var(--app-muted)" }}>{post.timeAgo}</p>
            </div>
          </div>

          {/* AI Score */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 99, border: "1px solid rgba(78,222,163,0.3)",
            background: "rgba(78,222,163,0.08)",
            padding: "4px 10px", fontSize: 11,
          }}>
            <Sparkles size={10} style={{ color: "var(--app-green)" }} />
            <span style={{ fontWeight: 700, color: scoreColor(post.aiScore) }}>{post.aiScore}</span>
          </div>
        </div>

        {/* Difficulty + Category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={difficultyStyle(post.difficulty)}>{post.difficulty}</span>
          <span style={{ fontSize: 12, color: "var(--app-muted)", textTransform: "capitalize" }}>
            {CATEGORIES.find((c) => c.slug === post.category)?.label ?? post.category}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontWeight: 600, lineHeight: 1.35, color: "var(--app-fg)", fontSize: 14,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {post.title}
        </h3>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: "rgba(192,193,255,0.08)",
                border: "1px solid var(--app-indigo-15)",
                color: "var(--app-indigo-pale)",
                borderRadius: 6,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid var(--app-border-2)",
        background: "var(--app-surface)",
        padding: "12px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--app-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-indigo)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-muted)" }}
          >
            <ThumbsUp size={12} />
            {post.upvotes}
          </button>
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--app-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-indigo)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-muted)" }}
          >
            <MessageSquare size={12} />
            {post.comments}
          </button>
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--app-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-indigo)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-muted)" }}
          >
            <GitFork size={12} />
            Fork
          </button>
        </div>

        <Link
          to="/community/$threadId"
          params={{ threadId: post.id }}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--app-indigo)", textDecoration: "none" }}
        >
          View
          <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  )
}
