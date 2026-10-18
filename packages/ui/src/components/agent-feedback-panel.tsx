import type { AgentResult } from "@sysdesign/types"
import { cn } from "../lib/utils.js"
import { ScoreRing } from "./score-ring.js"

const agentLabels: Record<string, string> = {
  RequirementsAgent: "Requirements",
  CapacityEstimationAgent: "Capacity Estimation",
  HighLevelDesignAgent: "High-Level Design",
  DataModelAgent: "Data Model",
  APIDesignAgent: "API Design",
  ScalabilityAgent: "Scalability",
  DiagramConsistencyAgent: "Diagram Consistency",
  OrchestratorAgent: "Overall",
}

interface AgentFeedbackPanelProps {
  result: AgentResult
  isNew?: boolean
}

export function AgentFeedbackPanel({ result, isNew = false }: AgentFeedbackPanelProps) {
  const label = agentLabels[result.agentName] ?? result.agentName

  return (
    <div
      className={cn(
        "card bg-base-100 border border-base-300 p-4 shadow-sm transition-all",
        isNew && "animate-in slide-in-from-bottom-4 duration-500",
      )}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={result.score} size={64} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{label}</h3>
          {result.strengths.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-success mb-1">✓ Strengths</p>
              <ul className="text-xs text-base-content/60 space-y-0.5">
                {result.strengths.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.weaknesses.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-error mb-1">✗ Gaps</p>
              <ul className="text-xs text-base-content/60 space-y-0.5">
                {result.weaknesses.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-info mb-1">→ Suggestions</p>
              <ul className="text-xs text-base-content/60 space-y-0.5">
                {result.suggestions.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
