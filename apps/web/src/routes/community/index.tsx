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
import { cn } from "@/lib/utils"

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

function difficultyColor(d: string) {
  if (d === "Hard") return "badge-error"
  if (d === "Medium") return "badge-warning"
  return "badge-success"
}

function scoreColor(score: number) {
  if (score >= 85) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-error"
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CommunityPage() {
  const [query, setQuery] = useState("")
  const [difficulty, setDifficulty] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  const filtered = POSTS.filter((p) => {
    const matchQ = !query || p.title.toLowerCase().includes(query.toLowerCase()) || p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
    const matchD = !difficulty || p.difficulty === difficulty
    const matchC = !category || p.category === category
    return matchQ && matchD && matchC
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Community Solutions</h1>
        <p className="text-base-content/50 text-sm max-w-2xl">
          Explore real-world system designs reviewed by AI and peer architects. Discover patterns for
          scaling, fault tolerance, and data engineering.
        </p>
      </div>

      {/* ── Search + Filters ─────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            placeholder="Search architectures (e.g. Rate Limiter, Kafka…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input input-sm w-full rounded-xl pl-9 border-base-300/50 bg-base-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-base-content/40 shrink-0" />
          {/* Difficulty filter */}
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(difficulty === d ? null : d)}
                className={cn(
                  "badge badge-sm rounded-full transition-default cursor-pointer select-none",
                  difficulty === d
                    ? difficultyColor(d)
                    : "badge-ghost text-base-content/50 hover:text-base-content",
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            className="select select-sm rounded-xl border-base-300/50 bg-base-200 text-sm"
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
      <p className="mb-6 text-xs text-base-content/40">
        {filtered.length} solution{filtered.length !== 1 ? "s" : ""}{" "}
        {difficulty || category || query ? "matching filters" : "from the community"}
      </p>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-base-300/50 py-16 text-center">
          <p className="text-base-content/40 mb-2">No solutions match your filters</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setDifficulty(null); setCategory(null) }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
    <article className="group flex flex-col rounded-xl border border-base-300/40 bg-base-200 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-indigo-950/40 transition-default">
      <div className="flex flex-col gap-4 p-5 flex-1">
        {/* Author + Score */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {post.authorInitials}
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{post.author}</p>
              <p className="mt-0.5 text-xs text-base-content/40">{post.timeAgo}</p>
            </div>
          </div>

          {/* AI Score */}
          <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs">
            <Sparkles size={10} className="text-success" />
            <span className={cn("font-semibold", scoreColor(post.aiScore))}>{post.aiScore}</span>
          </div>
        </div>

        {/* Difficulty + Category */}
        <div className="flex items-center gap-2">
          <span className={cn("badge badge-xs rounded-full", difficultyColor(post.difficulty))}>
            {post.difficulty}
          </span>
          <span className="text-xs text-base-content/40 capitalize">
            {CATEGORIES.find((c) => c.slug === post.category)?.label ?? post.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold leading-snug text-base-content group-hover:text-primary transition-default line-clamp-2">
          {post.title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-base-300/50 bg-base-300/40 px-2 py-0.5 text-[11px] font-mono text-base-content/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-base-300/40 bg-base-300/20 px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-default"
          >
            <ThumbsUp size={12} />
            {post.upvotes}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-default"
          >
            <MessageSquare size={12} />
            {post.comments}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-default"
          >
            <GitFork size={12} />
            Fork
          </button>
        </div>

        <Link
          to="/community/$threadId"
          params={{ threadId: post.id }}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-default"
        >
          View
          <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  )
}
