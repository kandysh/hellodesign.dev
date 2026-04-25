import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  GitFork,
  Sparkles,
  ChevronRight,
  Send,
  BarChart3,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/community/$threadId")({ component: CommunityThreadPage })

// ── Static mock data keyed by threadId ────────────────────────────────────────

interface Comment {
  id: string
  author: string
  authorInitials: string
  role?: string
  isAuthor?: boolean
  timeAgo: string
  content: string
  upvotes: number
}

interface ThreadData {
  id: string
  title: string
  author: string
  authorInitials: string
  authorRole: string
  category: string
  timeAgo: string
  aiScore: number
  dimensions: { label: string; score: number }[]
  overview: string
  codeSnippet: string
  upvotes: number
  comments: Comment[]
}

const THREADS: Record<string, ThreadData> = {
  "global-video-cdn": {
    id: "global-video-cdn",
    title: "Design Netflix Global Video CDN",
    author: "Alex Mercer",
    authorInitials: "AM",
    authorRole: "Principal Architect @ DataFlow",
    category: "NETWORKING",
    timeAgo: "2 days ago",
    aiScore: 94,
    dimensions: [
      { label: "Scalability", score: 96 },
      { label: "Reliability", score: 93 },
      { label: "Performance", score: 94 },
      { label: "Maintainability", score: 90 },
    ],
    overview: `This architecture proposes a global-first approach to video delivery, utilizing a tiered CDN structure with PoPs distributed across 6 continents. The core objective is to achieve sub-50ms TTFB for video segment delivery to 99th percentile of global users.

**Key Components:**
- **Origin Layer:** S3-backed origin with multi-region replication for master video assets
- **Transcoding Pipeline:** AWS Elemental MediaConvert for adaptive bitrate (ABR) encoding at multiple resolutions (360p–4K)
- **CDN Tier 1 (Edge PoPs):** 200+ CloudFront edge locations for last-mile delivery, caching HLS/DASH segments
- **CDN Tier 2 (Regional):** 12 regional caches (shield nodes) to reduce origin load
- **Manifest Service:** Globally distributed manifest servers that dynamically select the nearest CDN node

Traffic is routed via Anycast DNS with health-check failover. Cache TTLs are set to 24h for VOD segments, with instant invalidation via CloudFront APIs for live content updates.`,
    codeSnippet: `# CloudFront Distribution Config (Terraform)
resource "aws_cloudfront_distribution" "video_cdn" {
  enabled = true
  
  origin {
    domain_name = aws_s3_bucket.video_origin.bucket_regional_domain_name
    origin_id   = "S3-video-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-video-origin"
    
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }
  
  price_class = "PriceClass_All"
}`,
    upvotes: 342,
    comments: [
      {
        id: "c1",
        author: "Sarah Chen",
        authorInitials: "SC",
        role: "Senior Engineer @ Stripe",
        timeAgo: "4h ago",
        content: "How are you handling the cross-region latency for the Kafka Cluster Linking? In our experience, us-east to ap-northeast can sometimes spike beyond 150ms.",
        upvotes: 12,
      },
      {
        id: "c2",
        author: "Alex Mercer",
        authorInitials: "AM",
        isAuthor: true,
        timeAgo: "3h ago",
        content: "Great point. We aren't doing synchronous replication across the long haul. We use async replication with a small buffer, and the UI handles eventual consistency for the aggregated views. Detailed it in section 4.2 of the docs.",
        upvotes: 8,
      },
      {
        id: "c3",
        author: "David Kim",
        authorInitials: "DK",
        timeAgo: "1d ago",
        content: "Have you considered using Redpanda instead of Confluent Kafka here? The Tiered Storage out of the box might simplify your historical data serving architecture.",
        upvotes: 5,
      },
    ],
  },
  "event-streaming-analytics": {
    id: "event-streaming-analytics",
    title: "Global Event Streaming for Real-time Analytics",
    author: "David Kim",
    authorInitials: "DK",
    authorRole: "Principal Architect @ DataFlow",
    category: "MESSAGING",
    timeAgo: "1 week ago",
    aiScore: 91,
    dimensions: [
      { label: "Scalability", score: 95 },
      { label: "Reliability", score: 88 },
      { label: "Performance", score: 92 },
      { label: "Maintainability", score: 89 },
    ],
    overview: `This architecture proposes a global-first approach to event streaming, utilizing Kafka clusters distributed across three major AWS regions (us-east-1, eu-west-1, ap-northeast-1). The core objective is to achieve sub-100ms latency for real-time analytics dashboards accessed by end-users globally.

**Key Components:**
- **Ingestion Layer:** Regional API Gateways routing to stateless Go microservices
- **Streaming Backbone:** Confluent Cloud Kafka with Cluster Linking for cross-region replication
- **Processing:** Apache Flink jobs running on EKS for stateful aggregations
- **Serving:** ClickHouse clusters tailored for high-concurrency analytical queries`,
    codeSnippet: `// Example Flink Job Configuration
StreamExecutionEnvironment env =
  StreamExecutionEnvironment.getExecutionEnvironment();
env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);
env.enableCheckpointing(60000); // 1 minute checkpoints

DataStream<Event> stream = env
  .addSource(new FlinkKafkaConsumer<>(
    "analytics-events",
    new EventDeserializationSchema(),
    kafkaProps
  ))
  .assignTimestampsAndWatermarks(
    WatermarkStrategy.<Event>forBoundedOutOfOrderness(
      Duration.ofSeconds(5)
    ).withTimestampAssigner((e, ts) -> e.getTimestamp())
  );`,
    upvotes: 289,
    comments: [
      {
        id: "c1",
        author: "Priya Patel",
        authorInitials: "PP",
        timeAgo: "2d ago",
        content: "What's your strategy for backpressure handling when ClickHouse is under heavy write load?",
        upvotes: 9,
      },
    ],
  },
}

const FALLBACK_THREAD: ThreadData = {
  id: "fallback",
  title: "System Design Solution",
  author: "Community Member",
  authorInitials: "CM",
  authorRole: "Software Engineer",
  category: "GENERAL",
  timeAgo: "recently",
  aiScore: 85,
  dimensions: [
    { label: "Scalability", score: 85 },
    { label: "Reliability", score: 84 },
    { label: "Performance", score: 86 },
    { label: "Maintainability", score: 83 },
  ],
  overview: "This is a community-submitted system design solution. The author has not yet added a detailed overview.",
  codeSnippet: "// No code snippet provided.",
  upvotes: 0,
  comments: [],
}

function scoreColor(score: number) {
  if (score >= 85) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-error"
}

function scoreBarColor(score: number) {
  if (score >= 85) return "bg-success"
  if (score >= 70) return "bg-warning"
  return "bg-error"
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CommunityThreadPage() {
  const { threadId } = Route.useParams()
  const thread = THREADS[threadId] ?? FALLBACK_THREAD

  const [commentDraft, setCommentDraft] = useState("")
  const [localComments, setLocalComments] = useState<Comment[]>(thread.comments)

  function handleSubmitComment() {
    const text = commentDraft.trim()
    if (!text) return
    setLocalComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        author: "You",
        authorInitials: "YO",
        timeAgo: "just now",
        content: text,
        upvotes: 0,
      },
    ])
    setCommentDraft("")
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-base-content/50">
        <Link to="/community" className="hover:text-primary transition-default flex items-center gap-1">
          <ArrowLeft size={13} />
          Community Solutions
        </Link>
        <ChevronRight size={12} className="text-base-content/30" />
        <span className="text-base-content/70 truncate max-w-[300px]">{thread.title}</span>
      </nav>

      {/* ── Article Header ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="badge badge-xs badge-outline font-mono tracking-wider">{thread.category}</span>
          <span className="text-xs text-base-content/40">{thread.timeAgo}</span>
        </div>

        <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{thread.title}</h1>

        <div className="flex flex-wrap items-center gap-4">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {thread.authorInitials}
            </div>
            <div>
              <p className="text-sm font-semibold">{thread.author}</p>
              <p className="text-xs text-base-content/40">{thread.authorRole}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-base-content/50 ml-2">
            <button type="button" className="flex items-center gap-1.5 hover:text-primary transition-default">
              <ThumbsUp size={12} />
              {thread.upvotes}
            </button>
            <span className="flex items-center gap-1.5">
              <MessageSquare size={12} />
              {localComments.length}
            </span>
            <button type="button" className="flex items-center gap-1.5 hover:text-primary transition-default">
              <GitFork size={12} />
              Fork
            </button>
          </div>

          {/* AI Score */}
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-sm">
            <Sparkles size={12} className="text-success" />
            <span className={cn("font-bold", scoreColor(thread.aiScore))}>{thread.aiScore}</span>
            <span className="text-base-content/40 text-xs">/ 100</span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Left: Solution Content ── */}
        <div className="space-y-6">
          {/* Diagram placeholder */}
          <section className="rounded-xl border border-base-300/40 bg-base-200 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3">
              <BarChart3 size={14} className="text-base-content/50" />
              <span className="text-sm font-semibold">System Diagram</span>
            </div>
            <div
              className="flex items-center justify-center bg-base-300/20 text-base-content/20 text-sm italic"
              style={{ height: 180 }}
            >
              Architecture diagram (canvas view)
            </div>
          </section>

          {/* Design Overview */}
          <section className="rounded-xl border border-base-300/40 bg-base-200 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3">
              <span className="text-sm font-semibold">Design Overview</span>
            </div>
            <div className="p-5 prose prose-sm max-w-none prose-invert prose-p:text-base-content/80 prose-strong:text-base-content prose-headings:text-base-content">
              {thread.overview.split("\n\n").map((para, i) => {
                if (para.startsWith("**") && para.includes(":**")) {
                  return (
                    <p key={i} className="text-sm text-base-content/80 leading-relaxed mb-3">
                      {para.split("\n").map((line, j) => {
                        const boldMatch = line.match(/\*\*(.+?)\*\*(.*)/)
                        if (boldMatch) {
                          return (
                            <span key={j} className="block">
                              <strong className="text-base-content">{boldMatch[1]}</strong>
                              {boldMatch[2]}
                            </span>
                          )
                        }
                        return <span key={j} className="block">{line}</span>
                      })}
                    </p>
                  )
                }
                return (
                  <p key={i} className="text-sm text-base-content/80 leading-relaxed mb-3">{para}</p>
                )
              })}
            </div>
          </section>

          {/* Code Snippet */}
          <section className="rounded-xl border border-base-300/40 bg-base-200 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3">
              <span className="text-sm font-semibold">Implementation Example</span>
            </div>
            <pre className="p-5 overflow-x-auto text-xs leading-relaxed text-success/80 bg-base-300/20">
              <code>{thread.codeSnippet}</code>
            </pre>
          </section>

          {/* ── Comments ── */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <MessageSquare size={15} />
              Technical Discussion
              <span className="text-xs font-normal text-base-content/40">{localComments.length} comments</span>
            </h2>

            <div className="space-y-4 mb-6">
              {localComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}

              {localComments.length === 0 && (
                <p className="text-sm text-base-content/40 italic">No comments yet. Be the first to contribute!</p>
              )}
            </div>

            {/* Comment form */}
            <div className="rounded-xl border border-base-300/40 bg-base-200 p-4">
              <textarea
                rows={3}
                placeholder="Share your thoughts, ask questions, or suggest improvements…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="textarea textarea-sm w-full resize-none rounded-lg border-base-300/50 bg-base-300/20 text-sm focus-visible:ring-1 focus-visible:ring-primary"
              />
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentDraft.trim()}
                  className="btn btn-primary btn-sm rounded-lg gap-1.5"
                >
                  <Send size={12} />
                  Post Comment
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right: AI Analysis ── */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-base-300/40 bg-base-200 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3">
              <Sparkles size={13} className="text-primary" />
              <span className="text-sm font-semibold">AI Analysis</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Overall score ring */}
              <div className="flex flex-col items-center py-2">
                <div className="relative mb-2">
                  <svg width={72} height={72}>
                    <circle cx={36} cy={36} r={28} fill="none" stroke="oklch(22% 0.027 273)" strokeWidth={6} />
                    <circle
                      cx={36} cy={36} r={28} fill="none"
                      stroke="oklch(74% 0.169 154)" strokeWidth={6}
                      strokeDasharray={175.93}
                      strokeDashoffset={175.93 * (1 - thread.aiScore / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 36 36)"
                    />
                    <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight="bold" fill="oklch(74% 0.169 154)">
                      {thread.aiScore}
                    </text>
                  </svg>
                </div>
                <p className="text-xs text-base-content/50">Overall Score</p>
              </div>

              {/* Dimension scores */}
              <div className="space-y-2.5">
                {thread.dimensions.map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-base-content/70">{d.label}</span>
                      <span className={cn("text-xs font-semibold", scoreColor(d.score))}>{d.score}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-base-300/60">
                      <div
                        className={cn("h-1.5 rounded-full transition-all", scoreBarColor(d.score))}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Strengths */}
          <div className="rounded-xl border border-base-300/40 bg-base-200 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-base-300/40 px-5 py-3">
              <CheckCircle2 size={13} className="text-success" />
              <span className="text-sm font-semibold">Strengths</span>
            </div>
            <ul className="space-y-2 p-5">
              {["Multi-tier cache hierarchy", "Global PoP distribution", "Adaptive bitrate strategy"].map((s) => (
                <li key={s} className="flex items-start gap-2 text-xs text-base-content/70">
                  <span className="mt-0.5 shrink-0 text-success">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Try this question */}
          <Link
            to="/questions"
            className="block rounded-xl border border-primary/20 bg-primary/5 p-4 hover:border-primary/40 hover:bg-primary/10 transition-default"
          >
            <p className="mb-1 text-xs font-semibold text-primary">Practice this pattern</p>
            <p className="text-xs text-base-content/50">Try a similar question in the Question Bank →</p>
          </Link>
        </aside>
      </div>
    </div>
  )
}

// ── Comment Card ──────────────────────────────────────────────────────────────

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="rounded-xl border border-base-300/40 bg-base-200 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              comment.isAuthor ? "bg-primary/20 text-primary" : "bg-base-300/60 text-base-content/60",
            )}
          >
            {comment.authorInitials}
          </div>
          <div>
            <span className="text-sm font-medium">{comment.author}</span>
            {comment.isAuthor && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                Author
              </span>
            )}
            {comment.role && <p className="text-xs text-base-content/40">{comment.role}</p>}
          </div>
        </div>
        <span className="text-xs text-base-content/40 shrink-0">{comment.timeAgo}</span>
      </div>
      <p className="text-sm leading-relaxed text-base-content/80">{comment.content}</p>
      <button
        type="button"
        className="mt-2.5 flex items-center gap-1.5 text-xs text-base-content/40 hover:text-primary transition-default"
      >
        <ThumbsUp size={11} />
        {comment.upvotes}
      </button>
    </div>
  )
}
