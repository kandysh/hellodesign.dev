import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ScoreRing } from "@sysdesign/ui"
import type { AgentResult, OrchestratorResult } from "@sysdesign/types"
import { ArrowRight, RefreshCw, MessageCircle, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

const agentLabels: Record<string, string> = {
  RequirementsAgent:        "Requirements",
  CapacityEstimationAgent:  "Capacity",
  HighLevelDesignAgent:     "Architecture",
  DataModelAgent:           "Data Model",
  APIDesignAgent:           "API Design",
  ScalabilityAgent:         "Scalability",
  DiagramConsistencyAgent:  "Diagrams",
  OrchestratorAgent:        "Overall",
}

interface SubmissionData {
  id: string
  questionId: string
  answerText: string
  excalidrawJson: Record<string, unknown> | null
  status: string
  createdAt: string
}

interface EvaluationData {
  id: string
  overallScore: number | null
  orchestratorResult: OrchestratorResult | null
  status: string
  agents: AgentResult[]
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

  const { data: submission } = useQuery<SubmissionData>({
    queryKey: ["submission", submissionId],
    queryFn: () =>
      fetch(`${API}/api/submissions/${submissionId}`, { credentials: "include" }).then((r) =>
        r.json(),
      ),
  })

  const { data: evaluation } = useQuery<EvaluationData>({
    queryKey: ["evaluation", submissionId],
    queryFn: () =>
      fetch(`${API}/api/submissions/${submissionId}/evaluation`, {
        credentials: "include",
      }).then((r) => r.json()),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === "done" || data?.status === "failed") return false
      return 2000
    },
  })

  const orchestrator = evaluation?.orchestratorResult ?? null
  const overallScore = evaluation?.overallScore != null
    ? evaluation.overallScore * 10   // convert 0-10 to 0-100
    : null
  const agentResults = evaluation?.agents ?? []
  const isEvaluating = !evaluation || evaluation.status === "pending" || evaluation.status === "running"

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
            <ScoreRing score={overallScore} size={100} label="Overall" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-base-300/40">
              {isEvaluating ? (
                <div className="loading loading-spinner loading-md text-primary" />
              ) : (
                <span className="text-base-content/30 text-xs">N/A</span>
              )}
            </div>
          )}

          {/* Dimension pills */}
          {agentResults.length > 0 && (
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">
                Dimension scores
              </p>
              <div className="flex flex-wrap gap-2">
                {agentResults.map((r) => (
                  <ScorePill key={r.agentName} agentResult={r} />
                ))}
              </div>
            </div>
          )}

          {isEvaluating && agentResults.length === 0 && (
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
          {isEvaluating && !orchestrator ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : orchestrator ? (
            <>
              {/* Written evaluation */}
              {orchestrator.prioritizedSuggestions && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-base-content/70">
                    Summary
                  </h3>
                  <div className="rounded-xl border border-base-300/40 bg-base-200/50 p-5">
                    <div className="prose prose-sm prose-invert max-w-none">
                      {orchestrator.topStrengths?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-success mb-2 uppercase tracking-wide">
                            ✓ Top Strengths
                          </p>
                          <ul>
                            {orchestrator.topStrengths.map((s, i) => (
                              <li key={i} className="text-base-content/70">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {orchestrator.criticalGaps?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-error mb-2 uppercase tracking-wide">
                            ✗ Critical Gaps
                          </p>
                          <ul>
                            {orchestrator.criticalGaps.map((g, i) => (
                              <li key={i} className="text-base-content/70">{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Per-agent improvements */}
              {agentResults.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-base-content/70">
                    Improvements by Dimension
                  </h3>
                  <div className="space-y-2">
                    {agentResults.map((r) => (
                      <details
                        key={r.agentName}
                        className="collapse collapse-arrow rounded-xl border border-base-300/40 bg-base-200/50"
                      >
                        <summary className="collapse-title text-sm font-medium flex items-center gap-2">
                          <ScorePill agentResult={r} />
                          {agentLabels[r.agentName] ?? r.agentName}
                        </summary>
                        <div className="collapse-content">
                          {r.strengths?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-success mb-1">
                                Strengths
                              </p>
                              <ul className="space-y-1">
                                {r.strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-base-content/60">
                                    • {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.suggestions?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-info mb-1">
                                Suggestions
                              </p>
                              <ul className="space-y-1">
                                {r.suggestions.map((s, i) => (
                                  <li key={i} className="text-xs text-base-content/60">
                                    → {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
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
              Evaluation not available.
            </div>
          )}
        </div>
      )}

      {/* ── Your Answer tab ── */}
      {activeTab === "answer" && (
        <div className="space-y-4">
          {submission?.answerText ? (
            <div className="rounded-xl border border-base-300/40 bg-base-200/50 p-5">
              <div className="prose prose-sm prose-invert max-w-none text-base-content/80">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {submission.answerText}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="skeleton h-40 w-full rounded-xl" />
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
        <Link
          to="/questions"
          className="btn btn-primary btn-sm rounded-lg gap-1.5"
        >
          Next question <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function ScorePill({ agentResult: r }: { agentResult: AgentResult }) {
  const pct = Math.round(r.score * 10)
  const color =
    pct >= 75 ? "text-success border-success/30 bg-success/10" :
    pct >= 50 ? "text-warning border-warning/30 bg-warning/10" :
                "text-error border-error/30 bg-error/10"
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
        color,
      )}
    >
      {agentLabels[r.agentName] ?? r.agentName} {pct}
    </span>
  )
}

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
      className={cn(
        "tab gap-1.5",
        active ? "tab-active" : "text-base-content/50",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
