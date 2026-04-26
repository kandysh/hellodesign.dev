import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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

function scoreColor(score: number): string {
  if (score >= 85) return "#4edea3"
  if (score >= 70) return "#fbbf24"
  return "#ffb4ab"
}

function scoreBarColor(score: number): string {
  if (score >= 85) return "#4edea3"
  if (score >= 70) return "#fbbf24"
  return "#ffb4ab"
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
        id: crypto.randomUUID(),
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
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px" }}>
      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <nav style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <Link
          to="/community"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#908fa0", textDecoration: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#8083ff" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#908fa0" }}
        >
          <ArrowLeft size={13} />
          Community Solutions
        </Link>
        <ChevronRight size={12} style={{ color: "#464554" }} />
        <span style={{ color: "#c7c4d7", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {thread.title}
        </span>
      </nav>

      {/* ── Article Header ───────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "rgba(192,193,255,0.08)",
            border: "1px solid rgba(192,193,255,0.15)",
            color: "#c0c1ff",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
          }}>
            {thread.category}
          </span>
          <span style={{ fontSize: 12, color: "#464554" }}>{thread.timeAgo}</span>
        </div>

        <h1 style={{ color: "#dae2fd", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>
          {thread.title}
        </h1>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#8083ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {thread.authorInitials}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>{thread.author}</p>
              <p style={{ fontSize: 11, color: "#464554" }}>{thread.authorRole}</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#464554", marginLeft: 8 }}>
            <button
              type="button"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#464554", cursor: "pointer", padding: 0, fontSize: 12 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8083ff" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#464554" }}
            >
              <ThumbsUp size={12} />
              {thread.upvotes}
            </button>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={12} />
              {localComments.length}
            </span>
            <button
              type="button"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#464554", cursor: "pointer", padding: 0, fontSize: 12 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8083ff" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#464554" }}
            >
              <GitFork size={12} />
              Fork
            </button>
          </div>

          {/* AI Score */}
          <div style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 99, border: "1px solid rgba(78,222,163,0.3)",
            background: "rgba(78,222,163,0.08)",
            padding: "6px 14px", fontSize: 13,
          }}>
            <Sparkles size={12} style={{ color: "#4edea3" }} />
            <span style={{ fontWeight: 700, color: scoreColor(thread.aiScore) }}>{thread.aiScore}</span>
            <span style={{ color: "#464554", fontSize: 11 }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }} className="lg:grid-cols-[1fr_300px]">
        {/* ── Left: Solution Content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Diagram placeholder */}
          <section style={{ background: "#171f33", border: "1px solid #2d3449", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1e2a3d",
              padding: "12px 20px",
            }}>
              <BarChart3 size={14} style={{ color: "#908fa0" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>System Diagram</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#131b2e", color: "#464554",
              fontSize: 13, fontStyle: "italic", height: 180,
            }}>
              Architecture diagram (canvas view)
            </div>
          </section>

          {/* Design Overview */}
          <section style={{ background: "#171f33", border: "1px solid #2d3449", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1e2a3d",
              padding: "12px 20px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>Design Overview</span>
            </div>
            <div style={{ padding: 20, color: "#c7c4d7", lineHeight: "1.7", fontSize: 14 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{thread.overview}</ReactMarkdown>
            </div>
          </section>

          {/* Code Snippet */}
          <section style={{ background: "#171f33", border: "1px solid #2d3449", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1e2a3d",
              padding: "12px 20px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>Implementation Example</span>
            </div>
            <pre style={{
              padding: 20, overflowX: "auto", fontSize: 12,
              lineHeight: 1.7, color: "rgba(78,222,163,0.85)",
              background: "#131b2e", margin: 0,
            }}>
              <code>{thread.codeSnippet}</code>
            </pre>
          </section>

          {/* ── Comments ── */}
          <section>
            <h2 style={{
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
              fontSize: 14, fontWeight: 600, color: "#dae2fd",
            }}>
              <MessageSquare size={15} />
              Technical Discussion
              <span style={{ fontSize: 12, fontWeight: 400, color: "#464554" }}>{localComments.length} comments</span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {localComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}

              {localComments.length === 0 && (
                <p style={{ fontSize: 13, color: "#464554", fontStyle: "italic" }}>
                  No comments yet. Be the first to contribute!
                </p>
              )}
            </div>

            {/* Comment form */}
            <div style={{
              background: "#171f33", border: "1px solid #2d3449",
              borderRadius: 12, padding: 16,
            }}>
              <textarea
                rows={3}
                placeholder="Share your thoughts, ask questions, or suggest improvements…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                style={{
                  background: "#131b2e",
                  border: "1px solid #2d3449",
                  borderRadius: 10,
                  color: "#dae2fd",
                  padding: "10px 16px",
                  fontSize: 14,
                  outline: "none",
                  width: "100%",
                  resize: "none",
                  height: 100,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(128,131,255,0.5)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449" }}
              />
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentDraft.trim()}
                  style={{
                    background: commentDraft.trim() ? "#6366f1" : "rgba(99,102,241,0.3)",
                    border: "1px solid rgba(99,102,241,0.5)",
                    color: commentDraft.trim() ? "#fff" : "#908fa0",
                    borderRadius: 10,
                    padding: "8px 20px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: commentDraft.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Send size={12} />
                  Post Comment
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right: AI Analysis ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#171f33", border: "1px solid #2d3449", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1e2a3d",
              padding: "12px 20px",
            }}>
              <Sparkles size={13} style={{ color: "#8083ff" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>AI Analysis</span>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Overall score ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, paddingBottom: 8 }}>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <svg width={72} height={72}>
                    <circle cx={36} cy={36} r={28} fill="none" stroke="#1e2a3d" strokeWidth={6} />
                    <circle
                      cx={36} cy={36} r={28} fill="none"
                      stroke="#4edea3" strokeWidth={6}
                      strokeDasharray={175.93}
                      strokeDashoffset={175.93 * (1 - thread.aiScore / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 36 36)"
                    />
                    <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#4edea3">
                      {thread.aiScore}
                    </text>
                  </svg>
                </div>
                <p style={{ fontSize: 11, color: "#464554" }}>Overall Score</p>
              </div>

              {/* Dimension scores */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {thread.dimensions.map((d) => (
                  <div key={d.label}>
                    <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#908fa0" }}>{d.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(d.score) }}>{d.score}</span>
                    </div>
                    <div style={{ height: 6, width: "100%", borderRadius: 99, background: "#1e2a3d" }}>
                      <div
                        style={{
                          height: 6, borderRadius: 99,
                          background: scoreBarColor(d.score),
                          width: `${d.score}%`,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Strengths */}
          <div style={{ background: "#171f33", border: "1px solid #2d3449", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #1e2a3d",
              padding: "12px 20px",
            }}>
              <CheckCircle2 size={13} style={{ color: "#4edea3" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dae2fd" }}>Strengths</span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, padding: 20, listStyle: "none", margin: 0 }}>
              {["Multi-tier cache hierarchy", "Global PoP distribution", "Adaptive bitrate strategy"].map((s) => (
                <li key={s} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#908fa0" }}>
                  <span style={{ marginTop: 1, flexShrink: 0, color: "#4edea3" }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Try this question */}
          <Link
            to="/questions"
            style={{
              display: "block",
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = "rgba(99,102,241,0.4)"
              el.style.background = "rgba(99,102,241,0.1)"
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = "rgba(99,102,241,0.2)"
              el.style.background = "rgba(99,102,241,0.06)"
            }}
          >
            <p style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#8083ff" }}>Practice this pattern</p>
            <p style={{ fontSize: 12, color: "#464554" }}>Try a similar question in the Question Bank →</p>
          </Link>
        </aside>
      </div>
    </div>
  )
}

// ── Comment Card ──────────────────────────────────────────────────────────────

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid #2d3449", background: "#131b2e" }}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={comment.isAuthor
              ? { background: "rgba(99,102,241,0.2)", color: "#8083ff" }
              : { background: "rgba(255,255,255,0.06)", color: "#908fa0" }
            }
          >
            {comment.authorInitials}
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: "#dae2fd" }}>{comment.author}</span>
            {comment.isAuthor && (
              <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "rgba(128,131,255,0.15)", color: "#8083ff" }}>
                Author
              </span>
            )}
            {comment.role && <p className="text-xs" style={{ color: "#464554" }}>{comment.role}</p>}
          </div>
        </div>
        <span className="text-xs shrink-0" style={{ color: "#464554" }}>{comment.timeAgo}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#c7c4d7" }}>{comment.content}</p>
      <button
        type="button"
        className="mt-2.5 flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: "#464554" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#8083ff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#464554")}
      >
        <ThumbsUp size={11} />
        {comment.upvotes}
      </button>
    </div>
  )
}
