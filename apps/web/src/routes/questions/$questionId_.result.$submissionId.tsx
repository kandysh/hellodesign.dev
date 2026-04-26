import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ScoreRing } from "@sysdesign/ui"
import { DEFAULT_RUBRIC, extractLexicalText } from "@sysdesign/shared"
import type { ComponentScore } from "@sysdesign/shared"
import { ArrowRight, RefreshCw, MessageCircle, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

// Map dimensionId → human label using the default rubric
const dimensionLabel = Object.fromEntries(
  DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.label]),
)

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

  const answerText = extractLexicalText(submission?.lexicalState ?? {})

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <Link
          to="/questions/$questionId"
          params={{ questionId }}
          className="mb-4 flex items-center gap-1.5 text-xs text-base-content/40 hover:text-base-content/70 transition-default"
        >
          ← Back to question
        </Link>

        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Score ring */}
          {overallScore != null ? (
            <ScoreRing score={Math.round(overallScore)} size={100} label="Overall" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-base-300/40">
              {isLoading || isEvaluating ? (
                <div className="loading loading-spinner loading-md text-primary" />
              ) : (
                <span className="text-base-content/30 text-xs">N/A</span>
              )}
            </div>
          )}

          {/* Dimension score pills */}
          {componentScores.length > 0 && (
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
                Dimension scores
              </p>
              <div className="flex flex-wrap gap-2">
                {componentScores.map((cs) => (
                  <ScorePill key={cs.dimensionId} score={cs} />
                ))}
              </div>
            </div>
          )}

          {(isLoading || isEvaluating) && componentScores.length === 0 && (
            <div className="flex-1 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-6 w-24 rounded-full" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" className="tabs tabs-bordered mb-6">
        <TabBtn active={activeTab === "feedback"} onClick={() => setActiveTab("feedback")} icon={<BarChart3 size={13} />} label="Feedback" />
        <TabBtn active={activeTab === "answer"} onClick={() => setActiveTab("answer")} icon={<FileText size={13} />} label="Your Answer" />
        <TabBtn active={activeTab === "conversation"} onClick={() => setActiveTab("conversation")} icon={<MessageCircle size={13} />} label="Conversation" />
      </div>

      {/* ── Feedback tab ── */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          {isLoading || (isEvaluating && !result) ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : result ? (
            <>
              {/* Overall feedback */}
              {result.feedback && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-base-content/70">Summary</h3>
                  <div className="rounded-xl border border-base-300/40 bg-base-200/50 p-5">
                    <div className="prose prose-sm prose-invert max-w-none text-base-content/80">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.feedback}</ReactMarkdown>
                    </div>
                  </div>
                </section>
              )}

              {/* Top improvements */}
              {result.improvements?.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-base-content/70">
                    Key improvements
                  </h3>
                  <div className="rounded-xl border border-base-300/40 bg-base-200/50 p-5">
                    <ul className="space-y-2">
                      {result.improvements.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-base-content/70">
                          <span className="text-warning shrink-0">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Per-dimension breakdowns */}
              {componentScores.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-base-content/70">
                    Improvements by dimension
                  </h3>
                  <div className="space-y-2">
                    {componentScores.map((cs) => (
                      <details
                        key={cs.dimensionId}
                        className="collapse collapse-arrow rounded-xl border border-base-300/40 bg-base-200/50"
                      >
                        <summary className="collapse-title text-sm font-medium flex items-center gap-2">
                          <ScorePill score={cs} />
                          {dimensionLabel[cs.dimensionId] ?? cs.dimensionId}
                        </summary>
                        <div className="collapse-content pt-2 space-y-3">
                          {cs.reasoning && (
                            <p className="text-xs text-base-content/60">{cs.reasoning}</p>
                          )}
                          {cs.improvements?.length > 0 && (
                            <ul className="space-y-1">
                              {cs.improvements.map((s, i) => (
                                <li key={i} className="text-xs text-base-content/60">
                                  → {s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-base-300/40 py-12 text-center text-base-content/30">
              {submission?.status === "FAILED" ? "Evaluation failed." : "No evaluation data yet."}
            </div>
          )}
        </div>
      )}

      {/* ── Your Answer tab ── */}
      {activeTab === "answer" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="skeleton h-40 w-full rounded-xl" />
          ) : answerText ? (
            <div className="rounded-xl border border-base-300/40 bg-base-200/50 p-5">
              <div className="prose prose-sm prose-invert max-w-none text-base-content/80">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerText}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-base-300/40 py-12 text-center text-base-content/30 text-sm">
              Answer text not available.
            </div>
          )}
        </div>
      )}

      {/* ── Conversation tab ── */}
      {activeTab === "conversation" && (
        <div className="rounded-xl border border-dashed border-base-300/40 py-12 text-center text-base-content/30">
          <MessageCircle size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Conversation history will appear here.</p>
        </div>
      )}

      {/* ── Bottom actions ── */}
      <div className="mt-8 flex items-center justify-between border-t border-base-300/40 pt-6">
        <Link
          to="/questions/$questionId"
          params={{ questionId }}
          className="btn btn-ghost btn-sm rounded-lg gap-1.5 text-base-content/60"
        >
          <RefreshCw size={13} />
          Try again
        </Link>
        <Link to="/questions" className="btn btn-primary btn-sm rounded-lg gap-1.5">
          Next question <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function ScorePill({ score: cs }: { score: ComponentScore }) {
  const pct = Math.round(cs.score)
  const color =
    pct >= 75 ? "text-success border-success/30 bg-success/10" :
    pct >= 50 ? "text-warning border-warning/30 bg-warning/10" :
                "text-error border-error/30 bg-error/10"
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", color)}>
      {dimensionLabel[cs.dimensionId] ?? cs.dimensionId} {pct}
    </span>
  )
}

function TabBtn({
  active, onClick, icon, label,
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
      className={cn("tab gap-1.5", active ? "tab-active" : "text-base-content/50")}
    >
      {icon}
      {label}
    </button>
  )
}

