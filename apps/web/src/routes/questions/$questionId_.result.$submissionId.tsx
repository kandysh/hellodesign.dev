import type { ComponentScore } from "@sysdesign/shared"
import { DEFAULT_RUBRIC, extractLexicalText } from "@sysdesign/shared"
import { ScoreRing } from "@sysdesign/ui"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Code2,
  Database,
  FileText,
  GitBranch,
  Layers,
  MessageCircle,
  RefreshCw,
  Share2,
  Shield,
  Zap,
} from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { apiJson } from "@/lib/api-client"

// Map dimensionId → human label using the default rubric
const dimensionLabel = Object.fromEntries(DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.label]))

// Map dimensionId → lucide icon element
const dimensionIcon: Record<string, React.ReactNode> = {
  requirements: <ClipboardList size={18} />,
  scalability: <Layers size={18} />,
  db_design: <Database size={18} />,
  fault_tolerance: <Shield size={18} />,
  api_design: <Code2 size={18} />,
  caching: <Zap size={18} />,
  trade_offs: <GitBranch size={18} />,
  observability: <Activity size={18} />,
}

// ── Design system color tokens ─────────────────────────────────────────────
const DS = {
  pageBg: "var(--app-bg)",
  cardBg: "var(--app-surface-2)",
  cardBorder: "1px solid var(--app-border)",
  elevatedBg: "var(--app-surface)",
  codeBg: "var(--app-bg-deep)",
  textPrimary: "var(--app-fg)",
  textSecondary: "var(--app-subtle)",
  textMuted: "var(--app-muted)",
  textBody: "var(--app-body)",
  indigo: "var(--app-indigo)",
  indigoPale: "var(--app-indigo-pale)",
  green: "var(--app-green)",
  red: "var(--app-red)",
  amber: "var(--app-amber)",
  surfaceHigh: "var(--app-surface-4)",
  surfaceVariant: "var(--app-border)",
} as const

/** Returns the accent colour for a given 0-100 score */
function scoreColor(score: number): string {
  if (score >= 75) return DS.green
  if (score >= 50) return DS.indigoPale
  return DS.red
}

interface EvalResult {
  id: string
  overallScore: number
  componentScores: ComponentScore[]
  feedback: string
  improvements: string[]
  agentSatisfied: boolean
}

interface SubmissionRow {
  id: string
  questionId: string
  lexicalState: Record<string, unknown>
  excalidrawData: unknown | null
  status: string
  createdAt: string
  result: EvalResult | null
}

export const Route = createFileRoute("/questions/$questionId_/result/$submissionId")({
  component: ResultPage,
})

function ResultPage() {
  const { questionId, submissionId } = Route.useParams() as {
    questionId: string
    submissionId: string
  }
  const [activeTab, setActiveTab] = useState<"feedback" | "answer" | "conversation">("feedback")
  const [includeEvaluation, setIncludeEvaluation] = useState(false)
  const [shareMessage, setShareMessage] = useState("")
  const [sharedPostId, setSharedPostId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [showReferenceSolution, setShowReferenceSolution] = useState(false)

  const { data: session } = useQuery<{ user?: { id: string } } | null>({
    queryKey: ["session"],
    queryFn: () =>
      apiJson<{ user?: { id: string } } | null>("/api/auth/get-session").catch(() => null),
  })

  const { data: submission, isLoading } = useQuery<SubmissionRow>({
    queryKey: ["submission", submissionId],
    queryFn: () => apiJson<SubmissionRow>(`/api/submissions/${submissionId}`),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      if (s === "DONE" || s === "FAILED") return false
      return 2000
    },
  })

  const { data: referenceSolution, isLoading: isLoadingReference } = useQuery<string>({
    queryKey: ["reference-solution", questionId, submissionId],
    enabled: showReferenceSolution && submission?.status === "DONE",
    queryFn: async () => {
      const payload = await apiJson<{ referenceSolution?: string }>(
        `/api/questions/${questionId}/reference?submissionId=${encodeURIComponent(submissionId)}`,
      )
      if (!payload.referenceSolution) throw new Error("Reference solution is unavailable")
      return payload.referenceSolution
    },
  })

  const result = submission?.result ?? null
  const overallScore = result?.overallScore ?? null
  const componentScores: ComponentScore[] = Array.isArray(result?.componentScores)
    ? (result?.componentScores as ComponentScore[])
    : []
  const isEvaluating = !result && submission?.status !== "FAILED"

  const answerText = extractLexicalText(submission?.lexicalState ?? {})

  async function shareSubmission() {
    setSharing(true)
    setShareMessage("")
    try {
      const data = await apiJson<{ id?: string }>("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, includeEvaluation }),
      })
      setSharedPostId(data.id ?? null)
      setShareMessage("Published to the community.")
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Could not share this answer")
    } finally {
      setSharing(false)
    }
  }

  const statusLabel =
    overallScore == null
      ? "Evaluating…"
      : overallScore >= 75
        ? "Excellent"
        : overallScore >= 50
          ? "Good"
          : "Needs Work"

  const statusColor = overallScore == null ? DS.amber : scoreColor(overallScore)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans" style={{ color: DS.textPrimary }}>
      {/* ── Back link + retry row ── */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/questions/$questionId"
          params={{ questionId }}
          style={{ color: DS.textSecondary }}
          className="flex items-center gap-1.5 text-xs hover:text-base-content/90 transition-colors"
        >
          ← Back to question
        </Link>
        <Link
          to="/questions/$questionId"
          params={{ questionId }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
          style={{
            background: "rgba(128,131,255,0.12)",
            border: "1px solid rgba(128,131,255,0.25)",
            color: "var(--app-indigo-pale)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "var(--app-indigo-20)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "rgba(128,131,255,0.12)"
          }}
        >
          <RefreshCw size={13} />
          Improve Your Design
        </Link>
      </div>

      {/* ── Scorecard header ── */}
      <header
        className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between pb-8 mb-8"
        style={{ borderBottom: `1px solid ${DS.surfaceVariant}` }}
      >
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight mb-1"
            style={{ color: DS.textPrimary }}
          >
            Evaluation Results
          </h1>
          <p className="text-sm" style={{ color: DS.textSecondary }}>
            Review your pillar scores, AI feedback, and improvement opportunities.
          </p>
        </div>

        <div
          className="flex items-center gap-6 p-6 rounded-lg shrink-0"
          style={{ background: DS.cardBg, border: DS.cardBorder }}
        >
          {/* Score ring or spinner */}
          {overallScore != null ? (
            <ScoreRing score={Math.round(overallScore)} size={88} label="Overall" />
          ) : (
            <div
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full"
              style={{ border: `2px solid ${DS.surfaceVariant}` }}
            >
              {isLoading || isEvaluating ? (
                <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block" />
              ) : (
                <span className="text-xs" style={{ color: DS.textMuted }}>
                  N/A
                </span>
              )}
            </div>
          )}

          <div className="h-14 w-px" style={{ background: DS.surfaceVariant }} />

          <div className="flex flex-col gap-3">
            {/* Numeric score */}
            <div className="flex flex-col">
              <span
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: DS.textSecondary }}
              >
                Overall Score
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-4xl font-extrabold leading-none"
                  style={{ color: overallScore != null ? scoreColor(overallScore) : DS.textMuted }}
                >
                  {overallScore != null ? Math.round(overallScore) : "—"}
                </span>
                <span className="text-lg font-semibold" style={{ color: DS.textMuted }}>
                  /100
                </span>
              </div>
            </div>
            {/* Status */}
            <div className="flex flex-col">
              <span
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: DS.textSecondary }}
              >
                Status
              </span>
              <span
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: statusColor }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse inline-block"
                  style={{
                    background: statusColor,
                    boxShadow: `0 0 8px ${statusColor}99`,
                  }}
                />
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {submission?.status === "DONE" && (
        <section
          className="mb-8 flex flex-wrap items-center gap-3 rounded-xl p-4"
          style={{ background: DS.cardBg, border: DS.cardBorder }}
        >
          <div className="mr-auto">
            <p className="text-sm font-semibold" style={{ color: DS.textPrimary }}>
              Share your answer
            </p>
            <p className="mt-1 text-xs" style={{ color: DS.textSecondary }}>
              Your answer and any diagram will be public with your account name.
            </p>
          </div>
          {session?.user ? (
            <>
              <label
                className="flex items-center gap-2 text-xs"
                style={{ color: DS.textSecondary }}
              >
                <input
                  type="checkbox"
                  checked={includeEvaluation}
                  onChange={(e) => setIncludeEvaluation(e.target.checked)}
                />{" "}
                Include AI feedback and score
              </label>
              <button
                type="button"
                disabled={sharing}
                onClick={() => void shareSubmission()}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: DS.indigo }}
              >
                <Share2 size={14} />
                {sharing ? "Publishing…" : "Publish"}
              </button>
            </>
          ) : (
            <p className="w-full text-xs" style={{ color: DS.textSecondary }}>
              Sign in to publish answers. Guest answers are linked to your account when you create
              one in this browser.{" "}
              <Link to="/auth/login" className="underline">
                Sign in before your next submission
              </Link>
              .
            </p>
          )}
          {shareMessage && (
            <output className="w-full text-xs" style={{ color: DS.textSecondary }}>
              {shareMessage}
              {sharedPostId && (
                <>
                  {" "}
                  <Link
                    to="/community/$threadId"
                    params={{ threadId: sharedPostId }}
                    className="underline"
                  >
                    View post
                  </Link>
                </>
              )}
            </output>
          )}
        </section>
      )}

      {/* ── Pillar Breakdown grid ── */}
      {(componentScores.length > 0 || isLoading || isEvaluating) && (
        <section className="mb-10">
          <h2
            className="text-base font-bold mb-4 flex items-center gap-2"
            style={{ color: DS.textPrimary }}
          >
            <BarChart3 size={16} style={{ color: DS.indigoPale }} />
            Pillar Breakdown
          </h2>

          {isLoading || (isEvaluating && componentScores.length === 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["pillar-1", "pillar-2", "pillar-3", "pillar-4"].map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="animate-pulse rounded-lg h-44"
                  style={{ background: DS.elevatedBg, border: DS.cardBorder }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {componentScores.map((cs) => {
                const pct = Math.round(cs.score)
                const color = scoreColor(pct)
                const icon = dimensionIcon[cs.dimensionId] ?? <BarChart3 size={18} />
                const label = dimensionLabel[cs.dimensionId] ?? cs.dimensionId
                return (
                  <div
                    key={cs.dimensionId}
                    className="flex flex-col gap-4 p-5 rounded-lg transition-colors"
                    style={{ background: DS.cardBg, border: DS.cardBorder }}
                  >
                    {/* Icon + score row */}
                    <div className="flex justify-between items-start">
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center"
                        style={{
                          background: DS.surfaceHigh,
                          border: `1px solid ${DS.surfaceVariant}`,
                          color: DS.indigoPale,
                        }}
                      >
                        {icon}
                      </div>
                      <span className="text-sm font-bold" style={{ color }}>
                        {pct}/100
                      </span>
                    </div>

                    {/* Label + reasoning */}
                    <div className="flex-1">
                      <h3 className="text-sm font-bold mb-1" style={{ color: DS.textPrimary }}>
                        {label}
                      </h3>
                      {cs.reasoning ? (
                        <p
                          className="text-xs leading-relaxed line-clamp-3"
                          style={{ color: DS.textSecondary }}
                        >
                          {cs.reasoning}
                        </p>
                      ) : null}
                    </div>

                    {/* Progress bar */}
                    <div
                      className="w-full h-1 rounded-full overflow-hidden mt-auto"
                      style={{ background: DS.surfaceHigh }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── AI Insights (feedback + improvements) ── */}
      {result && (result.feedback || result.improvements?.length > 0) && (
        <section className="mb-10">
          <h2
            className="text-base font-bold mb-4 flex items-center gap-2"
            style={{ color: DS.textPrimary }}
          >
            <Activity size={16} style={{ color: DS.indigoPale }} />
            AI Insights
          </h2>
          <div
            className="rounded-lg overflow-hidden flex flex-col lg:flex-row"
            style={{ background: DS.cardBg, border: DS.cardBorder }}
          >
            {/* 1/3 — Summary */}
            {result.feedback && (
              <div
                className="p-6 lg:w-1/3 flex flex-col gap-3"
                style={{ borderRight: `1px solid ${DS.surfaceVariant}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: DS.indigoPale }}
                  />
                  <span className="text-sm font-bold" style={{ color: DS.textPrimary }}>
                    Summary
                  </span>
                </div>
                <div
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: DS.textBody, lineHeight: "1.6" }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.feedback}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* 2/3 — Improvements list */}
            {result.improvements?.length > 0 && (
              <div
                className="lg:flex-1 p-6 relative overflow-x-auto"
                style={{ background: DS.codeBg }}
              >
                <div
                  className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl"
                  style={{
                    background: `${DS.surfaceVariant}80`,
                    borderBottom: `1px solid ${DS.surfaceVariant}`,
                    borderLeft: `1px solid ${DS.surfaceVariant}`,
                    color: DS.textSecondary,
                  }}
                >
                  Key Improvements
                </div>
                <ul className="mt-6 space-y-3">
                  {result.improvements.map((item) => (
                    <li key={item} className="flex gap-3 text-sm" style={{ color: DS.textBody }}>
                      <span className="shrink-0 font-bold" style={{ color: DS.indigo }}>
                        →
                      </span>
                      <span style={{ lineHeight: "1.5" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: `1px solid ${DS.surfaceVariant}` }}>
        <TabBtn
          active={activeTab === "feedback"}
          onClick={() => setActiveTab("feedback")}
          icon={<BarChart3 size={13} />}
          label="Feedback"
        />
        <TabBtn
          active={activeTab === "answer"}
          onClick={() => setActiveTab("answer")}
          icon={<FileText size={13} />}
          label="Your Answer"
        />
        <TabBtn
          active={activeTab === "conversation"}
          onClick={() => setActiveTab("conversation")}
          icon={<MessageCircle size={13} />}
          label="Conversation"
        />
      </div>

      {/* ── Feedback tab ── */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          {isLoading || (isEvaluating && !result) ? (
            <div className="space-y-3">
              {["feedback-1", "feedback-2", "feedback-3"].map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="animate-pulse rounded-lg h-24"
                  style={{ background: DS.elevatedBg }}
                />
              ))}
            </div>
          ) : result ? (
            <>
              {/* Per-dimension breakdowns */}
              {componentScores.length > 0 && (
                <section>
                  <h3
                    className="mb-3 text-xs font-bold uppercase tracking-widest"
                    style={{ color: DS.textSecondary }}
                  >
                    Improvements by dimension
                  </h3>
                  <div className="space-y-2">
                    {componentScores.map((cs) => {
                      const pct = Math.round(cs.score)
                      const color = scoreColor(pct)
                      return (
                        <details
                          key={cs.dimensionId}
                          className="group rounded-lg"
                          style={{ background: DS.cardBg, border: DS.cardBorder }}
                        >
                          <summary
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium cursor-pointer select-none list-none"
                            style={{ color: DS.textPrimary }}
                          >
                            {/* Chevron */}
                            <svg
                              aria-hidden="true"
                              className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-90"
                              style={{ color: DS.textSecondary }}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>

                            {/* Score badge */}
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0"
                              style={{
                                color,
                                background: `${color}18`,
                                border: `1px solid ${color}40`,
                              }}
                            >
                              {pct}
                            </span>

                            {dimensionLabel[cs.dimensionId] ?? cs.dimensionId}
                          </summary>

                          <div
                            className="px-4 pb-4 pt-2 space-y-3"
                            style={{ borderTop: `1px solid ${DS.surfaceVariant}` }}
                          >
                            {cs.reasoning && (
                              <p
                                className="text-xs leading-relaxed"
                                style={{ color: DS.textSecondary }}
                              >
                                {cs.reasoning}
                              </p>
                            )}
                            {cs.improvements?.length > 0 && (
                              <ul className="space-y-1.5">
                                {cs.improvements.map((s) => (
                                  <li
                                    key={`${cs.dimensionId}:${s}`}
                                    className="flex gap-2 text-xs"
                                    style={{ color: DS.textBody }}
                                  >
                                    <span className="shrink-0" style={{ color: DS.indigo }}>
                                      →
                                    </span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div
              className="rounded-lg py-14 text-center text-sm"
              style={{
                border: `1px dashed ${DS.surfaceVariant}`,
                color: DS.textMuted,
              }}
            >
              {submission?.status === "FAILED" ? "Evaluation failed." : "No evaluation data yet."}
            </div>
          )}
        </div>
      )}

      {activeTab === "feedback" && result && submission?.status === "DONE" && (
        <section
          className="mt-8 rounded-lg p-5"
          style={{ background: DS.cardBg, border: DS.cardBorder }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Reference solution</h2>
              <p className="mt-1 text-xs" style={{ color: DS.textSecondary }}>
                One sound approach to compare with your design; other designs can also be valid.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ color: DS.indigoPale, background: DS.elevatedBg, border: DS.cardBorder }}
              onClick={() => setShowReferenceSolution((shown) => !shown)}
            >
              {showReferenceSolution ? "Hide reference" : "Compare designs"}
            </button>
          </div>
          {showReferenceSolution && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: DS.surfaceVariant }}>
              {isLoadingReference ? (
                <p className="text-sm" style={{ color: DS.textMuted }}>
                  Loading reference…
                </p>
              ) : referenceSolution ? (
                <div className="prose prose-invert max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{referenceSolution}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm" style={{ color: DS.textMuted }}>
                  Reference solution could not be loaded. Try again in a moment.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Your Answer tab ── */}
      {activeTab === "answer" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="animate-pulse rounded-lg h-40" style={{ background: DS.elevatedBg }} />
          ) : answerText ? (
            <div
              className="rounded-lg p-5"
              style={{ background: DS.cardBg, border: DS.cardBorder }}
            >
              <div className="text-sm max-w-none" style={{ color: DS.textBody, lineHeight: "1.6" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerText}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg py-14 text-center text-sm"
              style={{
                border: `1px dashed ${DS.surfaceVariant}`,
                color: DS.textMuted,
              }}
            >
              Answer text not available.
            </div>
          )}
        </div>
      )}

      {/* ── Conversation tab ── */}
      {activeTab === "conversation" && (
        <div
          className="rounded-lg py-14 text-center"
          style={{ border: `1px dashed ${DS.surfaceVariant}` }}
        >
          <MessageCircle size={24} className="mx-auto mb-2" style={{ color: DS.textMuted }} />
          <p className="text-sm" style={{ color: DS.textMuted }}>
            Conversation history will appear here.
          </p>
        </div>
      )}

      {/* ── Bottom actions ── */}
      <div
        className="mt-8 flex items-center justify-between pt-6"
        style={{ borderTop: `1px solid ${DS.surfaceVariant}` }}
      >
        <Link
          to="/questions/$questionId"
          params={{ questionId }}
          className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 transition-colors hover:text-base-content/90"
          style={{
            color: DS.textSecondary,
            background: DS.elevatedBg,
            border: `1px solid ${DS.surfaceVariant}`,
          }}
        >
          <RefreshCw size={13} />
          Try again
        </Link>
        <Link
          to="/questions"
          className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
          style={{
            background: DS.indigo,
            color: "#ffffff",
          }}
        >
          Next question <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
      style={{
        color: active ? DS.indigoPale : DS.textSecondary,
        borderBottom: active ? `2px solid ${DS.indigo}` : "2px solid transparent",
        marginBottom: "-1px",
        background: "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  )
}
