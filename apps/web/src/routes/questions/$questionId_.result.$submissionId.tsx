import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ScoreRing } from "@sysdesign/ui"
import { DEFAULT_RUBRIC, extractLexicalText } from "@sysdesign/shared"
import type { ComponentScore } from "@sysdesign/shared"
import {
  ArrowRight,
  RefreshCw,
  MessageCircle,
  FileText,
  BarChart3,
  Layers,
  Database,
  Shield,
  Code2,
  ClipboardList,
  Zap,
  GitBranch,
  Activity,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { generateMockSubmissionStats } from "@/lib/mockSubmissionStats"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

// Map dimensionId → human label using the default rubric
const dimensionLabel = Object.fromEntries(
  DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.label]),
)

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
  pageBg: "#0b1326",
  cardBg: "#171f33",
  cardBorder: "1px solid #2d3449",
  elevatedBg: "#131b2e",
  codeBg: "#060e20",
  textPrimary: "#dae2fd",
  textSecondary: "#908fa0",
  textMuted: "#464554",
  textBody: "#c7c4d7",
  indigo: "#8083ff",
  indigoPale: "#c0c1ff",
  green: "#4edea3",
  red: "#ffb4ab",
  amber: "#fbbf24",
  surfaceHigh: "#222a3d",
  surfaceVariant: "#2d3449",
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

  const { data: submission, isLoading } = useQuery<SubmissionRow>({
    queryKey: ["submission", submissionId],
    queryFn: () =>
      fetch(`${API}/api/submissions/${submissionId}`, { credentials: "include" }).then((r) =>
        r.json(),
      ),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      if (s === "DONE" || s === "FAILED") return false
      return 2000
    },
  })

  const result = submission?.result ?? null
  const overallScore = result?.overallScore ?? null
  const componentScores: ComponentScore[] = Array.isArray(result?.componentScores)
    ? (result!.componentScores as ComponentScore[])
    : []
  const isEvaluating = !result && submission?.status !== "FAILED"

  // Generate mock stats (replace with real API when backend is ready)
  const mockStats = overallScore != null ? generateMockSubmissionStats(overallScore, questionId) : null

  const answerText = extractLexicalText(submission?.lexicalState ?? {})

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
    <div
      className="mx-auto max-w-5xl px-4 py-8 font-[Manrope,sans-serif]"
      style={{ color: DS.textPrimary }}
    >
      {/* ── Back link ── */}
      <Link
        to="/questions/$questionId"
        params={{ questionId }}
        style={{ color: DS.textSecondary }}
        className="flex items-center gap-1.5 text-xs mb-6 hover:text-slate-200 transition-colors"
      >
        ← Back to question
      </Link>

      {/* ── Scorecard header ── */}
      <header
        className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between pb-8 mb-8"
        style={{ borderBottom: `1px solid ${DS.surfaceVariant}` }}
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: DS.textPrimary }}>
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
                <span className="text-xs" style={{ color: DS.textMuted }}>N/A</span>
              )}
            </div>
          )}

          <div
            className="h-14 w-px"
            style={{ background: DS.surfaceVariant }}
          />

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
                <span className="text-lg font-semibold" style={{ color: DS.textMuted }}>/100</span>
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
              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: statusColor }}>
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
            {/* Percentile (new) */}
            {mockStats && (
              <div className="flex flex-col">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: DS.textSecondary }}
                >
                  Percentile
                </span>
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: DS.indigoPale }}>
                  <TrendingUp size={14} />
                  Top {Math.round(100 - mockStats.percentileRank)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

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
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
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
                  {result.improvements.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm" style={{ color: DS.textBody }}>
                      <span className="shrink-0 font-bold" style={{ color: DS.indigo }}>→</span>
                      <span style={{ lineHeight: "1.5" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Weak Areas Section (new) ── */}
      {mockStats && mockStats.weakAreas.length > 0 && (
        <section
          className="mb-8 p-6 rounded-xl border"
          style={{ background: DS.cardBg, border: DS.cardBorder }}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={18} style={{ color: DS.amber, flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: DS.textPrimary }}>
                Areas for Improvement
              </h2>
              <p className="text-sm mt-1" style={{ color: DS.textSecondary }}>
                Focus on these weak areas to strengthen your design skills
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {mockStats.weakAreas.map((area) => (
              <div
                key={area.dimensionId}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  background: `rgba(251, 191, 36, 0.08)`,
                  border: `1px solid rgba(251, 191, 36, 0.2)`,
                }}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: DS.textPrimary }}>
                    {area.label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: DS.textSecondary }}>
                    {area.suggestion}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className="text-sm font-bold"
                    style={{ color: area.score >= 50 ? DS.green : DS.red }}
                  >
                    {Math.round(area.score)}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 mb-6"
        style={{ borderBottom: `1px solid ${DS.surfaceVariant}` }}
      >
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
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
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
                              <p className="text-xs leading-relaxed" style={{ color: DS.textSecondary }}>
                                {cs.reasoning}
                              </p>
                            )}
                            {cs.improvements?.length > 0 && (
                              <ul className="space-y-1.5">
                                {cs.improvements.map((s, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-2 text-xs"
                                    style={{ color: DS.textBody }}
                                  >
                                    <span className="shrink-0" style={{ color: DS.indigo }}>→</span>
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

      {/* ── Your Answer tab ── */}
      {activeTab === "answer" && (
        <div className="space-y-4">
          {isLoading ? (
            <div
              className="animate-pulse rounded-lg h-40"
              style={{ background: DS.elevatedBg }}
            />
          ) : answerText ? (
            <div
              className="rounded-lg p-5"
              style={{ background: DS.cardBg, border: DS.cardBorder }}
            >
              <div
                className="text-sm max-w-none"
                style={{ color: DS.textBody, lineHeight: "1.6" }}
              >
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
          <MessageCircle
            size={24}
            className="mx-auto mb-2"
            style={{ color: DS.textMuted }}
          />
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
          className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 transition-colors hover:text-slate-200"
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

