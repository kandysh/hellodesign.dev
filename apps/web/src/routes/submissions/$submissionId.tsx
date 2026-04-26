import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { AgentFeedbackPanel, ScoreRing } from "@sysdesign/ui"
import type { AgentResult, OrchestratorResult } from "@sysdesign/types"
import { Card } from "@/components/ui/card"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const Route = createFileRoute("/submissions/$submissionId")({
  component: SubmissionResultPage,
})

function SubmissionResultPage() {
  const { submissionId } = Route.useParams()
  const [agentResults, setAgentResults] = useState<AgentResult[]>([])
  const [orchestrator, setOrchestrator] = useState<OrchestratorResult | null>(null)
  const [streamStatus, setStreamStatus] = useState<"connecting" | "streaming" | "done" | "error">(
    "connecting",
  )

  useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () =>
      fetch(`${API}/api/submissions/${submissionId}`, { credentials: "include" }).then((r) =>
        r.json(),
      ),
    refetchInterval: streamStatus === "done" ? false : undefined,
  })

  // Open SSE stream
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamStatus intentionally excluded — re-creating the EventSource on status change would cause infinite loops
  useEffect(() => {
    const es = new EventSource(`${API}/api/submissions/${submissionId}/stream`, {
      withCredentials: true,
    } as EventSourceInit)

    setStreamStatus("streaming")

    es.addEventListener("agent:result", (e) => {
      const result: AgentResult = JSON.parse(e.data)
      setAgentResults((prev) => [...prev, result])
    })

    es.addEventListener("evaluation:complete", (e) => {
      const { orchestrator: orch }: { evaluationId: string; orchestrator: OrchestratorResult } =
        JSON.parse(e.data)
      setOrchestrator(orch)
      setStreamStatus("done")
      es.close()
    })

    es.addEventListener("evaluation:error", () => {
      setStreamStatus("error")
      es.close()
    })

    es.onerror = () => {
      if (streamStatus !== "done") setStreamStatus("error")
      es.close()
    }

    return () => es.close()
  }, [submissionId])

  const isEvaluating = streamStatus === "connecting" || streamStatus === "streaming"

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Evaluation Results</h1>
        <p className="text-sm text-base-content/60">
          {isEvaluating ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
              AI agents are evaluating your answer...
            </span>
          ) : streamStatus === "error" ? (
            "Evaluation failed. Please try again."
          ) : (
            "Evaluation complete."
          )}
        </p>
      </div>

      {/* Overall score — shown after orchestrator completes */}
      {orchestrator && (
        <Card className="p-6 mb-6 flex items-center gap-6">
          <ScoreRing score={orchestrator.overallScore} size={96} label="Overall" />
          <div className="flex-1">
            <h2 className="font-bold text-lg mb-3">Summary</h2>
            {orchestrator.topStrengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-success mb-1">Top Strengths</p>
                <ul className="text-sm text-base-content/60 space-y-0.5">
                  {orchestrator.topStrengths.map((s, i) => {
                    // biome-ignore lint/suspicious/noArrayIndexKey: static server response, no stable keys
                    return <li key={i}>✓ {s}</li>
                  })}
                </ul>
              </div>
            )}
            {orchestrator.criticalGaps.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-error mb-1">Critical Gaps</p>
                <ul className="text-sm text-base-content/60 space-y-0.5">
                  {orchestrator.criticalGaps.map((g, i) => {
                    // biome-ignore lint/suspicious/noArrayIndexKey: static server response, no stable keys
                    return <li key={i}>✗ {g}</li>
                  })}
                </ul>
              </div>
            )}
            {orchestrator.prioritizedSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-info mb-1">
                  Top Suggestions (by impact)
                </p>
                <ul className="text-sm text-base-content/60 space-y-0.5">
                  {orchestrator.prioritizedSuggestions.map((s, i) => {
                    // biome-ignore lint/suspicious/noArrayIndexKey: static server response, no stable keys
                    return (
                      <li key={i}>
                        {i + 1}. {s}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Agent feedback panels */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-base-content/50 uppercase tracking-wide">
          Dimension Breakdown
        </h2>
        {agentResults.map((result, i) => (
          <AgentFeedbackPanel key={result.agentName} result={result} isNew={i === agentResults.length - 1} />
        ))}

        {isEvaluating && agentResults.length === 0 && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => {
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              return <div key={i} className="h-32 rounded-lg border border-base-300 bg-base-200 animate-pulse" />
            })}
          </div>
        )}
      </div>
    </div>
  )
}
