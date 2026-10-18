export type Difficulty = "easy" | "medium" | "hard"
export type Category =
  | "distributed-systems"
  | "databases"
  | "caching"
  | "messaging"
  | "api-design"
  | "storage"
  | "networking"
  | "general"

/** Returned by GET /api/questions (list endpoint) */
export interface QuestionSummary {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  category: Category
  estimatedMins: number
  createdAt: Date
}

/** Returned by GET /api/questions/:id (detail endpoint) */
export interface QuestionDetail {
  id: string
  title: string
  prompt: string
  difficulty: Difficulty
  category: Category
  estimatedMins: number
  hints: string[]
  coverageChecklist: string[]
  rubric: unknown
  createdAt: Date
}

/** @deprecated use QuestionSummary or QuestionDetail */
export type Question = QuestionDetail

export interface Submission {
  id: string
  userId: string
  questionId: string
  answerText: string
  excalidrawJson: Record<string, unknown> | null
  status: "pending" | "evaluating" | "done" | "failed"
  createdAt: Date
  updatedAt: Date
}

export type AgentName =
  | "RequirementsAgent"
  | "CapacityEstimationAgent"
  | "HighLevelDesignAgent"
  | "DataModelAgent"
  | "APIDesignAgent"
  | "ScalabilityAgent"
  | "DiagramConsistencyAgent"
  | "OrchestratorAgent"

export interface AgentResult {
  agentName: AgentName
  score: number // 0-10
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

export interface OrchestratorResult {
  overallScore: number // 0-10
  topStrengths: string[]
  criticalGaps: string[]
  prioritizedSuggestions: string[]
}

export interface Evaluation {
  id: string
  submissionId: string
  agents: AgentResult[]
  orchestrator: OrchestratorResult | null
  status: "pending" | "running" | "done" | "failed"
  createdAt: Date
  updatedAt: Date
}

// BullMQ job payload
export interface EvalJobData {
  submissionId: string
  questionId: string
  userId: string
}

// SSE event types streamed from API to browser
export type SSEEvent =
  | { type: "agent:result"; data: AgentResult }
  | { type: "evaluation:complete"; data: { evaluationId: string; orchestrator: OrchestratorResult } }
  | { type: "evaluation:error"; data: { message: string } }
